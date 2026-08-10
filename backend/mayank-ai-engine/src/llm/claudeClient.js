const Anthropic = require("@anthropic-ai/sdk");
const { ANTHROPIC_API_KEY, CLAUDE_MODEL, DEBUG_LLM } = require("../config/env");

const isDummyKey = !ANTHROPIC_API_KEY || ANTHROPIC_API_KEY.includes("xxxxxxxx");
const client = !isDummyKey ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

/**
 * Strips markdown code fences if the model wraps its JSON in ```json ... ```
 */
function stripFences(text) {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

/**
 * Fallback mock generator for dev/testing when ANTHROPIC_API_KEY is not set.
 */
function generateMockResponse(system, user) {
  const isRca = system.includes("Root Cause Analysis");
  const isPatch = system.includes("Patch Generator");
  const isSlop = system.includes("Slop") || system.includes("Code Health");

  if (isRca) {
    return {
      rootCause: "Unchecked property access on undefined object",
      explanation: "The order parameter or its properties were accessed before verifying object existence, triggering a runtime TypeError.",
      confidence: "HIGH",
      failedLocation: {
        file: "src/services/payment.js",
        line: 16,
        functionName: "processPayment",
      },
      suggestedFixDescription: "Add nullish coalescing / optional chaining or explicit parameter validation before invoking payment gateway.",
    };
  }

  if (isPatch) {
    let patchedCode = user;
    if (user.includes("ORIGINAL SOURCE CODE:\n")) {
      const parts = user.split("ORIGINAL SOURCE CODE:\n");
      if (parts[1]) {
        patchedCode = parts[1].split("\n\nISSUE DESCRIPTION")[0];
      }
    }

    // Add safe null checks to patched code if missing
    if (!patchedCode.includes("if (!order")) {
      patchedCode = patchedCode.replace(
        "async function processPayment(order) {",
        "async function processPayment(order) {\n  if (!order || !order.cardToken) {\n    throw new Error('Invalid order payload: missing cardToken');\n  }"
      );
    }

    return {
      explanation: "Added robust guard clauses and input validation for order and cardToken.",
      patchedCode,
      unifiedDiff: `--- a/src/services/payment.js\n+++ b/src/services/payment.js\n@@ -1,5 +1,8 @@\n async function processPayment(order) {\n+  if (!order || !order.cardToken) {\n+    throw new Error('Invalid order payload: missing cardToken');\n+  }\n   const amount = order.total;`,
      changesSummary: [
        "Added guard clause for undefined order object",
        "Validated presence of cardToken before charging card",
      ],
    };
  }

  if (isSlop) {
    return {
      codeHealth: {
        overall: 85,
        complexity: 88,
        maintainability: 82,
        errorHandling: 76,
        duplication: 90,
        aiSlop: 84,
      },
      findings: [
        {
          severity: "MEDIUM",
          file: "src/services/payment.js",
          line: 18,
          category: "error-handling",
          message: "Empty catch block silently suppressing payment errors.",
        },
      ],
    };
  }

  // Default PR Review Mock
  return {
    score: 82,
    findings: [
      {
        severity: "HIGH",
        file: "src/services/payment.js",
        line: 13,
        category: "security",
        message: "Hardcoded API key detected in payment service.",
      },
      {
        severity: "MEDIUM",
        file: "src/services/payment.js",
        line: 18,
        category: "error-handling",
        message: "Swallowing exceptions in empty catch block.",
      },
    ],
  };
}

/**
 * Calls Claude or returns mock response if API key is not configured.
 */
async function askForJson({ system, user, maxTokens = 2000, retries = 1 }) {
  if (isDummyKey) {
    if (DEBUG_LLM) {
      // eslint-disable-next-line no-console
      console.log("[claudeClient] Using mock response (ANTHROPIC_API_KEY not configured)");
    }
    return generateMockResponse(system, user);
  }

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const raw = textBlock ? textBlock.text : "";

    if (DEBUG_LLM) {
      // eslint-disable-next-line no-console
      console.log("[claudeClient] raw response:\n", raw);
    }

    try {
      return JSON.parse(stripFences(raw));
    } catch (err) {
      lastError = err;
      if (DEBUG_LLM) {
        // eslint-disable-next-line no-console
        console.warn(`[claudeClient] JSON parse failed (attempt ${attempt + 1}):`, err.message);
      }
    }
  }

  throw new Error(`Claude did not return valid JSON after ${retries + 1} attempt(s): ${lastError.message}`);
}

module.exports = { askForJson };
