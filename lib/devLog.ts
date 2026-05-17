/** True in local `next dev`; false in production builds. */
export const isDev = process.env.NODE_ENV === "development";

export function devLog(...args: unknown[]) {
  if (isDev) console.log(...args);
}

export function devWarn(...args: unknown[]) {
  if (isDev) console.warn(...args);
}

export function devError(...args: unknown[]) {
  if (isDev) console.error(...args);
}

export function devInfo(...args: unknown[]) {
  if (isDev) console.info(...args);
}

export function devTable(...args: unknown[]) {
  if (isDev) console.table(...args);
}
