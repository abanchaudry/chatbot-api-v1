// src/v1/utils/crypto.ts
// AES-GCM 256-bit encryption & decryption utilities using native Web Crypto API

/**
 * Derives an AES-GCM 256-bit CryptoKey from a string secret using SHA-256 digest.
 */
async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Converts a Uint8Array or ArrayBuffer to a Base64 string.
 */
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts a Base64 string to a Uint8Array.
 */
function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface EncryptedPayload {
  cipherText: string;
  iv: string;
}

/**
 * Encrypts a plaintext string using AES-GCM with a random 12-byte IV.
 */
export async function encryptSecret(plainText: string, masterKey: string): Promise<EncryptedPayload> {
  if (!plainText || !plainText.trim()) {
    return { cipherText: "", iv: "" };
  }

  const key = await getCryptoKey(masterKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  return {
    cipherText: bufferToBase64(encrypted),
    iv: bufferToBase64(iv),
  };
}

/**
 * Decrypts an AES-GCM encrypted payload back to plaintext.
 */
export async function decryptSecret(cipherText: string, iv: string, masterKey: string): Promise<string> {
  if (!cipherText || !iv) {
    return "";
  }

  try {
    const key = await getCryptoKey(masterKey);
    const ivBuffer = base64ToBuffer(iv);
    const cipherBuffer = base64ToBuffer(cipherText);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBuffer },
      key,
      cipherBuffer
    );

    return new TextDecoder().decode(decrypted);
  } catch (err: any) {
    console.error("Failed to decrypt secret:", err?.message || err);
    throw new Error("Secret decryption failed. Invalid key or corrupted payload.");
  }
}

/**
 * Helper to mask sensitive keys for display in UI (e.g. "sk-proj-...1234")
 */
export function maskApiKey(key: string): string {
  if (!key) return "";
  const trimmed = key.trim();
  if (trimmed.length <= 8) return "********";
  return `${trimmed.slice(0, 7)}...${trimmed.slice(-4)}`;
}
