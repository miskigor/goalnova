import { RouteSegmentFallback } from "@/components/loading/RouteSegmentFallback";

export default function PublicSectionLoading() {
  return (
    <div className="min-h-dvh w-full bg-black">
      <RouteSegmentFallback />
    </div>
  );
}
