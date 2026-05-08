/**
 * Client-side video compression is not used in the upload flow (dynamic `import()` of ffmpeg.wasm
 * was unreliable with the Next.js bundler).
 *
 * If you add compression again, put it in a **dedicated module** that uses only **static**
 * top-level imports, for example:
 *
 *   import { FFmpeg } from "@ffmpeg/ffmpeg";
 *   import { fetchFile, toBlobURL } from "@ffmpeg/util";
 *
 * Load wasm/core from fixed URLs; do not dynamically import that module from upload UI — call
 * a stable exported function from a file that is imported normally (static graph).
 */

export {};
