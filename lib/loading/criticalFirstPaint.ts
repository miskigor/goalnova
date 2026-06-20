/**
 * Inlined in [locale]/layout <head> before CSS chunks — prevents white flash on cold load.
 */
export const PITCHRUSCH_CRITICAL_FIRST_PAINT_CSS = `
html, body {
  margin: 0;
  padding: 0;
  background-color: #000;
  color-scheme: dark;
}
body, #__next, #__next > div, main, [data-app-root], [data-mlv2-root], [data-mlv2-column], [data-mlv2-scroll] {
  background-color: #000;
}
`.trim();

/** Runs synchronously in <head> before first paint when HTML is parsed. */
export const PITCHRUSCH_CRITICAL_FIRST_PAINT_SCRIPT = `(function(){var d=document.documentElement,b=document.body;d.style.backgroundColor='#000';d.style.colorScheme='dark';if(b){b.style.backgroundColor='#000';b.style.margin='0';}var s=document.getElementById('pitchrusch-boot-splash');if(!s&&b){s=document.createElement('div');s.id='pitchrusch-boot-splash';s.setAttribute('aria-hidden','true');s.innerHTML='<img src="/brand/pitchrusch-logo.svg" alt="" width="80" height="80" decoding="async" fetchpriority="high"/><div class="pitchrusch-boot-spinner"></div>';b.insertBefore(s,b.firstChild);}})();`;
