/** Loading shell — same fixed card slot as production home (no legacy feed attrs). */
import { HOME_CLEAN_V3_CARD_LOCK_STYLE } from "@/components/home/v3-clean/homeCleanV3LayoutLock";

export function HomeCleanV3Skeleton() {
  return (
    <div data-home-clean-v3 data-home-clean-v3-skeleton>
      <div data-home-clean-v3-page>
        <div data-home-clean-v3-item>
          <div
            data-home-clean-v3-card
            data-home-clean-v3-loading
            style={HOME_CLEAN_V3_CARD_LOCK_STYLE}
          />
        </div>
      </div>
    </div>
  );
}
