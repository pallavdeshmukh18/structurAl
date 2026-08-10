const { indexerService } = require("../../services/indexer.service");

/**
 * Trigger background repository indexing
 * @param {object} params
 * @param {string|object} params.repositoryId MongoDB Repository _id
 * @param {string} [params.commitSha] Commit SHA to index
 * @param {string} [params.ref] Git ref (e.g. refs/heads/main)
 */
const triggerRepositoryIndexing = async ({ repositoryId, commitSha, ref }) => {
  try {
    console.log(
      `[INDEXER TRIGGER] Triggering indexing for repository: ${repositoryId}, commitSha: ${commitSha}, ref: ${ref}`
    );

    return await indexerService.indexRepository(repositoryId, {
      commitSha,
      branch: ref ? ref.replace(/^refs\/heads\//, "") : undefined,
    });
  } catch (error) {
    console.error(`[INDEXER TRIGGER ERROR] Failed to trigger indexing for repo ${repositoryId}:`, error.message);
    throw error;
  }
};

module.exports = {
  triggerRepositoryIndexing,
};
