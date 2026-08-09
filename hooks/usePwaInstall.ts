"use client";

import { useCallback, useEffect, useState } from "react";
import { isIosSafari, isStandaloneDisplay } from "@/lib/pwa/displayMode";

type BeforeInstallPromptEventLike = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

let deferredPromptGlobal: BeforeInstallPromptEventLike | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function setDeferredPrompt(event: BeforeInstallPromptEventLike | null) {
  deferredPromptGlobal = event;
  notifyListeners();
}

/** Call once from PwaBootstrap to capture `beforeinstallprompt`. */
export function bindBeforeInstallPromptListener(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onBip = (e: Event) => {
    e.preventDefault();
    setDeferredPrompt(e as BeforeInstallPromptEventLike);
  };

  const onInstalled = () => {
    setDeferredPrompt(null);
    notifyListeners();
  };

  window.addEventListener("beforeinstallprompt", onBip);
  window.addEventListener("appinstalled", onInstalled);

  return () => {
    window.removeEventListener("beforeinstallprompt", onBip);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

export type PwaInstallOutcome = "accepted" | "dismissed" | "unavailable" | "ios-guide";

export function usePwaInstall() {
  const [installed, setInstalled] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const sync = () => {
      setInstalled(isStandaloneDisplay());
      setCanPrompt(Boolean(deferredPromptGlobal));
      setIos(isIosSafari());
    };
    sync();
    listeners.add(sync);

    let mql: MediaQueryList | null = null;
    try {
      mql = window.matchMedia("(display-mode: standalone)");
      mql.addEventListener("change", sync);
    } catch {
      /* ignore */
    }

    return () => {
      listeners.delete(sync);
      try {
        mql?.removeEventListener("change", sync);
      } catch {
        /* ignore */
      }
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<PwaInstallOutcome> => {
    if (isStandaloneDisplay()) return "accepted";

    if (deferredPromptGlobal) {
      const promptEvent = deferredPromptGlobal;
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      setDeferredPrompt(null);
      return choice.outcome === "accepted" ? "accepted" : "dismissed";
    }

    if (isIosSafari()) return "ios-guide";
    return "unavailable";
  }, []);

  return {
    installed,
    canPrompt,
    ios,
    promptInstall,
    showInstallUi: !installed,
  };
}
