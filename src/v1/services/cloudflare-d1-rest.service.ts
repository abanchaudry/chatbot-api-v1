// src/v1/services/cloudflare-d1-rest.service.ts
import { sleep, backoff } from '../utils/retry';

export interface D1RestClient {
  prepare(sql: string): D1RestPreparedStatement;
  batch(statements: D1RestPreparedStatement[]): Promise<any[]>;
  exec(sql: string): Promise<any>;
}

export interface D1RestPreparedStatement {
  bind(...values: any[]): D1RestPreparedStatement;
  first<T = any>(column?: string): Promise<T | null>;
  all<T = any>(): Promise<{ results: T[]; success: boolean; meta?: any }>;
  run(): Promise<{ success: boolean; meta?: any }>;
  raw<T = any>(): Promise<T[]>;
}

export function createD1RestClient(
  accountId: string,
  apiToken: string,
  databaseId: string
): D1RestClient {
  const queryUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  async function executeRestQuery(payload: { sql: string; params?: any[] } | { sql: string; params?: any[] }[]): Promise<any> {
    let attempt = 0;
    const maxAttempts = 3;

    for (;;) {
      try {
        attempt++;
        const res = await fetch(queryUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(Array.isArray(payload) ? payload : [payload]),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(`Cloudflare D1 Query API Error (${res.status}): ${errText}`);
        }

        const data: any = await res.json();
        if (!data.success && data.errors && data.errors.length > 0) {
          throw new Error(`D1 API Error: ${data.errors.map((e: any) => e.message).join(", ")}`);
        }

        return data.result;
      } catch (err: any) {
        if (attempt >= maxAttempts) {
          console.error(`[D1REST] Query failed after ${attempt} attempts:`, err?.message || err);
          throw err;
        }
        const delay = backoff(attempt);
        await sleep(delay);
      }
    }
  }

  class PreparedStatement implements D1RestPreparedStatement {
    private sql: string;
    private params: any[];

    constructor(sql: string, params: any[] = []) {
      this.sql = sql;
      this.params = params;
    }

    bind(...values: any[]): D1RestPreparedStatement {
      return new PreparedStatement(this.sql, values);
    }

    async first<T = any>(column?: string): Promise<T | null> {
      const results = await executeRestQuery({ sql: this.sql, params: this.params });
      const rows = results[0]?.results || [];
      if (rows.length === 0) return null;
      if (column) {
        return rows[0][column] !== undefined ? rows[0][column] as T : null;
      }
      return rows[0] as T;
    }

    async all<T = any>(): Promise<{ results: T[]; success: boolean; meta?: any }> {
      const results = await executeRestQuery({ sql: this.sql, params: this.params });
      const res = results[0] || {};
      return {
        results: res.results || [],
        success: res.success !== false,
        meta: res.meta,
      };
    }

    async run(): Promise<{ success: boolean; meta?: any }> {
      const results = await executeRestQuery({ sql: this.sql, params: this.params });
      const res = results[0] || {};
      return {
        success: res.success !== false,
        meta: res.meta,
      };
    }

    async raw<T = any>(): Promise<T[]> {
      const results = await executeRestQuery({ sql: this.sql, params: this.params });
      const rows = results[0]?.results || [];
      return rows.map((r: any) => Object.values(r)) as T[];
    }

    getStatementData() {
      return { sql: this.sql, params: this.params };
    }
  }

  return {
    prepare(sql: string): D1RestPreparedStatement {
      return new PreparedStatement(sql);
    },
    async batch(statements: D1RestPreparedStatement[]): Promise<any[]> {
      const payload = statements.map(s => (s as PreparedStatement).getStatementData());
      const results = await executeRestQuery(payload);
      return results.map((r: any) => ({
        results: r.results || [],
        success: r.success !== false,
        meta: r.meta
      }));
    },
    async exec(sql: string): Promise<any> {
      const results = await executeRestQuery({ sql });
      const res = results[0] || {};
      return {
        count: res.meta?.changes || 0,
        duration: res.meta?.duration || 0
      };
    }
  };
}
