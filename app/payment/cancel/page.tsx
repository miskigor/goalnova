import Link from "next/link";

export default function PaymentCancelPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-10 pt-6 sm:px-5">
      <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-6">
        <h1 className="text-2xl font-bold text-gn-text">Payment cancelled</h1>
        <p className="mt-2 text-sm text-gn-text-secondary">
          Payment was cancelled. You can try again anytime.
        </p>
        <Link
          href="/pricing"
          className="mt-5 inline-flex rounded-xl border border-gn-border-subtle bg-gn-surface/60 px-4 py-2.5 text-sm font-semibold text-gn-text"
        >
          Back to pricing
        </Link>
      </div>
    </main>
  );
}

