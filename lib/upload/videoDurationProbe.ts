/** Client-side duration from a local video file (metadata only). */
export function probeLocalVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    const url = URL.createObjectURL(file);
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    v.onloadedmetadata = () => {
      const d = v.duration;
      done(Number.isFinite(d) && d > 0 ? d : null);
    };
    v.onerror = () => done(null);
    v.src = url;
  });
}
