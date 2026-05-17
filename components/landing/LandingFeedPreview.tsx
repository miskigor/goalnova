type Props = {
  badge: string;
  caption: string;
};

/** Lightweight feed UI mock — no video assets or extra libraries. */
export function LandingFeedPreview({ badge, caption }: Props) {
  return (
    <div className="mx-auto w-full max-w-[280px] lg:mx-0 lg:ml-auto">
      <div className="relative aspect-[9/16] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black shadow-[0_24px_80px_-24px_rgba(249,115,22,0.35)]">
        <div
          className="absolute inset-0 bg-[linear-gradient(160deg,rgba(249,115,22,0.12)_0%,transparent_45%,rgba(0,0,0,0.4)_100%)]"
          aria-hidden
        />
        <div className="absolute left-3 top-3 rounded-full border border-orange-500/40 bg-orange-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-orange-200">
          {badge}
        </div>
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/40 backdrop-blur-sm">
            <div className="ml-1 h-0 w-0 border-y-[9px] border-l-[14px] border-y-transparent border-l-white" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-16">
          <div className="h-2 w-24 rounded-full bg-white/90" />
          <div className="mt-2 h-2 w-16 rounded-full bg-white/40" />
          <p className="mt-3 text-xs text-gn-text-secondary">{caption}</p>
        </div>
        <div className="absolute bottom-24 right-3 flex flex-col gap-3" aria-hidden>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-9 rounded-full border border-white/15 bg-black/50" />
          ))}
        </div>
      </div>
    </div>
  );
}
