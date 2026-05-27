import type { HTMLAttributes, ReactNode } from "react";
import { APP_MOBILE_TAB_PAGE_SHELL_CLASS } from "@/lib/layout/appShellClasses";

type AppMobileTabPageShellProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

/** Bounded page column matching `/profile` inside the mobile app shell. */
export function AppMobileTabPageShell({
  children,
  className,
  ...rest
}: AppMobileTabPageShellProps) {
  return (
    <div
      className={[
        APP_MOBILE_TAB_PAGE_SHELL_CLASS,
        "box-border w-full min-w-0 max-w-full max-lg:px-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
