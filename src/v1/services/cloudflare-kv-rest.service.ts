// src/v1/services/cloudflare-kv-rest.service.ts
import { sleep, backoff } from '../utils/retry';

export interface KVRestClient {
  get(key: string, type?: 'text' | 'json' | 'arrayBuffer'): Promise<any>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { expirationTtl?: number; metadata?: any }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
    keys: { name: string; metadata?: any }[];
    list_complete: boolean;
    cursor?: string;
  }>;
}

export function createKVRestClient(
  accountId: string,
  apiToken: string,
  namespaceId: string
): KVRestClient {
  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`;

  return {
    async get(key: string, type: 'text' | 'json' | 'arrayBuffer' = 'text'): Promise<any> {
      let attempt = 0;
      const maxAttempts = 3;
      const url = `${baseUrl}/values/${encodeURIComponent(key)}`;

      for (;;) {
        try {
          attempt++;
          const res = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${apiToken}`,
            },
          });

          if (res.status === 404) {
            return null;
          }

          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            throw new Error(`Cloudflare KV GET API Error (${res.status}): ${errText}`);
          }

          if (type === 'json') {
            return await res.json();
          } else if (type === 'arrayBuffer') {
            return await res.arrayBuffer();
          }
          return await res.text();
        } catch (err: any) {
          if (attempt >= maxAttempts) {
            console.error(`[KVREST] GET failed after ${attempt} attempts:`, err?.message || err);
            throw err;
          }
          const delay = backoff(attempt);
          await sleep(delay);
        }
      }
    },

    async put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { expirationTtl?: number; metadata?: any }): Promise<void> {
      let attempt = 0;
      const maxAttempts = 3;
      let url = `${baseUrl}/values/${encodeURIComponent(key)}`;

      if (options?.expirationTtl) {
        url += `?expiration_ttl=${options.expirationTtl}`;
      }

      for (;;) {
        try {
          attempt++;
          
          let bodyPayload: any = value;
          const headers: Record<string, string> = {
            Authorization: `Bearer ${apiToken}`,
          };
          
          if (options?.metadata) {
            // Send as multipart/form-data when metadata is present
            const formData = new FormData();
            formData.append('metadata', JSON.stringify(options.metadata));
            formData.append('value', value as any);
            bodyPayload = formData;
          }

          const res = await fetch(url, {
            method: 'PUT',
            headers,
            body: bodyPayload,
          });

          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            throw new Error(`Cloudflare KV PUT API Error (${res.status}): ${errText}`);
          }

          const data: any = await res.json();
          if (!data.success) {
            throw new Error(`KV PUT Error: ${JSON.stringify(data.errors)}`);
          }

          return;
        } catch (err: any) {
          if (attempt >= maxAttempts) {
            console.error(`[KVREST] PUT failed after ${attempt} attempts:`, err?.message || err);
            throw err;
          }
          const delay = backoff(attempt);
          await sleep(delay);
        }
      }
    },

    async delete(key: string): Promise<void> {
      let attempt = 0;
      const maxAttempts = 3;
      const url = `${baseUrl}/values/${encodeURIComponent(key)}`;

      for (;;) {
        try {
          attempt++;
          const res = await fetch(url, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${apiToken}`,
            },
          });

          if (res.status === 404) {
            return;
          }

          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            throw new Error(`Cloudflare KV DELETE API Error (${res.status}): ${errText}`);
          }

          const data: any = await res.json();
          if (!data.success) {
            throw new Error(`KV DELETE Error: ${JSON.stringify(data.errors)}`);
          }

          return;
        } catch (err: any) {
          if (attempt >= maxAttempts) {
            console.error(`[KVREST] DELETE failed after ${attempt} attempts:`, err?.message || err);
            throw err;
          }
          const delay = backoff(attempt);
          await sleep(delay);
        }
      }
    },

    async list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
      keys: { name: string; metadata?: any }[];
      list_complete: boolean;
      cursor?: string;
    }> {
      let attempt = 0;
      const maxAttempts = 3;
      
      const queryParams = new URLSearchParams();
      if (options?.prefix) queryParams.append('prefix', options.prefix);
      if (options?.limit) queryParams.append('limit', options.limit.toString());
      if (options?.cursor) queryParams.append('cursor', options.cursor);

      const qs = queryParams.toString();
      const url = `${baseUrl}/keys${qs ? '?' + qs : ''}`;

      for (;;) {
        try {
          attempt++;
          const res = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${apiToken}`,
            },
          });

          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            throw new Error(`Cloudflare KV LIST API Error (${res.status}): ${errText}`);
          }

          const data: any = await res.json();
          if (!data.success) {
            throw new Error(`KV LIST Error: ${JSON.stringify(data.errors)}`);
          }

          return {
            keys: data.result || [],
            list_complete: !data.result_info?.cursor,
            cursor: data.result_info?.cursor,
          };
        } catch (err: any) {
          if (attempt >= maxAttempts) {
            console.error(`[KVREST] LIST failed after ${attempt} attempts:`, err?.message || err);
            throw err;
          }
          const delay = backoff(attempt);
          await sleep(delay);
        }
      }
    }
  };
}
