const crypto = require("crypto");

/**
 * Supported source code languages and file extensions
 */
const EXTENSION_MAP = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".py": "python",
  ".go": "go",
  ".c": "cpp",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".h": "cpp",
  ".hpp": "cpp",
  ".hh": "cpp",
  ".java": "java",
  ".rs": "rust",
  ".rb": "ruby",
  ".php": "php",
  ".cs": "csharp",
  ".sh": "bash",
  ".bash": "bash",
  ".zsh": "bash",
  ".sol": "solidity",
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".md": "markdown",
  ".sql": "sql",
  ".html": "html",
  ".css": "css",
  ".scss": "css",
  ".toml": "toml",
  ".xml": "xml",
};

/**
 * Ignored directories and non-source files
 */
const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  "out",
  ".cache",
  ".turbo",
  ".venv",
  "venv",
  "__pycache__",
  "vendor",
  "bin",
  "obj",
  ".idea",
  ".vscode",
]);

const IGNORED_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
  ".pdf", ".zip", ".tar", ".gz", ".7z", ".rar",
  ".exe", ".dll", ".so", ".dylib", ".bin",
  ".lock", ".wasm", ".map", ".min.js", ".min.css",
  ".mp4", ".mp3", ".wav", ".avi",
  ".ttf", ".woff", ".woff2", ".eot",
]);

/**
 * Check if a file should be ignored during indexing
 */
const shouldIgnorePath = (filePath) => {
  if (!filePath) return true;

  const parts = filePath.split("/").filter(Boolean);
  for (const part of parts) {
    if (IGNORED_DIRECTORIES.has(part)) {
      return true;
    }
  }

  const lastDot = filePath.lastIndexOf(".");
  if (lastDot !== -1) {
    const ext = filePath.slice(lastDot).toLowerCase();
    if (IGNORED_EXTENSIONS.has(ext)) {
      return true;
    }
  }

  return false;
};

/**
 * Detect language from file path
 */
const detectLanguage = (filePath) => {
  if (!filePath) return "text";
  const lastDot = filePath.lastIndexOf(".");
  if (lastDot === -1) return "text";
  const ext = filePath.slice(lastDot).toLowerCase();
  return EXTENSION_MAP[ext] || "text";
};

/**
 * Calculate SHA-256 hash of code snippet
 */
const computeCodeHash = (text) => {
  if (!text) return null;
  return crypto.createHash("sha256").update(text.trim()).digest("hex");
};

/**
 * Tree-sitter Loader helper (gracefully attempts to load native modules)
 */
let TreeSitter = null;
let TreeSitterJS = null;
let TreeSitterTS = null;
let TreeSitterPython = null;
let TreeSitterGo = null;

try {
  TreeSitter = require("tree-sitter");
  try { TreeSitterJS = require("tree-sitter-javascript"); } catch (_) {}
  try {
    const tsPkg = require("tree-sitter-typescript");
    TreeSitterTS = tsPkg.typescript || tsPkg;
  } catch (_) {}
  try { TreeSitterPython = require("tree-sitter-python"); } catch (_) {}
  try { TreeSitterGo = require("tree-sitter-go"); } catch (_) {}
} catch (_) {
  // Native tree-sitter not compiled or unavailable; fallback parser is activated
}

/**
 * Parse JavaScript / TypeScript source code
 */
