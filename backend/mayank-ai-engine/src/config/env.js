require("dotenv").config();

function required(name) {
  const val = process.env[name];
  if (!val) {
    // eslint-disable-next-line no-console
    console.warn(`[config] Missing env var ${name} — set it in .env`);
  }
  return val;
}

module.exports = {
  PORT: process.env.PORT || 4001,
  GROQ_API_KEY: required("GROQ_API_KEY"),
  GROQ_MODEL: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  DEBUG_LLM: process.env.DEBUG_LLM === "true",
};
