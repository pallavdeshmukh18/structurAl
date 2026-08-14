const session = require("express-session");
const { MongoStore } = require("connect-mongo");

const isProduction = process.env.NODE_ENV === "production";
const sessionSecret = process.env.SESSION_SECRET;
const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/structurAl";

if (isProduction && (!sessionSecret || sessionSecret === "default_session_secret")) {
  throw new Error(
    "FATAL CONFIG ERROR: SESSION_SECRET must be explicitly set to a strong secret in production mode!"
  );
}

const sessionConfig = session({
  secret: sessionSecret || "default_session_secret",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: mongoUri,
    collectionName: "sessions",
    ttl: 24 * 60 * 60, // 24 hours
  }),
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});

module.exports = sessionConfig;
