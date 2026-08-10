/**
 * TEMPORARY STUB.
 *
 * Per the team division doc, Pallav owns the real shared GitHub client at
 * backend/src/integrations/github/. Once that's ready, replace this file's
 * usage with his exports (e.g. github.getPullRequest(...)).
 *
 * This stub exists so review.service.js / slop.service.js can be tested
 * end-to-end (fetch a real PR diff -> analyze it) before Pallav's client
 * lands, without Mayank building his own GitHub auth/API logic.
 *
 * DO NOT let this grow into a real GitHub client — that's a Rule 1 violation
 * (one owner per module). Delete this file once Pallav's client exists.
 */

async function getPullRequestDiff({ owner, repo, prNumber, githubToken }) {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.v3.diff",
      Authorization: githubToken ? `Bearer ${githubToken}` : undefined,
      "User-Agent": "structurai-ai-engine",
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status}: ${await res.text()}`);
  }

  return res.text();
}

module.exports = { getPullRequestDiff };
