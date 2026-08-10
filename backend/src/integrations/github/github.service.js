const GitHubCredential = require("../../models/GitHubCredential");
const { decrypt } = require("../../utils/encryption");
const { GitHubClient } = require("./github.client");

/**
 * Retrieve a GitHubClient instance initialized with the user's decrypted access token
 * @param {string|object} userId
 * @returns {Promise<GitHubClient>}
 */
const getClientForUser = async (userId) => {
  if (!userId) {
    throw new Error("getClientForUser requires a valid userId.");
  }

  const credential = await GitHubCredential.findOne({ userId });
  if (!credential || !credential.accessTokenEncrypted) {
    throw new Error("GitHub credential not found for the specified user.");
  }

  const decryptedToken = decrypt(credential.accessTokenEncrypted);
  return new GitHubClient(decryptedToken);
};

/**
 * Get GitHub profile for specified user
 */
const getCurrentUser = async (userId) => {
  const client = await getClientForUser(userId);
  return await client.getCurrentUser();
};

/**
 * List repositories for specified user
 */
const getUserRepositories = async (userId, options = {}) => {
  const client = await getClientForUser(userId);
  return await client.getUserRepositories(options);
};

/**
 * Get repository details for specified user
 */
const getRepository = async (userId, owner, repo) => {
  const client = await getClientForUser(userId);
  return await client.getRepository(owner, repo);
};

/**
 * Get repository contents for specified user
 */
const getRepositoryContents = async (userId, owner, repo, path = "") => {
  const client = await getClientForUser(userId);
  return await client.getRepositoryContents(owner, repo, path);
};

/**
 * Get pull request details for specified user
 */
const getPullRequest = async (userId, owner, repo, number) => {
  const client = await getClientForUser(userId);
  return await client.getPullRequest(owner, repo, number);
};

/**
 * Get pull request changed files for specified user
 */
const getPullRequestFiles = async (userId, owner, repo, number, options = {}) => {
  const client = await getClientForUser(userId);
  return await client.getPullRequestFiles(owner, repo, number, options);
};

module.exports = {
  getClientForUser,
  getCurrentUser,
  getUserRepositories,
  getRepository,
  getRepositoryContents,
  getPullRequest,
  getPullRequestFiles,
};
