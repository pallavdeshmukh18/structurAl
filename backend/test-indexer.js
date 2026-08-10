require("dotenv").config();
const mongoose = require("mongoose");
const {
  User,
  Repository,
  RepositorySnapshot,
  CodeSymbol,
  CodeRelation,
} = require("./src/models");
const { indexerService } = require("./src/services/indexer.service");

// Sample multi-language source code for demo-repo
const DEMO_FILES = [
  {
    path: "src/auth/auth.service.ts",
    content: `
import { User, Token } from '../models/user';
import bcrypt from 'bcrypt';

export interface AuthConfig {
  jwtSecret: string;
  expiresIn: number;
}

export class AuthService {
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  public async validateUser(email: string, pass: string): Promise<User | null> {
    const user = await this.findUser(email);
    if (!user) return null;
    const isValid = await bcrypt.compare(pass, user.passwordHash);
    return isValid ? user : null;
  }

  private async findUser(email: string): Promise<User | null> {
    return User.findOne({ email });
  }
}

export const generateToken = async (userId: string): Promise<string> => {
  return "jwt-token-123";
};
`,
  },
  {
    path: "src/api/routes.js",
    content: `
const express = require('express');
const router = express.Router();
const { AuthService, generateToken } = require('../auth/auth.service');

const authService = new AuthService({ jwtSecret: 'demo', expiresIn: 3600 });

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.validateUser(email, password);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const token = await generateToken(user.id);
  return res.json({ token });
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;
`,
  },
  {
    path: "analytics/metrics.py",
    content: `
import os
import time
from typing import Dict, Any

class MetricsCollector:
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.metrics: Dict[str, Any] = {}

    def record_latency(self, endpoint: str, duration_ms: float) -> None:
        self.metrics[endpoint] = duration_ms
        self.flush_metrics()

    def flush_metrics(self) -> bool:
        return True

def compute_percentiles(data: list) -> dict:
    if not data:
        return {}
    return {"p50": 10.0, "p99": 50.0}
`,
  },
  {
    path: "gateway/proxy.go",
    content: `
package gateway

import (
	"fmt"
	"net/http"
)

type GatewayConfig struct {
	Port int
	Host string
}

type ReverseProxy struct {
	config GatewayConfig
}

func NewReverseProxy(cfg GatewayConfig) *ReverseProxy {
	return &ReverseProxy{config: cfg}
}

func (rp *ReverseProxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Proxy response")
}
`,
  },
  {
    path: "assets/logo.png", // Binary / non-source file (should be ignored)
    content: "binary-image-data",
  },
  {
    path: "config/settings.yaml", // Unsupported source file (tracked in report)
    content: "app_name: demo\nport: 8080",
  },
];

