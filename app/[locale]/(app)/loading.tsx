/**
 * Page-segment loading for `(app)` routes. `(app)/layout` keeps {@link AppChromeLayout}
 * mounted; this only fills the main column while the page RSC boundary resolves.
 */
import { PitchruschLoadingScreen } from "@/components/loading/PitchruschLoadingScreen";

export default function AppSectionLoading() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-gn-bg">
      <PitchruschLoadingScreen fullScreen={false} label="Loading…" />
    </div>
  );
}
