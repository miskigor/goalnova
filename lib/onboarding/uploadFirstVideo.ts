export const PITCHRUSCH_UPLOAD_FIRST_VIDEO_DISMISSED = "pitchrusch_upload_first_video_dismissed";

export function isUploadFirstVideoDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(PITCHRUSCH_UPLOAD_FIRST_VIDEO_DISMISSED) === "1";
  } catch {
    return false;
  }
}

export function dismissUploadFirstVideo(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PITCHRUSCH_UPLOAD_FIRST_VIDEO_DISMISSED, "1");
  } catch {
    /* private mode */
  }
}
