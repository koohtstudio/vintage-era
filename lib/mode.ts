/**
 * The ONE place that reads NEXT_PUBLIC_APP_MODE. Every adapter in lib/ branches on this.
 * Anything other than the literal string "live" is treated as mock, so a typo can never
 * accidentally turn real payments on.
 */
export type AppMode = "mock" | "live";

export const APP_MODE: AppMode = process.env.NEXT_PUBLIC_APP_MODE === "live" ? "live" : "mock";
export const isMock = APP_MODE === "mock";
export const isLive = APP_MODE === "live";
