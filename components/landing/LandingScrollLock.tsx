"use client";

import { useEffect } from "react";

/** Locks vertical document scroll on narrow viewports only (landing fits one screen). */
export function LandingScrollLock() {
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");

    function lock() {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }

    function unlock() {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }

    function sync() {
      if (mq.matches) lock();
      else unlock();
    }

    sync();
    mq.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      unlock();
    };
  }, []);

  return null;
}
