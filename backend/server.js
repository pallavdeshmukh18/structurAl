require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const sessionConfig = require("./src/config/session");
const authRoutes = require("./src/modules/auth/auth.routes");

const app = express();

connectDB();

app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        credentials: true,
    })
);
app.use(express.json());
app.use(sessionConfig);

app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "StructurAI backend is running 🚀",
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