import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

export class SecretError extends Error {}

const SALT = "easy-learn/secrets/v1";

function key(): Buffer {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 24) throw new SecretError("Set APP_SECRET (24+ random characters) to store API keys");
  return scryptSync(secret, SALT, 32);
}

/** AES-256-GCM; output is `v1.<iv>.<tag>.<ciphertext>` in base64url. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), data].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

/** Returns null when the value cannot be decrypted (corrupt, or APP_SECRET changed). */
export function decryptSecret(value: string): string | null {
  try {
    const [v, iv, tag, data] = value.split(".");
    if (v !== "v1" || !iv || !tag || !data) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
