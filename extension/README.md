# ⚡ structur.aI — GitHub Browser Extension (Manifest V3)

A lightweight browser extension for Chrome, Brave, Edge, and Firefox that injects a **"⚡ Index in structur.aI"** button into GitHub repository pages. With one click, it indexes the repository AST graph and opens the interactive visual logic debugger canvas.

---

## 🚀 Features

- **GitHub-Native Integration**: Injects seamlessly next to GitHub's file navigation and repository actions (`.file-navigation`, `ul.pagehead-actions`).
- **SPA & Turbo Aware**: Idempotent button injection that smoothly handles GitHub's client-side Turbo / PJAX navigation without duplicate buttons or page reloads.
- **Real-Time UX States**:
  - `⚡ Index in structur.aI` (Default state)
  - `⏳ Indexing AST...` (Active state with spinner animation)
  - `✅ Indexed! Opening...` (Success state with instant tab redirect)
  - `❌ Backend Unreachable` / `❌ Indexing Failed` (Graceful error recovery with toast alert)
- **1-Click Deep Linking**: Opens `http://localhost:5173/repository/:id` directly in your browser.

---

## 📦 File Structure

```
extension/
├── manifest.json       # Manifest V3 configuration & host permissions
├── content.js          # DOM injector, GitHub URL parser, & API client
├── styles.css          # GitHub-native dark theme styling & spinner animations
├── icons/              # 16px, 48px, and 128px extension icons
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── scripts/
    └── generate-icons.js
```

---

## 🛠️ Step-by-Step Installation Instructions

### 🌐 Google Chrome / Brave / Microsoft Edge / Arc

1. Open your browser and navigate to:
   ```
   chrome://extensions
   ```
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click the **"Load unpacked"** button in the top-left toolbar.
4. Select the `extension/` folder located inside the `structurAl` project directory:
   ```
   /path/to/structurAl/extension
   ```
5. Navigate to any GitHub repository (e.g. `https://github.com/facebook/react` or `https://github.com/pallavdeshmukh18/structurAl`).
6. You will see the **"⚡ Index in structur.aI"** button above the file tree. Click it to index and open the visual canvas!

---

### 🦊 Mozilla Firefox

1. Open Firefox and navigate to:
   ```
   about:debugging#/runtime/this-firefox
   ```
2. Click **"Load Temporary Add-on..."**.
3. Browse to the `extension/` directory and select `manifest.json`.
4. Navigate to any repository on GitHub to use the 1-click indexer.

---

## 🔌 Prerequisites

Ensure your local backend and frontend services are running:

- **Backend (Port 5001)**:
  ```bash
  cd backend
  npm run dev
  ```
- **Frontend (Port 5173)**:
  ```bash
  cd frontend
  npm run dev
  ```
