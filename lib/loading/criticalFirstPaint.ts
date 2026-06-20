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
export const PITCHRUSCH_CRITICAL_FIRST_PAINT_SCRIPT = `(function(){var d=document.documentElement,b=document.body;d.style.backgroundColor='#000';d.style.colorScheme='dark';if(b){b.style.backgroundColor='#000';b.style.margin='0';}})();`;
