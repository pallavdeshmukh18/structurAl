const session = require("express-session");

const sessionConfig = session({
  secret: process.env.SESSION_SECRET || "default_session_secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});

module.exports = sessionConfig;
