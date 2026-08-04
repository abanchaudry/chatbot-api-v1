export async function saveMessageToCache(cache: KVNamespace, threadId: string, userId: string, message: string, answer: string): Promise<void> {
  await cache.put(`message:${threadId}:${userId}:question`, message, { expirationTtl: 3600 });
  await cache.put(`message:${threadId}:${userId}:answer`, answer, { expirationTtl: 3600 });
}

export async function getMessageFromCache(cache: KVNamespace, threadId: string, userId: string): Promise<{ message: string; answer: string } | null> {
  const message = await cache.get(`message:${threadId}:${userId}:question`);
  const answer = await cache.get(`message:${threadId}:${userId}:answer`);
  if (message && answer) return { message, answer };
  return null;
}
