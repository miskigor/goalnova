import { MLV2_ROOT_ATTR } from "@/components/layout/mobile-v2/mobileLayoutStableV2.tokens";

/**
 * Synchronous <head> script: set V2 html attribute on app routes before first paint.
 * Avoids waiting for AppChromeLayoutStableV2 useEffect (post-paint flash).
 */
export const MLV2_HTML_ATTRIBUTE_SYNC_SCRIPT = `(function(){var p=location.pathname,re=/(?:^|\\/)(?:home|explore|profile|upload|challenges|scout-dashboard|scout-apply|admin|notifications|messages|settings|premium|benefits|rankings|discover|player)(?:\\/|$)/;if(!re.test(p))return;document.documentElement.setAttribute("${MLV2_ROOT_ATTR}","");})();`;
