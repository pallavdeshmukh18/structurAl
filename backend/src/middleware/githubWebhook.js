const crypto = require("crypto");

/**
 * Middleware to verify GitHub webhook HMAC-SHA256 signature
 */
const verifyGitHubSignature = (req, res, next) => {
  const signatureHeader = req.headers["x-hub-signature-256"];

  if (!signatureHeader) {
    return res.status(401).json({ error: "Missing signature header" });
  }

  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error("GITHUB_WEBHOOK_SECRET environment variable is not configured.");
    return res.status(500).json({ error: "Server webhook configuration error" });
  }

  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody);
  const expectedSignature = `sha256=${hmac.digest("hex")}`;

  const sigBuffer = Buffer.from(signatureHeader);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  next();
};

module.exports = {
  verifyGitHubSignature,
};
