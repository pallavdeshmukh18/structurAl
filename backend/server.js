const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const sessionConfig = require("./src/config/session");
const authRoutes = require("./src/modules/auth/auth.routes");
const repositoryRoutes = require("./src/modules/repository/repository.routes");
const webhookRoutes = require("./src/modules/webhook/github.webhook.routes");
const incidentRoutes = require("./src/modules/incident/incident.routes");
const meetingRoutes = require("./src/modules/meeting/meeting.routes");
const aiRoutes = require("./mayank-ai-engine/src/routes");
const chatRoutes = require("./src/modules/chat/chat.routes");
const userRoutes = require("./src/modules/user/user.routes");
const projectRoutes = require("./src/modules/project/project.routes");
const slackRoutes = require("./src/modules/slack/slack.routes");

const app = express();

const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.RENDER === "true" ||
    Boolean(process.env.FRONTEND_URL && process.env.FRONTEND_URL.startsWith("https://"));

// Enable trust proxy for reverse proxies (Render, Vercel, Nginx, AWS ALB) to properly handle secure cookies
if (isProduction || process.env.TRUST_PROXY === "true") {
    app.set("trust proxy", 1);
}

connectDB();

const configuredFrontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
const defaultProdOrigin = "https://structur-al.vercel.app";
const rawOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS
    : `${configuredFrontendUrl},${defaultProdOrigin}`;

const allowedOrigins = rawOrigins
    .split(",")
    .map((url) => url.trim().replace(/\/$/, ""))
    .filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);

            const normalizedOrigin = origin.replace(/\/$/, "");

            // Allow configured production frontend origins
            if (allowedOrigins.includes(normalizedOrigin)) {
                return callback(null, true);
            }

            // Allow GitHub OAuth & Browser Extension requests
            if (
                origin === "https://github.com" ||
                origin.startsWith("chrome-extension://") ||
                origin.startsWith("moz-extension://")
            ) {
                return callback(null, true);
            }

            // Allow local development origins only if not in strict production mode
            if (!isProduction) {
                if (
                    origin.startsWith("http://localhost:") ||
                    origin.startsWith("http://127.0.0.1:")
                ) {
                    return callback(null, true);
                }
            }

            console.warn(`[CORS REJECTED] Origin not allowed: ${origin}`);
            return callback(new Error(`CORS Policy: Access denied for origin ${origin}`));
        },
        credentials: true,
    })
);

app.use(
    express.json({
        verify: (req, res, buf) => {
            req.rawBody = buf;
        },
    })
);
app.use(sessionConfig);

app.use("/api/auth", authRoutes);
app.use("/api/repositories", repositoryRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/reviews", meetingRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/slack", slackRoutes);
app.use("/api", aiRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "StructurAI backend is running 🚀",
        endpoints: {
            auth: "/api/auth",
            repositories: "/api/repositories",
            webhooks: "/api/webhooks/github",
            incidents: "/api/incidents",
            meetings: "/api/meetings",
            reviews: "/api/reviews",
            ai: "/api/ai",
            health: "/api/health",
        },
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        service: "structurai-backend",
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`StructurAI backend running on http://localhost:${PORT}`);
});