function parseJavaScriptTypeScript(filePath, sourceCode, language) {
  const symbols = [];
  const relations = [];
  const lines = sourceCode.split("\n");

  // 1. Extract Imports
  // e.g., import { a, b } from './module'; const x = require('./x');
  const importRegex = /(?:import\s+(?:(?:\*\s+as\s+([a-zA-Z0-9_$]+)|{([^}]+)}|([a-zA-Z0-9_$]+))\s+from\s+['"]([^'"]+)['"])|(?:const|let|var)\s+(?:{([^}]+)}|([a-zA-Z0-9_$]+))\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\))/g;
  let match;
  while ((match = importRegex.exec(sourceCode)) !== null) {
    const importNamespace = match[1];
    const importNamed = match[2];
    const importDefault = match[3];
    const importPath = match[4] || match[7];
    const cjsNamed = match[5];
    const cjsDefault = match[6];

    const startLine = sourceCode.slice(0, match.index).split("\n").length;
    const importedItems = (importNamed || cjsNamed || importDefault || cjsDefault || importNamespace || "").trim();

    symbols.push({
      filePath,
      symbol: {
        name: importedItems ? `import { ${importedItems} } from '${importPath}'` : `import '${importPath}'`,
        type: "import",
        language,
      },
      location: {
        startLine,
        startColumn: 0,
        endLine: startLine,
        endColumn: match[0].length,
      },
      signature: match[0].trim(),
      metadata: {
        modulePath: importPath,
        importedItems: importedItems.split(",").map((s) => s.trim()).filter(Boolean),
      },
      codeHash: computeCodeHash(match[0]),
      rawRelation: {
        type: "IMPORTS",
        targetName: importPath,
        line: startLine,
      },
    });
  }

  // 2. Extract Classes & Interfaces
  // e.g., class MyClass extends BaseClass { ... }
  const classRegex = /(?:export\s+)?(?:abstract\s+)?(class|interface)\s+([a-zA-Z0-9_$]+)(?:\s+extends\s+([a-zA-Z0-9_$.]+))?(?:\s+implements\s+([a-zA-Z0-9_$,\s]+))?\s*\{/g;
  while ((match = classRegex.exec(sourceCode)) !== null) {
    const kind = match[1];
    const className = match[2];
    const extendsClass = match[3] || null;
    const implementsInterface = match[4] || null;
    const startLine = sourceCode.slice(0, match.index).split("\n").length;
    const isExported = match[0].startsWith("export");

    // Estimate class boundary
    let braceCount = 1;
    let endLine = startLine;
    let charIndex = match.index + match[0].length;
    while (charIndex < sourceCode.length && braceCount > 0) {
      if (sourceCode[charIndex] === "{") braceCount++;
      else if (sourceCode[charIndex] === "}") braceCount--;
      charIndex++;
    }
    endLine = sourceCode.slice(0, charIndex).split("\n").length;
    const classBody = sourceCode.slice(match.index, charIndex);

    const classSymbol = {
      filePath,
      symbol: {
        name: className,
        type: kind === "interface" ? "interface" : "class",
        language,
      },
      location: {
        startLine,
        startColumn: 0,
        endLine,
        endColumn: 1,
      },
      signature: match[0].replace(/\{$/, "").trim(),
      metadata: {
        exported: isExported,
        extends: extendsClass,
        implements: implementsInterface ? implementsInterface.split(",").map((s) => s.trim()) : [],
      },
      codeHash: computeCodeHash(classBody),
      tempId: `class:${className}:${startLine}`,
    };
    symbols.push(classSymbol);

    if (extendsClass) {
      relations.push({
        sourceTempId: classSymbol.tempId,
        relationType: "EXTENDS",
        targetName: extendsClass,
        line: startLine,
      });
    }

    if (implementsInterface) {
      implementsInterface.split(",").forEach((iface) => {
        relations.push({
          sourceTempId: classSymbol.tempId,
          relationType: "IMPLEMENTS",
          targetName: iface.trim(),
          line: startLine,
        });
      });
    }

    // 3. Extract Methods inside Class
    const methodRegex = /(?:(public|private|protected|static|async)\s+)*(?:([a-zA-Z0-9_$]+)\s*\(([^)]*)\)|constructor\s*\(([^)]*)\))\s*(?::\s*([a-zA-Z0-9_<>[\]|]+))?\s*\{/g;
    let methodMatch;
    while ((methodMatch = methodRegex.exec(classBody)) !== null) {
      const isConstructor = methodMatch[0].includes("constructor");
      const methodName = isConstructor ? "constructor" : methodMatch[2];
      if (!methodName || methodName === "if" || methodName === "for" || methodName === "while" || methodName === "switch") continue;

      const methodOffset = match.index + methodMatch.index;
      const methodStartLine = sourceCode.slice(0, methodOffset).split("\n").length;
      const isAsync = methodMatch[0].includes("async");
      const visibility = methodMatch[1] || "public";
      const params = methodMatch[3] || methodMatch[4] || "";

      symbols.push({
        filePath,
        symbol: {
          name: `${className}.${methodName}`,
          type: "method",
          language,
        },
        parentTempId: classSymbol.tempId,
        location: {
          startLine: methodStartLine,
          startColumn: 0,
          endLine: methodStartLine + 5,
          endColumn: 0,
        },
        signature: `${methodName}(${params.trim()})`,
        metadata: {
          async: isAsync,
          visibility,
          className,
        },
        codeHash: computeCodeHash(methodMatch[0]),
        tempId: `method:${className}.${methodName}:${methodStartLine}`,
      });
    }
  }

  // 4. Extract Functions (named, async, exported, const arrow functions)
  // e.g., function foo(a, b) { ... }, const bar = async (x) => { ... }
  const funcRegex = /(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)/g;
  while ((match = funcRegex.exec(sourceCode)) !== null) {
    const funcName = match[1];
    const params = match[2] || "";
    const startLine = sourceCode.slice(0, match.index).split("\n").length;
    const isExported = match[0].includes("export");
    const isAsync = match[0].includes("async");

    symbols.push({
      filePath,
      symbol: {
        name: funcName,
        type: "function",
        language,
      },
      location: {
        startLine,
        startColumn: 0,
        endLine: startLine + 10,
        endColumn: 0,
      },
      signature: `function ${funcName}(${params.trim()})`,
      metadata: {
        exported: isExported,
        async: isAsync,
      },
      codeHash: computeCodeHash(match[0]),
      tempId: `func:${funcName}:${startLine}`,
    });
  }

  // Arrow functions & assigned functions
  const arrowRegex = /(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:\(([^)]*)\)|([a-zA-Z0-9_$]+))\s*=>/g;
  while ((match = arrowRegex.exec(sourceCode)) !== null) {
    const funcName = match[1];
    const params = match[2] || match[3] || "";
    const startLine = sourceCode.slice(0, match.index).split("\n").length;
    const isExported = match[0].startsWith("export");
    const isAsync = match[0].includes("async");

    symbols.push({
      filePath,
      symbol: {
        name: funcName,
        type: "function",
        language,
      },
      location: {
        startLine,
        startColumn: 0,
        endLine: startLine + 10,
        endColumn: 0,
      },
      signature: `const ${funcName} = (${params.trim()}) =>`,
      metadata: {
        exported: isExported,
        async: isAsync,
      },
      codeHash: computeCodeHash(match[0]),
      tempId: `func:${funcName}:${startLine}`,
    });
  }

  // 5. Extract Route Handlers (Express / Fastify / Koa)
  // e.g. router.get("/users", handler), app.post("/api/login", loginCtrl)
  const routeRegex = /(?:app|router|server)\.(get|post|put|delete|patch|options|head|all)\(\s*['"]([^'"]+)['"]\s*,\s*([a-zA-Z0-9_$.]+)/g;
  while ((match = routeRegex.exec(sourceCode)) !== null) {
    const method = match[1].toUpperCase();
    const routePath = match[2];
    const handlerName = match[3];
    const startLine = sourceCode.slice(0, match.index).split("\n").length;

    const routeSymbol = {
      filePath,
      symbol: {
        name: `${method} ${routePath}`,
        type: "route",
        language,
      },
      location: {
        startLine,
        startColumn: 0,
        endLine: startLine,
        endColumn: match[0].length,
      },
      signature: match[0].trim(),
      metadata: {
        httpMethod: method,
        routePath,
        handler: handlerName,
      },
      codeHash: computeCodeHash(match[0]),
      tempId: `route:${method}:${routePath}:${startLine}`,
    };
    symbols.push(routeSymbol);

    relations.push({
      sourceTempId: routeSymbol.tempId,
      relationType: "ROUTES_TO",
      targetName: handlerName,
      line: startLine,
    });
  }

  // 6. Extract Function Calls
  // e.g. someService.getUser(), calculateTotal(a, b)
  const callRegex = /([a-zA-Z0-9_$]+(?:\.[a-zA-Z0-9_$]+)?)\s*\((?![^()]*\)\s*=>)/g;
  while ((match = callRegex.exec(sourceCode)) !== null) {
    const callee = match[1];
    if (
      callee === "if" ||
      callee === "for" ||
      callee === "while" ||
      callee === "switch" ||
      callee === "catch" ||
      callee === "require" ||
      callee === "import"
    ) {
      continue;
    }

    const callOffset = match.index;
    const callLine = sourceCode.slice(0, callOffset).split("\n").length;

    // Find enclosing function/method/class
    const caller = symbols
      .filter((s) => s.location.startLine <= callLine && s.location.endLine >= callLine && (s.symbol.type === "function" || s.symbol.type === "method"))
      .pop();

    if (caller) {
      relations.push({
        sourceTempId: caller.tempId,
        relationType: "CALLS",
        targetName: callee,
        line: callLine,
      });
    }
  }

  return { symbols, relations, lineCount: lines.length };
}

