import Link from "next/link";

export default function PaymentSuccessPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-10 pt-6 sm:px-5">
      <div className="rounded-2xl border border-gn-accent/35 bg-gn-accent/10 p-6">
        <h1 className="text-2xl font-bold text-gn-text">Payment successful</h1>
        <p className="mt-2 text-sm text-gn-text-secondary">
          Payment successful. Your subscription is being activated.
        </p>
        <Link
          href="/home"
          className="mt-5 inline-flex rounded-xl bg-gn-accent px-4 py-2.5 text-sm font-semibold text-black"
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}

