"use client";

import { useEffect } from "react";
import {
  isMobileLayoutV3Enabled,
  isMobileLayoutV3ShellRoute,
} from "@/lib/layout/mobileLayoutV3Flag";
import { usePathname } from "@/i18n/navigation";
import { MLV3_LAYOUT_TEST_ATTR } from "@/components/layout/mobile-v3/mobileLayoutV3.tokens";

/**
 * Visual shell check: red = [data-mlv3-root], blue = scroll, green = bottom nav (in-flow).
 * Open /debug/mobile-layout-v3 with NEXT_PUBLIC_MOBILE_LAYOUT_V3=true on a phone.
 */
export function MobileLayoutV3ShellTestPage() {
  const pathname = usePathname();
  const enabled = isMobileLayoutV3Enabled();
  const onV3ShellRoute = isMobileLayoutV3ShellRoute(pathname);

  useEffect(() => {
    if (!enabled || !onV3ShellRoute) return;
    document.documentElement.setAttribute(MLV3_LAYOUT_TEST_ATTR, "");
    return () => {
      document.documentElement.removeAttribute(MLV3_LAYOUT_TEST_ATTR);
    };
  }, [enabled, onV3ShellRoute]);

  if (!enabled) {
    return (
      <div className="space-y-4 py-6 text-sm text-gn-text-secondary">
        <h1 className="text-lg font-semibold text-gn-text">V3 shell test</h1>
        <p>
          Flag is <strong className="text-gn-text">off</strong>. In{" "}
          <code className="rounded bg-white/10 px-1 py-0.5 text-gn-text">.env.local</code>:
        </p>
        <pre className="overflow-x-auto rounded-lg border border-gn-border-subtle bg-black/30 p-3 text-xs text-gn-text">
          NEXT_PUBLIC_MOBILE_LAYOUT_V3=true
        </pre>
        <p>
          Restart <code className="text-gn-text">npm run dev</code>, reload{" "}
          <code className="text-gn-text">/hr/debug/mobile-layout-v3</code> on iPhone.
        </p>
      </div>
    );
  }

  if (!onV3ShellRoute) {
    return (
      <div className="space-y-4 py-6 text-sm text-gn-text-secondary">
        <h1 className="text-lg font-semibold text-gn-text">V3 shell test</h1>
        <p>
          V3 flag is on, but this page is not the V3 shell route. Open{" "}
          <code className="text-gn-text">/hr/debug/mobile-layout-v3</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8 text-sm" data-mlv3-shell-test-content>
      <h1 className="text-lg font-semibold text-gn-text">V3 shell layout test</h1>
      <p className="rounded-lg border border-gn-accent/35 bg-gn-accent/10 px-3 py-2 text-xs text-gn-text">
        <strong>Top check:</strong> this heading must be visible immediately — no clip at the top.
      </p>
      <ul className="space-y-2 rounded-lg border border-white/15 bg-black/40 p-3 text-xs text-gn-text">
        <li>
          <span className="inline-block h-3 w-3 rounded-sm bg-red-500/80 align-middle" />{" "}
          <strong>Red</strong> — <code>data-mlv3-root</code> (fixed shell, overflow hidden)
        </li>
        <li>
          <span className="inline-block h-3 w-3 rounded-sm bg-blue-500/80 align-middle" />{" "}
          <strong>Blue</strong> — <code>data-mlv3-scroll</code> (only scroll container)
        </li>
        <li>
          <span className="inline-block h-3 w-3 rounded-sm bg-green-500/80 align-middle" />{" "}
          <strong>Green</strong> — <code>data-mlv3-bottom-nav</code> (outside scroll, in-flow)
        </li>
      </ul>
      <p className="text-gn-text-secondary">
        Scroll the blue area — blocks below should move; green bottom nav stays pinned at the bottom
        of the red frame and must not drift while scrolling.
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
