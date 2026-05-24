import Image from "next/image";

const PREVIEW_SRC = "/images/landing/football-kick-preview.jpg";
const PREVIEW_WIDTH = 576;
const PREVIEW_HEIGHT = 1024;

type Props = {
  badge: string;
  caption: string;
};

/** Feed-style phone mock with optimized highlight still (no video playback). */
export function LandingFeedPreview({ badge, caption }: Props) {
  return (
    <div className="mx-auto box-border w-full min-w-0 max-w-[min(100%,280px)] overflow-x-clip lg:mx-0 lg:ml-auto">
      <div className="relative aspect-[9/16] w-full max-w-full overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-[0_24px_80px_-24px_rgba(249,115,22,0.35)]">
        <Image
          src={PREVIEW_SRC}
          alt=""
          width={PREVIEW_WIDTH}
          height={PREVIEW_HEIGHT}
          quality={82}
          priority
          sizes="(max-width: 1024px) 280px, 340px"
          className="absolute inset-0 h-full w-full max-w-full object-cover object-center"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/85"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(249,115,22,0.08)_0%,transparent_40%,rgba(0,0,0,0.25)_100%)]"
          aria-hidden
        />
        <div className="absolute left-3 top-3 z-10 rounded-full border border-orange-500/40 bg-black/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-orange-200 backdrop-blur-sm">
          {badge}
        </div>
        <div className="absolute inset-0 z-10 flex items-center justify-center" aria-hidden>
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-black/45 shadow-lg backdrop-blur-md">
            <div className="ml-1 h-0 w-0 border-y-[9px] border-l-[14px] border-y-transparent border-l-white" />
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/95 via-black/55 to-transparent p-4 pt-16">
          <div className="h-2 w-24 rounded-full bg-white/90" />
          <div className="mt-2 h-2 w-16 rounded-full bg-white/40" />
          <p className="mt-3 text-xs text-gn-text-secondary">{caption}</p>
        </div>
        <div className="pointer-events-none absolute bottom-24 right-3 z-10 flex flex-col gap-3" aria-hidden>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-9 rounded-full border border-white/15 bg-black/50 backdrop-blur-sm" />
          ))}
        </div>
      </div>
    </div>
  );
}
