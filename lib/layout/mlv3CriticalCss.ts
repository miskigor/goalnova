import { MLV3_HTML_ATTR } from "@/components/layout/mobile-v3/mobileLayoutV3.tokens";

/** Inlined in [locale]/layout <head> when V3 flag is on — debug route only, before async CSS. */
export const MLV3_CRITICAL_CSS = `
html[${MLV3_HTML_ATTR}] body {
  margin: 0;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  overflow-x: clip;
}
html[${MLV3_HTML_ATTR}] [data-mlv3-root] {
  position: fixed;
  inset: 0;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  overflow-x: clip;
}
`;

/** Sets V3 html flag on the debug route before first paint. */
export const MLV3_HTML_ATTRIBUTE_SYNC_SCRIPT = `(function(){var p=location.pathname;if(!/(?:^|\\/)(?:[a-z]{2}\\/)?debug\\/mobile-layout-v3(?:\\/|$)/.test(p))return;document.documentElement.setAttribute("${MLV3_HTML_ATTR}","");})();`;
