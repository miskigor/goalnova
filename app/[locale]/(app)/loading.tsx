/**
 * Page-segment loading for `(app)` routes. `(app)/layout` keeps chrome mounted;
 * this only fills the main column while the page streams.
 */
import { RouteSegmentFallback } from "@/components/loading/RouteSegmentFallback";

export default function AppSectionLoading() {
  return <RouteSegmentFallback />;
}
