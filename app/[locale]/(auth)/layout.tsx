import { AuthGate } from "@/components/auth/AuthGate";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate mode="guest" redirectTo="/home">
      <div className="relative flex min-h-dvh min-w-0 w-full flex-col items-center justify-start overflow-y-auto overflow-x-clip px-4 py-8 sm:justify-center sm:py-16">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden
        >
          <div className="absolute -top-40 start-1/2 h-[22rem] w-[22rem] -translate-x-1/2 rounded-full bg-gn-accent/[0.12] blur-[120px]" />
          <div className="absolute bottom-0 end-0 h-48 w-48 rounded-full bg-gn-accent/[0.06] blur-[80px]" />
        </div>
        <div className="relative w-full min-w-0 max-w-sm">{children}</div>
      </div>
    </AuthGate>
  );
}
