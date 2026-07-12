function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

async function fetchVideoBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("fetch_failed");
  }
  const blob = await res.blob();
  if (!blob.size) {
    throw new Error("empty_video");
  }
  return blob;
}

async function shareVideoFile(file: File): Promise<boolean> {
  if (typeof navigator.share !== "function") return false;
  try {
    if (navigator.canShare?.({ files: [file] }) === false) {
      return false;
    }
    await navigator.share({ files: [file] });
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return true;
    }
    return false;
  }
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
}

function triggerDirectNavigation(url: string): void {
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.setAttribute("aria-hidden", "true");
  iframe.src = url;
  document.body.appendChild(iframe);
  window.setTimeout(() => iframe.remove(), 120_000);
}

/**
 * Mobile WebKit ignores `download` on cross-origin URLs and often plays video in a
 * new tab. Fetch blob + Share (iOS) or blob anchor (Android) instead.
 */
export async function triggerClientVideoDownload(
  url: string,
  filename: string,
): Promise<void> {
  const href = url.trim();
  const name = filename.trim() || "pitchrusch-video.mp4";
  if (!href) {
    throw new Error("missing_url");
  }

  if (!isMobileDevice()) {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = name;
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return;
  }

  const blob = await fetchVideoBlob(href);
  const file = new File([blob], name, {
    type: blob.type || "video/mp4",
  });

  if (isIosDevice()) {
    const shared = await shareVideoFile(file);
    if (shared) return;
  }

  try {
    triggerBlobDownload(blob, name);
    return;
  } catch {
    /* fall through */
  }

  triggerDirectNavigation(href);
}
