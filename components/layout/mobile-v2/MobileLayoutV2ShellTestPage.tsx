"use client";

import { useEffect } from "react";
import { isMobileLayoutStableV2Enabled } from "@/lib/layout/mobileLayoutStableV2Flag";

const MLV2_LAYOUT_TEST_ATTR = "data-mlv2-layout-test";

/**
 * Visual shell check: red = [data-mlv2-root], blue = scroll, green = bottom nav (in-flow).
 * Open /debug/mobile-layout-v2 with NEXT_PUBLIC_MOBILE_LAYOUT_STABLE_V2=true on a phone.
 */
export function MobileLayoutV2ShellTestPage() {
  const enabled = isMobileLayoutStableV2Enabled();

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.setAttribute(MLV2_LAYOUT_TEST_ATTR, "");
    return () => {
      document.documentElement.removeAttribute(MLV2_LAYOUT_TEST_ATTR);
    };
  }, [enabled]);

  if (!enabled) {
    return (
      <div className="space-y-4 py-6 text-sm text-gn-text-secondary">
        <h1 className="text-lg font-semibold text-gn-text">V2 shell test</h1>
        <p>
          Flag is <strong className="text-gn-text">off</strong>. In{" "}
          <code className="rounded bg-white/10 px-1 py-0.5 text-gn-text">.env.local</code>:
        </p>
        <pre className="overflow-x-auto rounded-lg border border-gn-border-subtle bg-black/30 p-3 text-xs text-gn-text">
          NEXT_PUBLIC_MOBILE_LAYOUT_STABLE_V2=true
        </pre>
        <p>
          Restart <code className="text-gn-text">npm run dev</code>, reload{" "}
          <code className="text-gn-text">/hr/debug/mobile-layout-v2</code> on iPhone.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8 text-sm" data-mlv2-shell-test-content>
      <h1 className="text-lg font-semibold text-gn-text">V2 shell layout test</h1>
      <ul className="space-y-2 rounded-lg border border-white/15 bg-black/40 p-3 text-xs text-gn-text">
        <li>
          <span className="inline-block h-3 w-3 rounded-sm bg-red-500/80 align-middle" />{" "}
          <strong>Red</strong> — <code>data-mlv2-root</code> (fixed 100dvh, overflow hidden)
        </li>
        <li>
          <span className="inline-block h-3 w-3 rounded-sm bg-blue-500/80 align-middle" />{" "}
          <strong>Blue</strong> — <code>data-mlv2-scroll</code> (flex 1, scrolls)
        </li>
        <li>
          <span className="inline-block h-3 w-3 rounded-sm bg-green-500/80 align-middle" />{" "}
          <strong>Green</strong> — <code>data-mlv2-bottom-nav</code> (static, last in root)
        </li>
      </ul>
      <p className="text-gn-text-secondary">
        Green bar must sit above the browser toolbar (safe-area padding only, no JS). Scroll this
        blue area — blocks below should move; green stays pinned at the bottom of the red frame.
      </p>
      {Array.from({ length: 12 }, (_, i) => (
        <div
          key={i}
          className="rounded-lg border border-blue-400/40 bg-blue-500/20 px-3 py-4 text-gn-text"
        >
          Scroll block {i + 1} / 12
        </div>
      ))}
    </div>
  );
}
