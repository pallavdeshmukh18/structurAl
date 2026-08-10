/**
 * StructurAI Reusable GitHub API Client
 */
class GitHubClient {
  /**
   * @param {string} accessToken GitHub OAuth access token
   */
  constructor(accessToken) {
    if (!accessToken) {
      throw new Error("GitHubClient requires a valid access token.");
    }
    this.accessToken = accessToken;
    this.baseUrl = "https://api.github.com";
  }

  /**
   * Private helper method to execute requests against GitHub API
   * @param {string} endpoint
   * @param {object} options
   */
  async #request(endpoint, options = {}) {
    const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;

    const headers = {
      Authorization: `Bearer ${this.accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "StructurAI-Backend",
      ...(options.headers || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message = errorBody.message || response.statusText || "GitHub API Request Failed";

      const error = new Error(`GitHub API Error (${response.status}): ${message}`);
      error.status = response.status;
      error.data = errorBody;
      throw error;
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  }

  /**
   * Get authenticated user profile
   * GET /user
   */
  async getCurrentUser() {
    return await this.#request("/user");
  }

  /**
   * List repositories for the authenticated user with pagination support
   * GET /user/repos
   * @param {object} options { page, per_page, sort, direction, visibility, affiliation, type }
   */
  async getUserRepositories(options = {}) {
    const params = new URLSearchParams();

    const allowedParams = ["page", "per_page", "sort", "direction", "visibility", "affiliation", "type"];
    for (const key of allowedParams) {
      if (options[key] !== undefined && options[key] !== null) {
        params.append(key, String(options[key]));
      }
    }

    const queryString = params.toString();
    const endpoint = `/user/repos${queryString ? `?${queryString}` : ""}`;

    return await this.#request(endpoint);
  }

  /**
   * Get single repository details
   * GET /repos/{owner}/{repo}
   * @param {string} owner
   * @param {string} repo
   */
  async getRepository(owner, repo) {
    if (!owner || !repo) {
      throw new Error("getRepository requires both 'owner' and 'repo' parameters.");
    }
    const cleanOwner = encodeURIComponent(owner);
    const cleanRepo = encodeURIComponent(repo);
    return await this.#request(`/repos/${cleanOwner}/${cleanRepo}`);
  }

  /**
   * Get contents of a file or directory in a repository
   * GET /repos/{owner}/{repo}/contents/{path}
   * @param {string} owner
   * @param {string} repo
   * @param {string} [path=""]
   */
  async getRepositoryContents(owner, repo, path = "") {
    if (!owner || !repo) {
      throw new Error("getRepositoryContents requires both 'owner' and 'repo' parameters.");
    }
    const cleanOwner = encodeURIComponent(owner);
    const cleanRepo = encodeURIComponent(repo);

    const cleanPath = path
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/");

    const endpoint = cleanPath
      ? `/repos/${cleanOwner}/${cleanRepo}/contents/${cleanPath}`
      : `/repos/${cleanOwner}/${cleanRepo}/contents`;

    return await this.#request(endpoint);
  }

  /**
   * Get details of a pull request
   * GET /repos/{owner}/{repo}/pulls/{number}
   * @param {string} owner
   * @param {string} repo
   * @param {number|string} number
   */
  async getPullRequest(owner, repo, number) {
    if (!owner || !repo || !number) {
      throw new Error("getPullRequest requires 'owner', 'repo', and 'number' parameters.");
    }
    const cleanOwner = encodeURIComponent(owner);
    const cleanRepo = encodeURIComponent(repo);
    const cleanNumber = encodeURIComponent(number);

    return await this.#request(`/repos/${cleanOwner}/${cleanRepo}/pulls/${cleanNumber}`);
  }

  /**
   * Get list of changed files in a pull request with pagination support
   * GET /repos/{owner}/{repo}/pulls/{number}/files
   * @param {string} owner
   * @param {string} repo
   * @param {number|string} number
   * @param {object} [options={}] { page, per_page }
   */
  async getPullRequestFiles(owner, repo, number, options = {}) {
    if (!owner || !repo || !number) {
      throw new Error("getPullRequestFiles requires 'owner', 'repo', and 'number' parameters.");
    }
    const cleanOwner = encodeURIComponent(owner);
    const cleanRepo = encodeURIComponent(repo);
    const cleanNumber = encodeURIComponent(number);

    const params = new URLSearchParams();
    if (options.page !== undefined && options.page !== null) {
      params.append("page", String(options.page));
    }
    if (options.per_page !== undefined && options.per_page !== null) {
      params.append("per_page", String(options.per_page));
    }

    const queryString = params.toString();
    const endpoint = `/repos/${cleanOwner}/${cleanRepo}/pulls/${cleanNumber}/files${
      queryString ? `?${queryString}` : ""
    }`;

    return await this.#request(endpoint);
  }
}

/**
 * Factory function to instantiate GitHubClient
 * @param {string} accessToken
 * @returns {GitHubClient}
 */
const createGitHubClient = (accessToken) => {
  return new GitHubClient(accessToken);
};

module.exports = {
  GitHubClient,
  createGitHubClient,
};
