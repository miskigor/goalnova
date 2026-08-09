export const PWA_OPEN_INSTALL_EVENT = "pitchrusch:pwa:open-install";
export const PWA_SHOW_POST_REGISTRATION_EVENT = "pitchrusch:pwa:show-post-registration";
export const PWA_SHOW_POST_FIRST_VIDEO_EVENT = "pitchrusch:pwa:show-post-first-video";

export function dispatchPwaOpenInstall(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PWA_OPEN_INSTALL_EVENT));
}

export function dispatchPwaShowPostRegistration(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PWA_SHOW_POST_REGISTRATION_EVENT));
}

export function dispatchPwaShowPostFirstVideo(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PWA_SHOW_POST_FIRST_VIDEO_EVENT));
}
