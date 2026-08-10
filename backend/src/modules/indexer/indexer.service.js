/**
 * StructurAI Repository Indexer Trigger Service
 */

/**
 * Trigger background repository indexing
 * @param {object} params
 * @param {string|object} params.repositoryId MongoDB Repository _id
 * @param {string} params.commitSha Commit SHA to index
 * @param {string} params.ref Git ref (e.g. refs/heads/main)
 */
const triggerRepositoryIndexing = async ({ repositoryId, commitSha, ref }) => {
  try {
    console.log(
      `[INDEXER TRIGGER] Queued indexing for repository: ${repositoryId}, commitSha: ${commitSha}, ref: ${ref}`
    );

    // TODO: Integrate with Shivaji's repository indexer pipeline:
    // 1. Create RepositorySnapshot (status: pending -> indexing)
    // 2. Fetch repository file tree & contents
    // 3. Extract CodeSymbol & CodeRelation documents
    // 4. Update RepositorySnapshot stats & set Repository.indexing.status = 'ready'
  } catch (error) {
    console.error(`[INDEXER TRIGGER ERROR] Failed to trigger indexing for repo ${repositoryId}:`, error.message);
  }
};

module.exports = {
  triggerRepositoryIndexing,
};
