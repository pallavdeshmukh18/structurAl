# StructurAI — AI Engineering Intelligence (Mayank's module)

PR Reviewer + Slop Detector, phase 1 of your ownership area. RCA and Patch
Generator build on top of this once it's solid (see "Next" below).

## Setup

```bash
cp .env.example .env
# paste your real ANTHROPIC_API_KEY into .env
npm install
npm run dev        # starts server on http://localhost:4001
```

Sanity check without the HTTP layer:

```bash
npm run test:review
```

This runs `test/sample-diff.txt` (a diff with a hardcoded API key, an empty
catch block, dead code, and a redundant wrapper function — planted on
purpose) through both the reviewer and the slop detector so you can see the
findings come back correctly shaped.

## Endpoints

### `POST /api/pr/analyze` — the one Rohan's PR page should call

```json
// request
{
  "diff": "diff --git a/...",
  "prTitle": "optional",
  "prDescription": "optional",
  "fileContext": "optional, extra surrounding source",
  "files": [{ "path": "src/x.js", "content": "..." }]  // optional, improves slop detection
}
```

```json
// response
{
  "score": 62,
  "findings": [
    { "severity": "HIGH", "file": "src/services/payment.js", "line": 24, "category": "security", "message": "..." }
  ],
  "codeHealth": {
    "overall": 58, "complexity": 70, "maintainability": 55,
    "errorHandling": 40, "duplication": 80, "aiSlop": 45
  },
  "slopFindings": [
    { "severity": "HIGH", "file": "src/services/payment.js", "line": 16, "category": "hardcoded-value", "message": "..." }
  ],
  "touchedFiles": ["src/services/payment.js"]
}
```

This exact shape is what feeds Rohan's `PR Review` UI (Diff / AI findings /
Slop score / Code Health Score / Suggested fixes) and what Pallav's
`Review`/`CodeScan` Mongoose models should persist.

### `POST /api/pr/review` — reviewer only, `{ score, findings }`
### `POST /api/code-health/scan` — slop detector only, `{ codeHealth, findings }` (takes `diff` and/or `files`)

## How PRs actually get in here

Right now every endpoint expects you to hand it a `diff` string directly —
that's intentional, so you can build and test this in complete isolation
per Rule 3 (shared contracts before implementation). Real GitHub PR diffs
will come from **Pallav's** shared GitHub client
(`github.getPullRequest(...)`) once it exists — do not build your own GitHub
auth. `src/integrations/github/githubClient.stub.js` is a throwaway stand-in
using a raw fetch to the public GitHub API, only so you can pull a real diff
to test against locally. Delete it once Pallav's client lands.

## Design notes

- **`src/llm/claudeClient.js`** is the single place that talks to Claude.
  Both review and slop call `askForJson()`, which strips stray markdown
  fences and retries once if the model returns malformed JSON. Reuse this
  for RCA and Patch Generator too instead of writing new Anthropic SDK calls.
- **Every LLM response is sanitized** (`sanitizeReviewResult` /
  `sanitizeSlopResult`) before it leaves the service layer — scores are
  clamped 0-100, unknown severities default to `MEDIUM`, malformed findings
  are dropped. This means a bad model response degrades gracefully instead
  of crashing the request or corrupting Pallav's DB.
- Review and slop run via `Promise.all` in `/api/pr/analyze` so they don't
  add latency on top of each other.

## Next (not built yet)

- `src/modules/rca/` — takes an Incident + execution graph from Shivaji +
  the relevant source (fetched via Pallav's GitHub client) → LLM → root
  cause + explanation. Reuse `askForJson`.
- `src/modules/patch/` — takes source + root cause → LLM → unified diff →
  validate it actually applies cleanly before it's proposed as a fix PR.

Want me to build the RCA module next, or wire this into an actual Express
route your teammates can hit today?
