/**
 * Page-segment loading for `(app)` routes. `(app)/layout` keeps {@link AppChromeLayout}
 * mounted; this only fills the main column while the page RSC boundary resolves.
 */
import { PitchruschLoadingScreen } from "@/components/loading/PitchruschLoadingScreen";

export default function AppSectionLoading() {
  return <PitchruschLoadingScreen fullScreen={false} />;
}
