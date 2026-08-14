const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  try {
    const hasCookieHeader = Boolean(req.headers.cookie);
    console.log(`[AUTH CHECK] Path: ${req.path} | HasCookieHeader: ${hasCookieHeader} | SessionID: ${req.sessionID} | SessionUserId: ${req.session ? req.session.userId : "none"}`);

    if (!req.session || !req.session.userId) {
      console.warn(`[AUTH REJECTED 401] Path: ${req.path} | HasCookieHeader: ${hasCookieHeader} | SessionID: ${req.sessionID}`);
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await User.findById(req.session.userId);

    if (!user) {
      req.session.destroy();
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    console.error("Optional auth middleware error:", error);
    next();
  }
};

module.exports = {
  isAuthenticated,
  optionalAuth,
};
