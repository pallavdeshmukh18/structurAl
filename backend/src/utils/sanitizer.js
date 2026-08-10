/**
 * Utility to sanitize sensitive tokens, keys, credentials and headers from error messages and logs
 */

const SENSITIVE_PATTERNS = [
  // GitHub tokens (personal access tokens, OAuth tokens, app installation tokens)
  /ghp_[a-zA-Z0-9]{20,255}/gi,
  /gho_[a-zA-Z0-9]{20,255}/gi,
  /ghu_[a-zA-Z0-9]{20,255}/gi,
  /ghs_[a-zA-Z0-9]{20,255}/gi,
  /ghr_[a-zA-Z0-9]{20,255}/gi,
  /github_pat_[a-zA-Z0-9_]{20,255}/gi,

  // Authorization headers and Bearer tokens
  /bearer\s+[a-zA-Z0-9_\-\.]{15,}/gi,
  /authorization:\s*['"]?[^'",\n\r]+['"]?/gi,

  // URLs containing basic auth credentials (https://user:password@...)
  /(https?:\/\/)[^:\s\/]+:[^@\s\/]+@/gi,

  // JSON Web Tokens
  /eyJ[a-zA-Z0-9_\-]{10,}\.eyJ[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}/gi,

  // Generic secret / token key-value pairs
  /(token|secret|password|access_token|private_key|apiKey)\s*[:=]\s*['"]?[a-zA-Z0-9_\-\.\/+=]{8,}['"]?/gi,

  // RSA / Private keys
  /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/gi,
];

/**
 * Sanitize a message or error string by stripping all sensitive data
 * @param {string|Error|object} input
 * @returns {string} Clean, sanitized string safe for storage and logging
 */
const sanitizeError = (input) => {
  if (!input) return "";

  let text = "";
  if (typeof input === "string") {
    text = input;
  } else if (input instanceof Error) {
    text = input.message || input.toString();
  } else if (typeof input === "object") {
    try {
      text = JSON.stringify(input);
    } catch {
      text = String(input);
    }
  } else {
    text = String(input);
  }

  for (const pattern of SENSITIVE_PATTERNS) {
    text = text.replace(pattern, "[REDACTED_CREDENTIAL]");
  }

  // Remove potential full URL query params with tokens
  text = text.replace(/([?&](?:access_token|token|key|secret)=)[^&\s]+/gi, "$1[REDACTED]");

  return text.trim();
};

module.exports = {
  sanitizeError,
};
