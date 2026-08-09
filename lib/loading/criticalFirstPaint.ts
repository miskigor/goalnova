/**
 * Inlined in [locale]/layout <head> before CSS chunks — prevents flash on cold load.
 */
export const PITCHRUSCH_CRITICAL_FIRST_PAINT_CSS = `
html, body {
  margin: 0;
  padding: 0;
  background-color: #fff;
  color-scheme: light;
}
body, #__next, #__next > div, main, [data-app-root], [data-mlv2-root], [data-mlv2-column], [data-mlv2-scroll] {
  background-color: #fff;
}
`.trim();

/** Runs synchronously in <head> before first paint when HTML is parsed. */
export const PITCHRUSCH_CRITICAL_FIRST_PAINT_SCRIPT = `(function(){var d=document.documentElement,b=document.body;d.style.backgroundColor='#fff';d.style.colorScheme='light';if(b){b.style.backgroundColor='#fff';b.style.margin='0';}})();`;
