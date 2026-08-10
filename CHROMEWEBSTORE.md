# Chrome Web Store Listing — structur.aI

## Listing Metadata

- **Name**: structur.aI — Visual Logic Debugger & AST Indexer
- **Short Description**: 1-click AST logic indexing and visual debugging for GitHub repositories in structur.aI.
- **Detailed Description**:
  structur.aI bridges GitHub repositories, AST code dependency graphs, and OpenTelemetry runtime execution traces into an interactive visual canvas.
  
  This lightweight extension adds a 1-click "⚡ Index in structur.aI" action button directly onto GitHub repository pages. Clicking the button connects the repository to your structur.aI workspace, parses functions and classes into an AST call graph, and immediately opens the interactive visualizer canvas.

## Permissions Justification

| Permission | Scope | Justification |
| :--- | :--- | :--- |
| `storage` | Local extension storage | Used to store user preferences and indexing status caches. |
| `https://github.com/*` | Host Permission | Required to detect repository pages and inject the "⚡ Index in structur.aI" action button into the GitHub navigation bar. |
| `http://localhost:5001/*` | Host Permission | Required to communicate with the local structur.aI backend indexing service to trigger AST parsing and retrieve the repository canvas URL. |

## Privacy Policy & Data Use

- **Data Collected**: Only the repository owner and repository name from the active GitHub URL are parsed upon user click.
- **Data Transmission**: Transmitted directly to your local structur.aI backend instance (`http://localhost:5001`).
- **No Third-Party Tracking**: No user tracking, cookies, or personal identifiers are collected or shared.
