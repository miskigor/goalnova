import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/** Mount point for {@link AppMobileBottomNav} — in-flow, outside V3 scroll container. */
export function MobileBottomNavSlotV3({ children }: Props) {
  return (
    <div data-mlv3-bottom-nav className="max-lg:block lg:hidden">
      {children}
    </div>
  );
}
