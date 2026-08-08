/**
 * High-Detail Terminal Logger for Document Intelligence Engine
 */

export function logHeader(title: string) {
  const timestamp = new Date().toISOString();
  console.log(`\n==================================================`);
  console.log(`[${timestamp}] 🚀 ${title}`);
  console.log(`==================================================`);
}

export function logStep(stage: string, message: string, details?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  let detailStr = "";
  if (details && Object.keys(details).length > 0) {
    detailStr = "\n  " + JSON.stringify(details, null, 2).replace(/\n/g, "\n  ");
  }
  console.log(`[${timestamp}] [${stage}] ${message}${detailStr}`);
}

export function logSuccess(stage: string, message: string, details?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  let detailStr = "";
  if (details && Object.keys(details).length > 0) {
    detailStr = "\n  " + JSON.stringify(details, null, 2).replace(/\n/g, "\n  ");
  }
  console.log(`[${timestamp}] [${stage}] ✅ ${message}${detailStr}`);
}

export function logWarn(stage: string, message: string) {
  const timestamp = new Date().toISOString();
  console.warn(`[${timestamp}] [${stage}] ⚠️ ${message}`);
}

export function logError(stage: string, message: string, err?: any) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [${stage}] ❌ ${message}`, err || "");
}
