/**
 * AES-256-GCM encryption for sensitive data at rest.
 * Supports key versioning for rotation: DATA_ENCRYPTION_KEY_V1, DATA_ENCRYPTION_KEY_V2.
 * Encrypt uses the latest key; decrypt tries the version in the payload, then falls back to older keys.
 * Output format: JSON { v: number, data: string } where data is base64(iv||ciphertext||tag).
 * Legacy: values starting with "enc:" (no JSON) are treated as v1.
 */

import * as crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

const PREFIX_LEGACY = "enc:";
const MAX_KEY_VERSION = 2;

function parseKey(raw: string | undefined): Buffer | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    if (trimmed.length === 64 && /^[0-9a-fA-F]+$/.test(trimmed)) {
      return Buffer.from(trimmed, "hex");
    }
    return Buffer.from(trimmed, "base64");
  } catch {
    return null;
  }
}

function getKeyForVersion(version: number): Buffer | null {
  const envKey = version === 1 ? "DATA_ENCRYPTION_KEY_V1" : "DATA_ENCRYPTION_KEY_V2";
  let raw = process.env[envKey];
  if (version === 1 && !raw) raw = process.env.DATA_ENCRYPTION_KEY;
  const k = parseKey(raw);
  return k && k.length === KEY_LENGTH ? k : null;
}

export function getLatestEncryptionVersion(): number {
  for (let v = MAX_KEY_VERSION; v >= 1; v--) {
    if (getKeyForVersion(v)) return v;
  }
  return 0;
}

function getLatestKey(): Buffer | null {
  const v = getLatestEncryptionVersion();
  return v ? getKeyForVersion(v) : null;
}

function encryptWithKey(text: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, enc, tag]).toString("base64");
}

function decryptWithKey(ciphertext: string, key: Buffer): string {
  const raw = Buffer.from(ciphertext, "base64");
  if (raw.length < IV_LENGTH + AUTH_TAG_LENGTH) throw new Error("Invalid ciphertext length");
  const iv = raw.subarray(0, IV_LENGTH);
  const tag = raw.subarray(raw.length - AUTH_TAG_LENGTH);
  const enc = raw.subarray(IV_LENGTH, raw.length - AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(tag);
  return decipher.update(enc) + decipher.final("utf8");
}

export type EncryptedPayload = { v: number; data: string };

/**
 * Encrypt a string. Returns JSON string of { v: number, data: encryptedBase64 }.
 * Uses the latest configured key version. If no key is set, returns plaintext unchanged.
 */
export function encrypt(text: string): string {
  const key = getLatestKey();
  if (!key) return text;

  const version = getLatestEncryptionVersion();
  const data = encryptWithKey(text, key);
  return JSON.stringify({ v: version, data } satisfies EncryptedPayload);
}

/**
 * Decrypt a string. Supports:
 * - Versioned payload: JSON { v: number, data: string } — uses key for that version.
 * - Legacy: "enc:" + base64 — uses V1 or DATA_ENCRYPTION_KEY.
 * If value is not encrypted, returns as-is.
 */
export function decrypt(text: string): string {
  if (!text || typeof text !== "string") return text;

  if (text.startsWith(PREFIX_LEGACY)) {
    const rest = text.slice(PREFIX_LEGACY.length);
    if (rest.startsWith("{")) {
      try {
        const payload = JSON.parse(rest) as EncryptedPayload;
        if (typeof payload.v === "number" && typeof payload.data === "string") {
          const key = getKeyForVersion(payload.v);
          if (key) return decryptWithKey(payload.data, key);
        }
      } catch {
        // fall through to legacy
      }
    }
    const key = getKeyForVersion(1);
    if (key) return decryptWithKey(rest, key);
    return text;
  }

  if (text.startsWith("{")) {
    try {
      const payload = JSON.parse(text) as EncryptedPayload;
      if (typeof payload.v === "number" && typeof payload.data === "string") {
        const key = getKeyForVersion(payload.v);
        if (key) return decryptWithKey(payload.data, key);
      }
    } catch {
      // not our payload
    }
  }

  return text;
}

export function isEncryptionEnabled(): boolean {
  return getLatestKey() !== null;
}
