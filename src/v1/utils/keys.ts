
export const getOpenAIKey = (env: Record<string, any>) =>
  env?.OPENAI_API_KEY || env?.OPENAPI_API_KEY || "";

export async function getOpenAIKeyAsync(
  env: Record<string, any>,
  getFromKV?: (k: string) => Promise<string | null>
): Promise<string> {
  if (env?.OPENAI_API_KEY) return env.OPENAI_API_KEY as string;
  if (env?.OPENAPI_API_KEY) return env.OPENAPI_API_KEY as string;
  if (env?.CONFIG && typeof env.CONFIG.get === "function") {
    const k = await env.CONFIG.get("OPENAI_API_KEY");
    if (k) return k.trim();
  }
  if (getFromKV) {
    const k = await getFromKV("OPENAI_API_KEY");
    if (k) return k.trim();
  }
  return "";
}

export async function getAdminApiKey(
  env: Record<string, any>,
  getFromKV?: (k: string) => Promise<string | null>
) {
  if (env?.ADMIN_API_KEY) return env.ADMIN_API_KEY as string;
  if (env?.CONFIG && typeof env.CONFIG.get === "function") {
    const k = await env.CONFIG.get("ADMIN_API_KEY");
    if (k) return k.trim();
  }
  if (getFromKV) return (await getFromKV("ADMIN_API_KEY")) || "";
  return "";
}

export function getJwtSecret(env: Record<string, any>): string {
  if (env?.JWT_SECRET && typeof env.JWT_SECRET === "string" && env.JWT_SECRET.trim()) {
    return env.JWT_SECRET.trim();
  }
  return "fervent-curie-jwt-enterprise-auth-key-2026-production";
}

