const express = require("express");
const { handleReview, handleAnalyze } = require("../modules/review/review.controller");
const { handleSlopScan } = require("../modules/slop/slop.controller");
const { handleRca } = require("../modules/rca/rca.controller");
const {
  handleGeneratePatch,
  handleValidatePatch,
  handleCreateFixPR,
  handleAutoFixPipeline,
} = require("../modules/patch/patch.controller");

const router = express.Router();

router.get("/health", (req, res) => res.json({ ok: true, module: "mayank-ai-engine" }));

// 1. PR Reviewer
router.post("/pr/review", handleReview);

// 2. Combined PR Reviewer + Slop Detector
router.post("/pr/analyze", handleAnalyze);

// 3. Standalone Slop / Code Health Scan
router.post("/code-health/scan", handleSlopScan);

// 4. AI Root Cause Analysis (RCA)
router.post("/rca/analyze", handleRca);

// 5. AI Patch Engine & Validation
router.post("/patch/generate", handleGeneratePatch);
router.post("/patch/validate", handleValidatePatch);
router.post("/patch/create-pr", handleCreateFixPR);

// 6. End-to-End Autonomous Fix Pipeline (Incident -> RCA -> Patch -> Validation -> PR)
router.post("/pipeline/auto-fix", handleAutoFixPipeline);

module.exports = router;
