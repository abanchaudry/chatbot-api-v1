// src/v1/services/db/client-secrets.db.ts
import type { D1Database } from "@cloudflare/workers-types";
import { encryptSecret, decryptSecret, maskApiKey } from "../../utils/crypto";

export interface EncryptedClientSecretsRow {
  client_id: string;
  openai_api_key_encrypted?: string | null;
  openai_api_key_iv?: string | null;
  cf_account_id?: string | null;
  cf_api_token_encrypted?: string | null;
  cf_api_token_iv?: string | null;
  updated_at?: string;
}

export interface DecryptedClientSecrets {
  client_id: string;
  openai_api_key?: string;
  openai_api_key_masked?: string;
  cf_account_id?: string;
  cf_api_token?: string;
  cf_api_token_masked?: string;
  has_openai_key: boolean;
  has_cf_token: boolean;
  updated_at?: string;
}

export const clientSecretsDb = {
  async getRawSecrets(db: D1Database, clientId: string): Promise<EncryptedClientSecretsRow | null> {
    try {
      const row = await db
        .prepare("SELECT * FROM client_secrets WHERE client_id = ? LIMIT 1")
        .bind(clientId)
        .first<EncryptedClientSecretsRow>();
      return row || null;
    } catch (err: any) {
      console.error("clientSecretsDb.getRawSecrets error:", err?.message || err);
      return null;
    }
  },

  async getDecryptedSecrets(
    db: D1Database,
    clientId: string,
    masterKey: string
  ): Promise<DecryptedClientSecrets> {
    const raw = await this.getRawSecrets(db, clientId);
    if (!raw) {
      return {
        client_id: clientId,
        has_openai_key: false,
        has_cf_token: false,
      };
    }

    let openaiKey = "";
    if (raw.openai_api_key_encrypted && raw.openai_api_key_iv) {
      try {
        openaiKey = await decryptSecret(raw.openai_api_key_encrypted, raw.openai_api_key_iv, masterKey);
      } catch (err) {
        console.warn("Failed to decrypt OpenAI key for client:", clientId);
      }
    }

    let cfToken = "";
    if (raw.cf_api_token_encrypted && raw.cf_api_token_iv) {
      try {
        cfToken = await decryptSecret(raw.cf_api_token_encrypted, raw.cf_api_token_iv, masterKey);
      } catch (err) {
        console.warn("Failed to decrypt Cloudflare token for client:", clientId);
      }
    }

    return {
      client_id: clientId,
      openai_api_key: openaiKey,
      openai_api_key_masked: maskApiKey(openaiKey),
      cf_account_id: raw.cf_account_id || "",
      cf_api_token: cfToken,
      cf_api_token_masked: maskApiKey(cfToken),
      has_openai_key: Boolean(openaiKey),
      has_cf_token: Boolean(cfToken),
      updated_at: raw.updated_at,
    };
  },

  async saveSecrets(
    db: D1Database,
    clientId: string,
    secrets: {
      openai_api_key?: string;
      cf_account_id?: string;
      cf_api_token?: string;
    },
    masterKey: string
  ): Promise<void> {
    const current = await this.getRawSecrets(db, clientId);

    let openaiEncrypted = current?.openai_api_key_encrypted || null;
    let openaiIv = current?.openai_api_key_iv || null;

    if (secrets.openai_api_key !== undefined) {
      if (secrets.openai_api_key.trim()) {
        const enc = await encryptSecret(secrets.openai_api_key.trim(), masterKey);
        openaiEncrypted = enc.cipherText;
        openaiIv = enc.iv;
      } else {
        openaiEncrypted = null;
        openaiIv = null;
      }
    }

    let cfTokenEncrypted = current?.cf_api_token_encrypted || null;
    let cfTokenIv = current?.cf_api_token_iv || null;

    if (secrets.cf_api_token !== undefined) {
      if (secrets.cf_api_token.trim()) {
        const enc = await encryptSecret(secrets.cf_api_token.trim(), masterKey);
        cfTokenEncrypted = enc.cipherText;
        cfTokenIv = enc.iv;
      } else {
        cfTokenEncrypted = null;
        cfTokenIv = null;
      }
    }

    const cfAccountId = secrets.cf_account_id !== undefined ? secrets.cf_account_id.trim() || null : current?.cf_account_id || null;

    await db
      .prepare(
        `INSERT INTO client_secrets (client_id, openai_api_key_encrypted, openai_api_key_iv, cf_account_id, cf_api_token_encrypted, cf_api_token_iv, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(client_id) DO UPDATE SET
           openai_api_key_encrypted = excluded.openai_api_key_encrypted,
           openai_api_key_iv = excluded.openai_api_key_iv,
           cf_account_id = excluded.cf_account_id,
           cf_api_token_encrypted = excluded.cf_api_token_encrypted,
           cf_api_token_iv = excluded.cf_api_token_iv,
           updated_at = CURRENT_TIMESTAMP`
      )
      .bind(clientId, openaiEncrypted, openaiIv, cfAccountId, cfTokenEncrypted, cfTokenIv)
      .run();
  },

  async deleteSecrets(db: D1Database, clientId: string): Promise<void> {
    await db.prepare("DELETE FROM client_secrets WHERE client_id = ?").bind(clientId).run();
  }
};
