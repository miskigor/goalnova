/** Extra CSS for the instant boot splash (inlined in root layout <head>). */
export const BOOT_SPLASH_CSS = `
#pitchrusch-boot-splash {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 1rem;
  margin: 0;
  padding: 0;
  background-color: #000;
  color: #fafafa;
  pointer-events: none;
}
#pitchrusch-boot-splash img {
  width: 5rem;
  height: 5rem;
  user-select: none;
}
#pitchrusch-boot-splash .pitchrusch-boot-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(249, 115, 22, 0.25);
  border-top-color: #f97316;
  border-radius: 9999px;
  animation: pitchrusch-boot-spin 0.8s linear infinite;
}
@keyframes pitchrusch-boot-spin {
  to { transform: rotate(360deg); }
}
`.trim();

/** Sets html lang/dir from URL before React hydrates (locale layout no longer owns <html>). */
export const LOCALE_HTML_SYNC_SCRIPT = `(function(){var p=location.pathname,re=/^\\/(hr|de|bs|es|pt|sr|fr|it|nl|tr|ar)(?:\\/|$)/,m=p.match(re),lang=m?m[1]:"en";document.documentElement.lang=lang;document.documentElement.dir=lang==="ar"?"rtl":"ltr";})();`;
