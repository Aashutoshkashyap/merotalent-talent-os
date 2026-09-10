import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { ServerConfigurationError } from "./supabase";

export interface EncryptedSecret {
  ciphertext: string;
  iv: string;
  tag: string;
}

const loadEncryptionKey = (environment: Record<string, string | undefined> = process.env) => {
  const encoded = environment.PROVIDER_CONFIG_ENCRYPTION_KEY;
  if (!encoded) {
    throw new ServerConfigurationError(
      "Secure provider-secret storage is not configured.",
    );
  }
  const key = Buffer.from(encoded, "base64");
  if (key.byteLength !== 32) {
    throw new ServerConfigurationError(
      "Secure provider-secret storage is misconfigured.",
    );
  }
  return key;
};

export const isSecretStorageConfigured = (
  environment: Record<string, string | undefined> = process.env,
) => {
  try {
    loadEncryptionKey(environment);
    return true;
  } catch {
    return false;
  }
};

export function encryptProviderSecret(
  secret: string,
  environment: Record<string, string | undefined> = process.env,
): EncryptedSecret {
  if (!secret || secret.length > 16_384) {
    throw new Error("Provider secret must contain 1 to 16384 characters.");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", loadEncryptionKey(environment), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptProviderSecret(
  encrypted: EncryptedSecret,
  environment: Record<string, string | undefined> = process.env,
): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    loadEncryptionKey(environment),
    Buffer.from(encrypted.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(encrypted.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
