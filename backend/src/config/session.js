const session = require("express-session");
const isProduction = process.env.NODE_ENV === "production";
const sessionSecret = process.env.SESSION_SECRET;

if (isProduction && (!sessionSecret || sessionSecret === "default_session_secret")) {
  throw new Error(
    "FATAL CONFIG ERROR: SESSION_SECRET must be explicitly set to a strong secret in production mode!"
  );
}

const sessionConfig = session({
  secret: sessionSecret || "default_session_secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});

module.exports = sessionConfig;
