require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

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