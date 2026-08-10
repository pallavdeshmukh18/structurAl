const crypto = require("crypto");

/**
 * Get 32-byte key buffer from environment variable
 * @returns {Buffer}
 */
const getEncryptionKey = () => {
  const hexKey = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!hexKey) {
    throw new Error("GITHUB_TOKEN_ENCRYPTION_KEY environment variable is not set.");
  }
  const keyBuffer = Buffer.from(hexKey, "hex");
  if (keyBuffer.length !== 32) {
    throw new Error("GITHUB_TOKEN_ENCRYPTION_KEY must be a 32-byte (64 hex characters) string.");
  }
  return keyBuffer;
};

/**
 * Encrypt plaintext string using AES-256-GCM
 * @param {string} text
 * @returns {string} Formatted payload ivHex:authTagHex:encryptedHex
 */
const encrypt = (text) => {
  if (!text) {
    throw new Error("Cannot encrypt empty value.");
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
};

/**
 * Decrypt AES-256-GCM payload
 * @param {string} payload Formatted payload ivHex:authTagHex:encryptedHex
 * @returns {string} Decrypted plaintext string
 */
const decrypt = (payload) => {
  if (!payload || typeof payload !== "string") {
    throw new Error("Invalid payload for decryption.");
  }

  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encryption payload format.");
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};

module.exports = {
  encrypt,
  decrypt,
};
