/** Loading shell — same fixed card slot as production home (no legacy feed attrs). */
export function HomeCleanV3Skeleton() {
  return (
    <div data-home-clean-v3 data-home-clean-v3-skeleton>
      <div data-home-clean-v3-page>
        <div data-home-clean-v3-item>
          <div data-home-clean-v3-card data-home-clean-v3-loading>
            <div data-home-clean-v3-fake aria-hidden />
            <div data-home-clean-v3-loading-spinner role="status" aria-busy>
              <span className="sr-only">Loading</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
