
export const getOpenAIKey = (env: Record<string, any>) =>
  env.OPENAI_API_KEY || env.OPENAPI_API_KEY || "";

export async function getAdminApiKey(
  env: Record<string, any>,
  getFromKV?: (k: string) => Promise<string | null>
) {
  if (env.ADMIN_API_KEY) return env.ADMIN_API_KEY as string;
  if (getFromKV) return (await getFromKV("ADMIN_API_KEY")) || "";
  return "";
}
