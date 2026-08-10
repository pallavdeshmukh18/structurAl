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
 * Get branch details for specified user
 */
const getBranch = async (userId, owner, repo, branch) => {
  const client = await getClientForUser(userId);
  return await client.getBranch(owner, repo, branch);
};

/**
 * Get commit details for specified user
 */
const getCommit = async (userId, owner, repo, ref) => {
  const client = await getClientForUser(userId);
  return await client.getCommit(owner, repo, ref);
};

/**
 * Get git tree for specified user
 */
const getGitTree = async (userId, owner, repo, treeSha, recursive = true) => {
  const client = await getClientForUser(userId);
  return await client.getGitTree(owner, repo, treeSha, recursive);
};

/**
 * Get blob content for specified user
 */
const getGitBlob = async (userId, owner, repo, fileSha) => {
  const client = await getClientForUser(userId);
  return await client.getGitBlob(owner, repo, fileSha);
};

/**
 * Get repository contents for specified user
 */
const getRepositoryContents = async (userId, owner, repo, path = "", ref = null) => {
  const client = await getClientForUser(userId);
  return await client.getRepositoryContents(owner, repo, path, ref);
};

/**
 * Get list of pull requests for specified user
 */
const getPullRequests = async (userId, owner, repo, options = {}) => {
  const client = await getClientForUser(userId);
  return await client.getPullRequests(owner, repo, options);
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
  getBranch,
  getCommit,
  getGitTree,
  getGitBlob,
  getRepositoryContents,
  getPullRequests,
  getPullRequest,
  getPullRequestFiles,
};
