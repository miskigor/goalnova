/** Dispatched after `users.avatar_url` is updated so shell UI (e.g. nav) can refresh without auth metadata writes. */
export const AVATAR_URL_UPDATED_EVENT = "pitchrusch:avatar-url-updated";

export type AvatarUrlUpdatedDetail = {
  url: string | null;
};

export function dispatchAvatarUrlUpdated(url: string | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AvatarUrlUpdatedDetail>(AVATAR_URL_UPDATED_EVENT, {
      detail: { url },
    }),
  );
}
