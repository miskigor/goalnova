import { PitchruschLoadingScreen } from "@/components/loading/PitchruschLoadingScreen";

export default function PublicSectionLoading() {
  return (
    <div className="min-h-dvh w-full bg-gn-bg">
      <PitchruschLoadingScreen fullScreen={false} label="Loading…" />
    </div>
  );
}