async function runVerification() {
  console.log("==================================================");
  console.log("🚀 StructurAI Repository Indexer Verification Test");
  console.log("==================================================");

  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/structurai_test";
  
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    console.log(" Connected to MongoDB:", mongoUri);
  } catch (dbErr) {
    console.warn("⚠️ MongoDB connection failed on local port. Using in-memory validation test...");
  }

  // If MongoDB is connected, execute end-to-end integration test
  if (mongoose.connection.readyState === 1) {
    // 1. Create or retrieve test user
    let user = await User.findOne({ email: "indexer-test@structurai.dev" });
    if (!user) {
      user = await User.create({
        email: "indexer-test@structurai.dev",
        name: "Indexer Tester",
        avatar: "https://github.com/avatar.png",
      });
    }

    // 2. Create demo repository record
    let repo = await Repository.findOne({ "github.fullName": "structurai-demo/demo-repo" });
    if (repo) {
      await Repository.deleteOne({ _id: repo._id });
      await RepositorySnapshot.deleteMany({ repositoryId: repo._id });
      await CodeSymbol.deleteMany({ repositoryId: repo._id });
      await CodeRelation.deleteMany({ repositoryId: repo._id });
    }

    repo = await Repository.create({
      ownerId: user._id,
      github: {
        id: 999888777,
        owner: "structurai-demo",
        name: "demo-repo",
        fullName: "structurai-demo/demo-repo",
        url: "https://github.com/structurai-demo/demo-repo",
        cloneUrl: "https://github.com/structurai-demo/demo-repo.git",
        defaultBranch: "main",
      },
      language: "TypeScript",
      visibility: "public",
      indexing: {
        status: "pending",
      },
    });

    console.log(` Created demo repository in MongoDB: ${repo.github.fullName} (${repo._id})`);

    // 3. Run Indexing Pipeline
    console.log("🔄 Executing indexerService.indexRepository...");
    const indexResult = await indexerService.indexRepository(repo._id, {
      commitSha: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
      providedFiles: DEMO_FILES,
    });

    console.log(" Indexing result:", JSON.stringify(indexResult, null, 2));

    // 4. Verify MongoDB state
    const updatedRepo = await Repository.findById(repo._id);
    const snapshots = await RepositorySnapshot.find({ repositoryId: repo._id });
    const symbols = await CodeSymbol.find({ repositoryId: repo._id });
    const relations = await CodeRelation.find({ repositoryId: repo._id });

    console.log("\n📊 Verification Results:");
    console.log(`- Repository status: ${updatedRepo.indexing.status}`);
    console.log(`- Last indexed commit: ${updatedRepo.indexing.lastIndexedCommit}`);
    console.log(`- Last indexed at: ${updatedRepo.indexing.lastIndexedAt}`);
    console.log(`- Total Snapshots in DB: ${snapshots.length}`);
    console.log(`- Total CodeSymbols in DB: ${symbols.length}`);
    console.log(`- Total CodeRelations in DB: ${relations.length}`);
    console.log(`- Unsupported Files: ${indexResult.unsupportedFiles.join(", ") || "None"}`);

    // Print sample symbols
    console.log("\n🔍 Sample Extracted CodeSymbols:");
    symbols.slice(0, 5).forEach((s) => {
      console.log(`  • [${s.symbol.language}] ${s.symbol.type.toUpperCase()}: ${s.symbol.name} (${s.filePath}:${s.location.startLine})`);
    });

    // Print sample relations
    console.log("\n🔗 Sample Extracted CodeRelations:");
    relations.forEach((r) => {
      console.log(`  • Relation [${r.relationType}] at ${r.metadata.filePath}:${r.metadata.line}`);
    });

    // 5. Test Idempotency: Re-index same commit
    console.log("\n🔄 Testing Idempotency (re-indexing same commit SHA)...");
    const reindexResult = await indexerService.indexRepository(repo._id, {
      commitSha: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
      providedFiles: DEMO_FILES,
    });

    const postReindexSnapshots = await RepositorySnapshot.find({ repositoryId: repo._id });
    const postReindexSymbols = await CodeSymbol.find({ repositoryId: repo._id });
    console.log(`- Snapshots after re-index (expected 1): ${postReindexSnapshots.length}`);
    console.log(`- Symbols after re-index (expected ${symbols.length}): ${postReindexSymbols.length}`);

    await mongoose.disconnect();
    console.log("\n Verification complete!");
  } else {
    // Pure unit test mode without live MongoDB
    const { parseSourceFile } = require("./src/services/parser/ast.parser");
    console.log("\n🔬 AST Parser Unit Test on demo files:");
    let totalSyms = 0;
    let totalRels = 0;
    DEMO_FILES.forEach((f) => {
      const res = parseSourceFile(f.path, f.content);
      totalSyms += res.symbols.length;
      totalRels += res.relations.length;
      console.log(`  • ${f.path}: ${res.symbols.length} symbols, ${res.relations.length} relations, unsupported: ${Boolean(res.unsupported)}`);
    });
    console.log(`\nTotal Extracted Symbols: ${totalSyms}`);
    console.log(`Total Extracted Relations: ${totalRels}`);
  }
}

runVerification().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
