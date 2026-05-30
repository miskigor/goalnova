import { devError } from "@/lib/devLog";

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    devError("[PitchRusch share] clipboard write failed", e);
    return false;
  }
}
