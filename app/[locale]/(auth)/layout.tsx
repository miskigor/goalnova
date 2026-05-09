import { AuthGate } from "@/components/auth/AuthGate";
import { ViewportScrollLock } from "@/components/layout/ViewportScrollLock";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate mode="guest" redirectTo="/home">
      <ViewportScrollLock />
      <div
        className="relative flex h-[100dvh] min-h-0 min-w-0 w-full flex-col items-center justify-center overflow-hidden overscroll-y-none bg-black pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pt-[max(1rem,env(safe-area-inset-top))]"
      >
        <div className="relative mx-auto w-full min-w-0 max-w-sm">{children}</div>
      </div>
    </AuthGate>
  );
}
