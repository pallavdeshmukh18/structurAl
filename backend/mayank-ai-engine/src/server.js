const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { PORT } = require("./config/env");
const routes = require("./routes");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(morgan("dev"));
// diffs + full file contents can be large, bump the default 100kb limit
app.use(express.json({ limit: "5mb" }));

app.use("/api", routes);

app.get("/", (req, res) => {
  res.json({
    service: "StructurAI AI Engine (Mayank's Module) 🤖",
    status: "online",
    message: "Server is running! Access API endpoints under /api",
    endpoints: {
      health: "GET /api/health",
      prReview: "POST /api/pr/review",
      prAnalyze: "POST /api/pr/analyze",
      slopScan: "POST /api/code-health/scan",
      rcaAnalyze: "POST /api/rca/analyze",
      patchGenerate: "POST /api/patch/generate",
      patchValidate: "POST /api/patch/validate",
      autoFixPipeline: "POST /api/pipeline/auto-fix"
    }
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[structurai-ai-engine] listening on http://localhost:${PORT}`);
});
