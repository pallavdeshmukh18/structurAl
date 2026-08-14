const User = require("../../models/User");
const GitHubCredential = require("../../models/GitHubCredential");
const { encrypt } = require("../../utils/encryption");

/**
 * Redirect user to GitHub OAuth authorization screen
 */
const redirectToGitHub = (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_CALLBACK_URL;
  const scope = "read:user user:email repo";

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(
    scope
  )}`;

  return res.redirect(githubAuthUrl);
};

/**
 * Handle GitHub OAuth callback
 */
const handleGitHubCallback = async (req, res) => {
  const { code, error: oauthError } = req.query;
  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

  if (oauthError || !code) {
    console.error("GitHub OAuth error or missing code:", oauthError);
    return res.redirect(`${frontendUrl}?error=oauth_cancelled`);
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: process.env.GITHUB_CALLBACK_URL,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error("Failed to obtain GitHub access token:", tokenData);
      return res.redirect(`${frontendUrl}?error=token_exchange_failed`);
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch GitHub user profile
    const userProfileResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "StructurAI-Backend",
      },
    });

    if (!userProfileResponse.ok) {
      console.error("Failed to fetch GitHub profile");
      return res.redirect(`${frontendUrl}?error=profile_fetch_failed`);
    }

    const githubUser = await userProfileResponse.json();

    // 3. Fetch user emails to get the verified primary email
    let primaryEmail = githubUser.email;

    const emailsResponse = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "StructurAI-Backend",
      },
    });

    if (emailsResponse.ok) {
      const emails = await emailsResponse.json();
      if (Array.isArray(emails)) {
        const primaryObj =
          emails.find((e) => e.primary && e.verified) ||
          emails.find((e) => e.verified) ||
          emails[0];
        if (primaryObj && primaryObj.email) {
          primaryEmail = primaryObj.email;
        }
      }
    }

    if (!primaryEmail) {
      primaryEmail = `${githubUser.login}@users.noreply.github.com`;
    }

    const githubIdStr = String(githubUser.id);
    const displayName = githubUser.name || githubUser.login;
    const avatarUrl = githubUser.avatar_url;
    const username = githubUser.login;
    const now = new Date();

    // 4. Find or create User by providers.github.id or email fallback
    let user = await User.findOne({ "providers.github.id": githubIdStr });

    if (!user) {
      user = await User.findOne({ email: primaryEmail.toLowerCase() });
    }

    if (user) {
      // Update user document
      user.name = displayName;
      user.email = primaryEmail.toLowerCase();
      user.avatarUrl = avatarUrl;
      user.providers = user.providers || {};
      user.providers.github = {
        id: githubIdStr,
        username: username,
      };
      user.lastLoginAt = now;
      await user.save();
    } else {
      // Create new user
      user = await User.create({
        name: displayName,
        email: primaryEmail.toLowerCase(),
        avatarUrl: avatarUrl,
        providers: {
          github: {
            id: githubIdStr,
            username: username,
          },
        },
        lastLoginAt: now,
      });
    }

    // 5. Encrypt and persist GitHub access token securely
    const accessTokenEncrypted = encrypt(accessToken);
    await GitHubCredential.findOneAndUpdate(
      { userId: user._id },
      { accessTokenEncrypted },
      { upsert: true, returnDocument: "after" }
    );

    // 6. Establish session
    req.session.userId = user._id.toString();

    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.redirect(`${frontendUrl}?error=session_error`);
      }
      return res.redirect(`${frontendUrl}/dashboard`);
    });
  } catch (error) {
    console.error("Error during GitHub OAuth callback:", error);
    return res.redirect(`${frontendUrl}?error=server_error`);
  }
};

/**
 * Get current logged in user profile
 */
const getCurrentUser = async (req, res) => {
  return res.json({
    user: req.user,
  });
};

/**
 * Logout user and destroy session
 */
const logout = (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out successfully" });
    });
  } else {
    res.clearCookie("connect.sid");
    return res.json({ message: "Logged out successfully" });
  }
};

module.exports = {
  redirectToGitHub,
  handleGitHubCallback,
  getCurrentUser,
  logout,
};
