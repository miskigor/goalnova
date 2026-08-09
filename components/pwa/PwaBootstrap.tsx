"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { EnableNotificationsScreen } from "@/components/pwa/EnableNotificationsScreen";
import { InstallPremiumScreen } from "@/components/pwa/InstallPremiumScreen";
import { InstallPromptModal } from "@/components/pwa/InstallPromptModal";
import { bindBeforeInstallPromptListener, usePwaInstall } from "@/hooks/usePwaInstall";
import {
  PWA_OPEN_INSTALL_EVENT,
  PWA_SHOW_POST_FIRST_VIDEO_EVENT,
  PWA_SHOW_POST_REGISTRATION_EVENT,
} from "@/lib/pwa/events";
import { getNotificationPermission } from "@/lib/pwa/pushNotifications";
import { registerPitchRuschServiceWorker } from "@/lib/pwa/registerServiceWorker";
import {
  clearPostRegistrationPending,
  hasPostFirstVideoPending,
  hasPostRegistrationPending,
  isInstallPromptSnoozed,
  isNotificationPromptDone,
  isNotificationPromptSnoozed,
  markNotificationPromptDone,
  markPostFirstVideoScreenSeen,
  recordAppVisit,
  snoozeInstallPrompt,
  snoozeNotificationPrompt,
} from "@/lib/pwa/storage";

type Overlay =
  | "none"
  | "visit"
  | "postRegistration"
  | "postFirstVideo"
  | "enableNotifications";

function isSettingsPath(pathname: string): boolean {
  return pathname === "/settings" || pathname.startsWith("/settings/");
}

/**
 * Registers the service worker, tracks visits, and orchestrates install / notification prompts.
 */
export function PwaBootstrap() {
  const pathname = usePathname();
  const { installed, promptInstall, ios } = usePwaInstall();
  const [overlay, setOverlay] = useState<Overlay>("none");
  const [iosHint, setIosHint] = useState(false);
  const overlayRef = useRef<Overlay>("none");
  overlayRef.current = overlay;

  // Settings must never stay blocked by a full-screen PWA sheet.
  useEffect(() => {
    if (!isSettingsPath(pathname)) return;
    if (overlayRef.current === "enableNotifications") {
      snoozeNotificationPrompt(7);
    }
    setOverlay("none");
    setIosHint(false);
    try {
      document.body.style.overflow = "";
    } catch {
      /* ignore */
    }
  }, [pathname]);

  useEffect(() => {
    const unbind = bindBeforeInstallPromptListener();
    void registerPitchRuschServiceWorker();

    if (isSettingsPath(pathname)) {
      return unbind;
    }

    // Already installed: offer push notifications on the home-screen app.
    if (installed) {
      const timer = window.setTimeout(() => {
        void (async () => {
          if (isSettingsPath(pathname)) return;
          if (isNotificationPromptDone() || isNotificationPromptSnoozed()) return;
          const permission = await getNotificationPermission();
          if (permission === "granted" || permission === "unsupported" || permission === "denied") {
            if (permission === "granted") markNotificationPromptDone();
            return;
          }
          setOverlay("enableNotifications");
        })();
      }, 1400);
      return () => {
        unbind();
        window.clearTimeout(timer);
      };
    }

    const visits = recordAppVisit();

    if (hasPostRegistrationPending()) {
      setOverlay("postRegistration");
      return unbind;
    }
    if (hasPostFirstVideoPending()) {
      setOverlay("postFirstVideo");
      return unbind;
    }

    const timer = window.setTimeout(() => {
      if (isSettingsPath(pathname)) return;
      if (isInstallPromptSnoozed()) return;
      if (visits >= 2) {
        setOverlay((current) => (current === "none" ? "visit" : current));
      }
    }, 1200);

    return () => {
      unbind();
      window.clearTimeout(timer);
    };
  }, [installed, pathname]);

  useEffect(() => {
    const onOpenInstall = () => {
      if (installed) return;
      if (isSettingsPath(pathname)) return;
      setIosHint(ios);
      setOverlay("visit");
    };
    const onPostReg = () => {
      if (installed) return;
      setOverlay("postRegistration");
    };
    const onPostFirst = () => {
      if (installed) return;
      setOverlay("postFirstVideo");
    };

    window.addEventListener(PWA_OPEN_INSTALL_EVENT, onOpenInstall);
    window.addEventListener(PWA_SHOW_POST_REGISTRATION_EVENT, onPostReg);
    window.addEventListener(PWA_SHOW_POST_FIRST_VIDEO_EVENT, onPostFirst);
    return () => {
      window.removeEventListener(PWA_OPEN_INSTALL_EVENT, onOpenInstall);
      window.removeEventListener(PWA_SHOW_POST_REGISTRATION_EVENT, onPostReg);
      window.removeEventListener(PWA_SHOW_POST_FIRST_VIDEO_EVENT, onPostFirst);
    };
  }, [installed, ios, pathname]);

  const closeOverlay = useCallback(
    (from: Overlay = "none") => {
      const active = from === "none" ? overlay : from;
      if (active === "postRegistration") {
        clearPostRegistrationPending();
      }
      if (active === "postFirstVideo") {
        markPostFirstVideoScreenSeen();
      }
      setOverlay("none");
      setIosHint(false);
      try {
        document.body.style.overflow = "";
      } catch {
        /* ignore */
      }
    },
    [overlay],
  );

  const onLater = useCallback(() => {
    if (overlay === "enableNotifications") {
      snoozeNotificationPrompt(7);
      setOverlay("none");
      try {
        document.body.style.overflow = "";
      } catch {
        /* ignore */
      }
      return;
    }
    snoozeInstallPrompt(7);
    closeOverlay(overlay);
  }, [closeOverlay, overlay]);

  const onNotificationsEnabled = useCallback(() => {
    markNotificationPromptDone();
    setOverlay("none");
    try {
      document.body.style.overflow = "";
    } catch {
      /* ignore */
    }
  }, []);

  const onInstall = useCallback(async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      closeOverlay(overlay);
      return;
    }
    if (outcome === "ios-guide" || outcome === "unavailable") {
      setIosHint(true);
      if (overlay === "postRegistration" || overlay === "postFirstVideo") {
        return;
      }
      setOverlay("visit");
      return;
    }
  }, [closeOverlay, overlay, promptInstall]);

  return (
    <>
      {!installed ? (
        <>
          <InstallPromptModal
            open={overlay === "visit"}
            onInstall={() => void onInstall()}
            onLater={onLater}
            showIosHint={iosHint || ios}
          />
          <InstallPremiumScreen
            open={overlay === "postRegistration"}
            variant="postRegistration"
            onInstall={() => void onInstall()}
            onLater={onLater}
          />
          <InstallPremiumScreen
            open={overlay === "postFirstVideo"}
            variant="postFirstVideo"
            onInstall={() => void onInstall()}
            onLater={onLater}
          />
        </>
      ) : null}
      <EnableNotificationsScreen
        open={overlay === "enableNotifications"}
        onEnabled={onNotificationsEnabled}
        onLater={onLater}
      />
    </>
  );
}
