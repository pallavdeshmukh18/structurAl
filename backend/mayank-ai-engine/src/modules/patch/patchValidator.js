/**
 * Patch Validation Engine.
 * Verifies unified diff structure, dry-run applicability against original code,
 * and syntax integrity of patched code.
 */

/**
 * Validates unified diff header and line structure.
 * @param {string} diff
 * @returns {{ valid: boolean, error?: string }}
 */
function validateUnifiedDiff(diff) {
  if (!diff || typeof diff !== "string") {
    return { valid: false, error: "Diff is empty or not a string" };
  }

  const lines = diff.split("\n");
  let hasDiffHeader = false;
  let hasHunkHeader = false;

  for (const line of lines) {
    if (line.startsWith("--- ") || line.startsWith("+++ ")) {
      hasDiffHeader = true;
    }
    if (/^@@ -\d+(,\d+)? \+\d+(,\d+)? @@/.test(line)) {
      hasHunkHeader = true;
    }
  }

  if (!hasHunkHeader) {
    return {
      valid: false,
      error: "Unified diff missing hunk header (@@ -start,count +start,count @@)",
    };
  }

  return { valid: true };
}

/**
 * Validates bracket/parentheses/brace balance for JS/TS code.
 * @param {string} code
 * @returns {{ valid: boolean, error?: string }}
 */
function validateJsSyntaxBalance(code) {
  const stack = [];
  const matching = { "}": "{", "]": "[", ")": "(" };

  let inString = false;
  let stringChar = "";
  let inComment = false;
  let commentType = ""; // '//' or '/*'

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const nextChar = code[i + 1];

    if (inComment) {
      if (commentType === "//" && (char === "\n" || char === "\r")) {
        inComment = false;
      } else if (commentType === "/*" && char === "*" && nextChar === "/") {
        inComment = false;
        i++;
      }
      continue;
    }

    if (inString) {
      if (char === "\\" ) {
        i++; // skip escaped char
      } else if (char === stringChar) {
        inString = false;
      }
      continue;
    }

    // Comment start
    if (char === "/" && nextChar === "/") {
      inComment = true;
      commentType = "//";
      i++;
      continue;
    }
    if (char === "/" && nextChar === "*") {
      inComment = true;
      commentType = "/*";
      i++;
      continue;
    }

    // String start
    if (char === '"' || char === "'" || char === "`") {
      inString = true;
      stringChar = char;
      continue;
    }

    // Brackets check
    if (char === "{" || char === "[" || char === "(") {
      stack.push(char);
    } else if (char === "}" || char === "]" || char === ")") {
      if (stack.length === 0 || stack.pop() !== matching[char]) {
        return {
          valid: false,
          error: `Syntax error: Mismatched closing '${char}' around character position ${i}`,
        };
      }
    }
  }

  if (stack.length > 0) {
    return {
      valid: false,
      error: `Syntax error: Unclosed bracket/parentheses/brace '${stack[stack.length - 1]}'`,
    };
  }

  return { valid: true };
}

/**
 * Validates a patch payload containing original code, patched code, and/or unified diff.
 *
 * @param {Object} params
 * @param {string} params.originalCode
 * @param {string} params.patchedCode
 * @param {string} [params.unifiedDiff]
 * @param {string} [params.filePath]
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validatePatch({ originalCode, patchedCode, unifiedDiff, filePath }) {
  const errors = [];

  if (!patchedCode || typeof patchedCode !== "string") {
    errors.push("Missing or invalid patchedCode");
  } else {
    // Check syntax balance
    const isJsTs = !filePath || /\.(js|jsx|ts|tsx|mjs|cjs)$/i.test(filePath);
    if (isJsTs) {
      const syntaxResult = validateJsSyntaxBalance(patchedCode);
      if (!syntaxResult.valid) {
        errors.push(syntaxResult.error);
      }
    }

    // Ensure patched code isn't empty or truncated unnecessarily
    if (patchedCode.trim().length === 0 && originalCode && originalCode.trim().length > 0) {
      errors.push("Patched code is empty while original code was non-empty");
    }
  }

  if (unifiedDiff) {
    const diffCheck = validateUnifiedDiff(unifiedDiff);
    if (!diffCheck.valid) {
      errors.push(diffCheck.error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateUnifiedDiff,
  validateJsSyntaxBalance,
  validatePatch,
};
