import { afterEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, SecretError } from "@/server/crypto";

const original = process.env.APP_SECRET;
afterEach(() => {
  process.env.APP_SECRET = original;
});

describe("secrets", () => {
  it("round-trips and never stores the plain value", () => {
    process.env.APP_SECRET = "a-test-secret-that-is-long-enough";
    const enc = encryptSecret("sk-or-v1-abcdef");
    expect(enc).not.toContain("abcdef");
    expect(decryptSecret(enc)).toBe("sk-or-v1-abcdef");
  });

  it("returns null when the secret changed or the value is corrupt", () => {
    process.env.APP_SECRET = "a-test-secret-that-is-long-enough";
    const enc = encryptSecret("value");
    process.env.APP_SECRET = "a-different-secret-entirely-123";
    expect(decryptSecret(enc)).toBeNull();
    expect(decryptSecret("garbage")).toBeNull();
  });

  it("refuses to encrypt without a strong APP_SECRET", () => {
    delete process.env.APP_SECRET;
    expect(() => encryptSecret("x")).toThrow(SecretError);
    process.env.APP_SECRET = "short";
    expect(() => encryptSecret("x")).toThrow(/APP_SECRET/);
  });
});
