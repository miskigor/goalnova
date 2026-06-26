const DEFAULT_MAX_WIDTH = 1280;
const SEEK_TIMEOUT_MS = 4000;

/**
 * Extract a JPEG still from a local video file (browser upload flow).
 * Returns null when the browser cannot decode the file (caller should use server fallback).
 */
export async function captureVideoThumbnailJpeg(
  file: File,
  maxWidth = DEFAULT_MAX_WIDTH,
): Promise<Blob | null> {
  if (typeof document === "undefined") return null;

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.src = objectUrl;

  try {
    await waitForEvent(video, "loadeddata", SEEK_TIMEOUT_MS * 2);
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
    const seekTo = Math.min(Math.max(duration * 0.12, 0.05), Math.max(duration - 0.05, 0.05));
    video.currentTime = seekTo;
    await waitForEvent(video, "seeked", SEEK_TIMEOUT_MS);

    const sourceW = video.videoWidth;
    const sourceH = video.videoHeight;
    if (!sourceW || !sourceH) return null;

    const scale = Math.min(1, maxWidth / sourceW);
    const width = Math.max(1, Math.round(sourceW * scale));
    const height = Math.max(1, Math.round(sourceH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, width, height);

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.86);
    });
  } catch {
    return null;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

function waitForEvent(
  target: HTMLVideoElement,
  event: "loadeddata" | "seeked",
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(`video ${event} timeout`));
    }, timeoutMs);

    const onOk = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error(`video ${event} error`));
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      target.removeEventListener(event, onOk);
      target.removeEventListener("error", onErr);
    };

    target.addEventListener(event, onOk, { once: true });
    target.addEventListener("error", onErr, { once: true });
  });
}
