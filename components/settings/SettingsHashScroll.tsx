"use client";

import { useEffect } from "react";

/** Scroll to `#invite-friends` (and other settings anchors) after the section mounts. */
export function SettingsHashScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;

    let tries = 0;
    const tick = () => {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      tries += 1;
      if (tries < 20) {
        window.setTimeout(tick, 100);
      }
    };

    // Wait one frame so InviteFriendsSection can finish loading.
    window.setTimeout(tick, 50);
  }, []);

  return null;
}
