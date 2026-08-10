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
  ANTHROPIC_API_KEY: required("ANTHROPIC_API_KEY"),
  CLAUDE_MODEL: process.env.CLAUDE_MODEL || "claude-sonnet-5",
  DEBUG_LLM: process.env.DEBUG_LLM === "true",
};
