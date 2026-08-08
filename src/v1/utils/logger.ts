type Level = "debug" | "info" | "warn" | "error";

let CURRENT_LEVEL: Level = "info";
const RANK: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export function setLogLevel(level: Level) {
  CURRENT_LEVEL = level;
}

function enabled(level: Level) {
  return RANK[level] >= RANK[CURRENT_LEVEL];
}

export const logger = {
  debug: (...args: any[]) => { if (enabled("debug")) console.debug("[debug]", ...args); },
  info:  (...args: any[]) => { if (enabled("info"))  console.info("[info ]", ...args); },
  warn:  (...args: any[]) => { if (enabled("warn"))  console.warn("[warn ]", ...args); },
  error: (...args: any[]) => { if (enabled("error")) console.error("[error]", ...args); },
};
