/**
 * Inlined in [locale]/layout <head> when V2 is on — applies before async CSS chunks.
 * /home forbidden — only tab, profile, public-player.
 */
export const MLV2_CRITICAL_NON_HOME_CSS = `
html[data-mobile-layout-stable-v2] [data-mlv2-content][data-mlv2-route="tab"],
html[data-mobile-layout-stable-v2] [data-mlv2-content][data-mlv2-route="profile"],
html[data-mobile-layout-stable-v2] [data-mlv2-content][data-mlv2-route="public-player"] {
  box-sizing: border-box;
  padding-top: calc(1cm + env(safe-area-inset-top, 0px)) !important;
  overflow-x: clip !important;
}
html[data-mobile-layout-stable-v2] [data-pitchrusch-explore-frame] {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: clip;
}
html[data-mobile-layout-stable-v2] [data-pitchrusch-explore-frame] > header,
html[data-mobile-layout-stable-v2] [data-pitchrusch-explore-frame] h1,
html[data-mobile-layout-stable-v2] [data-pitchrusch-explore-frame] p {
  max-width: 100%;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}
html[data-mobile-layout-stable-v2]:has([data-challenges-page]) [data-mlv2-bottom-nav] {
  position: fixed !important;
  inset-inline: 0 !important;
  bottom: 0 !important;
  z-index: 50 !important;
}
html[data-mobile-layout-stable-v2]:has([data-challenges-page]) [data-mlv2-scroll] {
  overflow-y: auto !important;
  min-height: 0 !important;
}
`.trim();