/**
 * Parse Python source code
 */
function parsePython(filePath, sourceCode) {
  const symbols = [];
  const relations = [];
  const lines = sourceCode.split("\n");

  // 1. Imports
  const importRegex = /(?:from\s+([a-zA-Z0-9_.]+)\s+import\s+([a-zA-Z0-9_,\s*]+)|import\s+([a-zA-Z0-9_.,\s]+))/g;
  let match;
  while ((match = importRegex.exec(sourceCode)) !== null) {
    const fromModule = match[1];
    const importedNames = match[2] || match[3];
    const startLine = sourceCode.slice(0, match.index).split("\n").length;

    symbols.push({
      filePath,
      symbol: {
        name: match[0].trim(),
        type: "import",
        language: "python",
      },
      location: {
        startLine,
        startColumn: 0,
        endLine: startLine,
        endColumn: match[0].length,
      },
      signature: match[0].trim(),
      metadata: {
        module: fromModule || importedNames,
        importedNames: importedNames.split(",").map((s) => s.trim()),
      },
      codeHash: computeCodeHash(match[0]),
    });
  }

  // 2. Classes
  const classRegex = /^class\s+([a-zA-Z0-9_]+)(?:\(([^)]+)\))?\s*:/gm;
  while ((match = classRegex.exec(sourceCode)) !== null) {
    const className = match[1];
    const baseClasses = match[2] ? match[2].split(",").map((s) => s.trim()) : [];
    const startLine = sourceCode.slice(0, match.index).split("\n").length;

    const classSymbol = {
      filePath,
      symbol: {
        name: className,
        type: "class",
        language: "python",
      },
      location: {
        startLine,
        startColumn: 0,
        endLine: startLine + 20,
        endColumn: 0,
      },
      signature: match[0].replace(/:$/, "").trim(),
      metadata: {
        baseClasses,
      },
      codeHash: computeCodeHash(match[0]),
      tempId: `class:${className}:${startLine}`,
    };
    symbols.push(classSymbol);

    baseClasses.forEach((base) => {
      relations.push({
        sourceTempId: classSymbol.tempId,
        relationType: "EXTENDS",
        targetName: base,
        line: startLine,
      });
    });
  }

  // 3. Functions & Methods
  const funcRegex = /^(?:[ \t]*)?(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*(?:->\s*([a-zA-Z0-9_\[\], ]+))?\s*:/gm;
  while ((match = funcRegex.exec(sourceCode)) !== null) {
    const funcName = match[1];
    const params = match[2] || "";
    const isAsync = match[0].includes("async");
    const isMethod = params.includes("self") || params.includes("cls");
    const startLine = sourceCode.slice(0, match.index).split("\n").length;

    symbols.push({
      filePath,
      symbol: {
        name: funcName,
        type: isMethod ? "method" : "function",
        language: "python",
      },
      location: {
        startLine,
        startColumn: 0,
        endLine: startLine + 15,
        endColumn: 0,
      },
      signature: `def ${funcName}(${params.trim()})`,
      metadata: {
        async: isAsync,
        method: isMethod,
      },
      codeHash: computeCodeHash(match[0]),
      tempId: `func:${funcName}:${startLine}`,
    });
  }

  // 4. Flask / FastAPI Routes
  const routeRegex = /@(?:app|router|api)\.(get|post|put|delete|patch|route)\(\s*['"]([^'"]+)['"]/gm;
  while ((match = routeRegex.exec(sourceCode)) !== null) {
    const method = match[1].toUpperCase();
    const routePath = match[2];
    const startLine = sourceCode.slice(0, match.index).split("\n").length;

    symbols.push({
      filePath,
      symbol: {
        name: `${method} ${routePath}`,
        type: "route",
        language: "python",
      },
      location: {
        startLine,
        startColumn: 0,
        endLine: startLine,
        endColumn: match[0].length,
      },
      signature: match[0].trim(),
      metadata: {
        httpMethod: method,
        routePath,
      },
      codeHash: computeCodeHash(match[0]),
    });
  }

  return { symbols, relations, lineCount: lines.length };
}

/**
 * Parse Go source code
 */
function parseGo(filePath, sourceCode) {
  const symbols = [];
  const relations = [];
  const lines = sourceCode.split("\n");

  // 1. Imports
  const importBlockRegex = /import\s*\(([\s\S]*?)\)/g;
  let match;
  while ((match = importBlockRegex.exec(sourceCode)) !== null) {
    const block = match[1];
    const startLine = sourceCode.slice(0, match.index).split("\n").length;
    const entries = block.split("\n").map((l) => l.trim().replace(/['"]/g, "")).filter(Boolean);

    entries.forEach((entry) => {
      symbols.push({
        filePath,
        symbol: {
          name: `import "${entry}"`,
          type: "import",
          language: "go",
        },
        location: {
          startLine,
          startColumn: 0,
          endLine: startLine,
          endColumn: 0,
        },
        signature: `import "${entry}"`,
        metadata: {
          package: entry,
        },
        codeHash: computeCodeHash(entry),
      });
    });
  }

  const singleImportRegex = /import\s+['"]([^'"]+)['"]/g;
  while ((match = singleImportRegex.exec(sourceCode)) !== null) {
    const pkg = match[1];
    const startLine = sourceCode.slice(0, match.index).split("\n").length;
    symbols.push({
      filePath,
      symbol: {
        name: `import "${pkg}"`,
        type: "import",
        language: "go",
      },
      location: {
        startLine,
        startColumn: 0,
        endLine: startLine,
        endColumn: match[0].length,
      },
      signature: `import "${pkg}"`,
      metadata: {
        package: pkg,
      },
      codeHash: computeCodeHash(match[0]),
    });
  }

  // 2. Structs & Interfaces
  const typeRegex = /^type\s+([a-zA-Z0-9_]+)\s+(struct|interface)\s*\{/gm;
  while ((match = typeRegex.exec(sourceCode)) !== null) {
    const typeName = match[1];
    const kind = match[2];
    const startLine = sourceCode.slice(0, match.index).split("\n").length;
    const isExported = typeName[0] === typeName[0].toUpperCase();

    symbols.push({
      filePath,
      symbol: {
        name: typeName,
        type: kind === "struct" ? "class" : "interface",
        language: "go",
      },
      location: {
        startLine,
        startColumn: 0,
        endLine: startLine + 15,
        endColumn: 0,
      },
      signature: `type ${typeName} ${kind}`,
      metadata: {
        exported: isExported,
      },
      codeHash: computeCodeHash(match[0]),
      tempId: `go_type:${typeName}:${startLine}`,
    });
  }

  // 3. Functions & Methods
  // func (r *Receiver) MethodName(a string) (int, error)
  const methodRegex = /^func\s+\(\s*([a-zA-Z0-9_*]+)\s+([*]?[a-zA-Z0-9_]+)\s*\)\s*([a-zA-Z0-9_]+)\s*\(([^)]*)\)/gm;
  while ((match = methodRegex.exec(sourceCode)) !== null) {
    const receiverType = match[2].replace(/^\*/, "");
    const methodName = match[3];
    const params = match[4] || "";
    const startLine = sourceCode.slice(0, match.index).split("\n").length;
    const isExported = methodName[0] === methodName[0].toUpperCase();

    symbols.push({
      filePath,
      symbol: {
        name: `${receiverType}.${methodName}`,
        type: "method",
        language: "go",
      },
      location: {
        startLine,
        startColumn: 0,
        endLine: startLine + 20,
        endColumn: 0,
      },
      signature: `func (${match[1]} ${match[2]}) ${methodName}(${params.trim()})`,
      metadata: {
        exported: isExported,
        receiver: receiverType,
      },
      codeHash: computeCodeHash(match[0]),
      tempId: `go_method:${receiverType}.${methodName}:${startLine}`,
    });
  }

  // func FunctionName(a string) int
  const funcRegex = /^func\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/gm;
  while ((match = funcRegex.exec(sourceCode)) !== null) {
    const funcName = match[1];
    const params = match[2] || "";
    const startLine = sourceCode.slice(0, match.index).split("\n").length;
    const isExported = funcName[0] === funcName[0].toUpperCase();

    symbols.push({
      filePath,
      symbol: {
        name: funcName,
        type: "function",
        language: "go",
      },
      location: {
        startLine,
        startColumn: 0,
        endLine: startLine + 20,
        endColumn: 0,
      },
      signature: `func ${funcName}(${params.trim()})`,
      metadata: {
        exported: isExported,
      },
      codeHash: computeCodeHash(match[0]),
      tempId: `go_func:${funcName}:${startLine}`,
    });
  }

  return { symbols, relations, lineCount: lines.length };
}



/**
 * Generic Parser for C/C++, Java, Rust, C#, Shell, and text files
 */
function parseGenericSourceFile(filePath, sourceCode, language) {
  const symbols = [];
  const relations = [];
  const lines = (sourceCode || "").split("\n");

  const fileName = filePath.split("/").pop() || filePath;
  const fileSymbol = {
    filePath,
    symbol: {
      name: fileName,
      type: "class",
      language,
    },
    location: {
      startLine: 1,
      startColumn: 0,
      endLine: lines.length,
      endColumn: 0,
    },
    signature: `file ${fileName}`,
    metadata: {
      language,
      lineCount: lines.length,
    },
    codeHash: computeCodeHash(fileName),
    tempId: `file:${filePath}:1`,
  };
  symbols.push(fileSymbol);

  if (
    language === "cpp" ||
    language === "java" ||
    language === "rust" ||
    language === "csharp" ||
    language === "bash" ||
    language === "php" ||
    language === "ruby" ||
    language === "solidity"
  ) {
    const funcRegex = /(?:func|fn|function|def|public|private|protected|static|\s)+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)\s*[\{:]/g;
    let match;
    while ((match = funcRegex.exec(sourceCode)) !== null) {
      const funcName = match[1];
      if (
        !funcName ||
        funcName === "if" ||
        funcName === "for" ||
        funcName === "while" ||
        funcName === "switch" ||
        funcName === "catch" ||
        funcName === "return"
      ) {
        continue;
      }
      const startLine = sourceCode.slice(0, match.index).split("\n").length;

      symbols.push({
        filePath,
        symbol: {
          name: funcName,
          type: "function",
          language,
        },
        parentTempId: fileSymbol.tempId,
        location: {
          startLine,
          startColumn: 0,
          endLine: Math.min(lines.length, startLine + 15),
          endColumn: 0,
        },
        signature: `${funcName}(${(match[2] || "").trim()})`,
        metadata: { language },
        codeHash: computeCodeHash(match[0]),
        tempId: `func:${funcName}:${startLine}`,
      });
    }
  }

  return { symbols, relations, lineCount: lines.length };
}

/**
 * Universal AST Parser
 */
function parseSourceFile(filePath, sourceCode) {
  const language = detectLanguage(filePath) || "text";

  switch (language) {
    case "javascript":
    case "typescript":
      return parseJavaScriptTypeScript(filePath, sourceCode, language);
    case "python":
      return parsePython(filePath, sourceCode);
    case "go":
      return parseGo(filePath, sourceCode);
    default:
      return parseGenericSourceFile(filePath, sourceCode, language);
  }
}

module.exports = {
  detectLanguage,
  shouldIgnorePath,
  parseSourceFile,
  computeCodeHash,
};
