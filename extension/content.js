/**
 * structur.aI — Visual Logic Debugger & AST Indexer
 * GitHub Content Script (Manifest V3)
 */

(function () {
  "use strict";

  const DEFAULT_BACKEND_API_BASE = "http://localhost:5001";
  const DEFAULT_FRONTEND_APP_BASE = "http://localhost:5173";
  const BUTTON_ID = "structurai-index-btn";
  const TOAST_ID = "structurai-toast";

  async function getAppConfig() {
    return new Promise((resolve) => {
      if (typeof chrome !== "undefined" && chrome && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(["backendUrl", "frontendUrl"], (items) => {
          resolve({
            backendUrl: (items && items.backendUrl && items.backendUrl.trim()) || DEFAULT_BACKEND_API_BASE,
            frontendUrl: (items && items.frontendUrl && items.frontendUrl.trim()) || DEFAULT_FRONTEND_APP_BASE,
          });
        });
      } else {
        resolve({
          backendUrl: DEFAULT_BACKEND_API_BASE,
          frontendUrl: DEFAULT_FRONTEND_APP_BASE,
        });
      }
    });
  }

  const IGNORED_PATHS = new Set([
    "settings", "pulls", "issues", "discussions", "actions", "projects",
    "wiki", "security", "pulse", "community", "explore", "notifications",
    "orgs", "users", "marketplace", "trending", "stars", "search", "login",
    "signup", "pricing", "features", "enterprise", "organizations", "account",
  ]);

  /**
   * Parse owner and repository name from URL
   * @returns {{ owner: string, repo: string, fullName: string } | null}
   */
  function parseRepoDetails() {
    const pathSegments = window.location.pathname.split("/").filter(Boolean);

    if (pathSegments.length < 2) return null;

    const [owner, repo] = pathSegments;

    if (IGNORED_PATHS.has(owner.toLowerCase()) || IGNORED_PATHS.has(repo.toLowerCase())) {
      return null;
    }

    return {
      owner,
      repo,
      fullName: `${owner}/${repo}`,
    };
  }

  /**
   * Show floating toast notification
   */
  function showToast(message, isError = false) {
    let toast = document.getElementById(TOAST_ID);
    if (!toast) {
      toast = document.createElement("div");
      toast.id = TOAST_ID;
      toast.className = "structurai-toast";
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `structurai-toast is-visible ${isError ? "is-error" : ""}`;

    setTimeout(() => {
      if (toast) toast.classList.remove("is-visible");
    }, 3500);
  }

  /**
   * Handle 1-Click Indexing Action
   */
  async function handleIndexRepository(btn, repoDetails) {
    if (btn.disabled || btn.classList.contains("is-loading")) return;

    // 1. Enter Active / Loading State
    btn.disabled = true;
    btn.classList.add("is-loading");
    btn.innerHTML = `
      <span class="structurai-spinner"></span>
      <span>⏳ Indexing AST...</span>
    `;

    const { backendUrl, frontendUrl } = await getAppConfig();

    const payload = {
      name: repoDetails.repo,
      fullName: repoDetails.fullName,
      cloneUrl: `https://github.com/${repoDetails.fullName}.git`,
      defaultBranch: "main",
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${backendUrl}/api/repositories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const repositoryId = data.repository?._id || data.repository?.id;

      // 2. Success State
      btn.classList.remove("is-loading");
      btn.classList.add("is-success");
      btn.innerHTML = `
        <span class="structurai-btn-icon">✅</span>
        <span>Indexed! Opening...</span>
      `;
      showToast(`⚡ ${repoDetails.fullName} AST indexed! Opening canvas...`);

      // 3. Redirect to React Flow Visualizer Canvas after 1s
      setTimeout(() => {
        const targetUrl = repositoryId
          ? `${frontendUrl}/repository/${repositoryId}`
          : `${frontendUrl}/dashboard`;
        window.open(targetUrl, "_blank");

        // Reset button state
        setTimeout(() => {
          resetButtonState(btn);
        }, 1500);
      }, 1000);

    } catch (err) {
      clearTimeout(timeoutId);
      console.error("[structur.aI] Indexing failed:", err.message);

      btn.classList.remove("is-loading");
      btn.classList.add("is-error");

      const isUnreachable = err.name === "AbortError" || err.message.includes("Failed to fetch") || err.message.includes("NetworkError");

      if (isUnreachable) {
        btn.innerHTML = `
          <span class="structurai-btn-icon">❌</span>
          <span>Backend Unreachable</span>
        `;
        showToast(`❌ Could not connect to structur.aI backend at ${backendUrl}`, true);
      } else {
        btn.innerHTML = `
          <span class="structurai-btn-icon">❌</span>
          <span>Indexing Failed</span>
        `;
        showToast(`❌ Indexing error: ${err.message}`, true);
      }

      // Reset button after 3.5s for retry
      setTimeout(() => {
        resetButtonState(btn);
      }, 3500);
    }
  }

  function resetButtonState(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.className = "structurai-index-btn";
    btn.innerHTML = `
      <span class="structurai-btn-icon">⚡</span>
      <span>Index in structur.aI</span>
    `;
  }

  /**
   * Locate the primary Code dropdown container while strictly excluding header navigation (<nav>)
   * @returns {{ container: HTMLElement, referenceNode: HTMLElement | null } | null}
   */
  function getTargetContainer() {
    // 1. Direct <get-repo> parent container
    const getRepo = document.querySelector("get-repo");
    if (getRepo && getRepo.parentElement) {
      return { container: getRepo.parentElement, referenceNode: getRepo };
    }

    // 2. #code-button-at-repo-root (primary root action button in modern GitHub UI)
    const codeBtnRoot = document.querySelector("#code-button-at-repo-root");
    if (codeBtnRoot && codeBtnRoot.parentElement) {
      return { container: codeBtnRoot.parentElement, referenceNode: codeBtnRoot };
    }

    // 3. Fallback: find <button> or <summary> containing "Code" that is NOT inside <nav>
    const codeBtn = Array.from(document.querySelectorAll("button, summary")).find(
      (el) => el.textContent && el.textContent.includes("Code") && !el.closest("nav")
    );
    if (codeBtn && codeBtn.parentElement) {
      return { container: codeBtn.parentElement, referenceNode: codeBtn };
    }

    // 4. Legacy .file-navigation bar
    const fileNav = document.querySelector(".file-navigation");
    if (fileNav) {
      return { container: fileNav, referenceNode: null };
    }

    return null;
  }

  /**
   * Inject Index Button into GitHub DOM
   */
  function injectIndexButton() {
    const repoDetails = parseRepoDetails();
    if (!repoDetails) return;

    // Idempotency: Skip if button already exists in DOM
    if (document.getElementById(BUTTON_ID) || document.getElementById("structural-index-btn")) {
      return;
    }

    const targetInfo = getTargetContainer();
    if (!targetInfo || !targetInfo.container) {
      return;
    }

    const { container, referenceNode } = targetInfo;

    // Create wrapper & button element
    const wrapper = document.createElement("div");
    wrapper.className = "structurai-btn-container";

    const btn = document.createElement("button");
    btn.id = BUTTON_ID;
    btn.type = "button";
    btn.className = "structurai-index-btn";
    btn.title = "Index AST graph and explore in structur.aI visual debugger";
    btn.innerHTML = `
      <span class="structurai-btn-icon">⚡</span>
      <span>Index in structur.aI</span>
    `;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleIndexRepository(btn, repoDetails);
    });

    wrapper.appendChild(btn);

    // Insert adjacent to reference node or append to container
    if (referenceNode && referenceNode.parentElement === container) {
      container.insertBefore(wrapper, referenceNode);
    } else {
      container.appendChild(wrapper);
    }

    console.log(`[structur.aI] Button injected successfully next to Code action for ${repoDetails.fullName}`);
  }

  // Initial Injection
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectIndexButton);
  } else {
    injectIndexButton();
  }

  // GitHub SPA & Turbo / PJAX lifecycle listeners
  window.addEventListener("turbo:load", injectIndexButton);
  window.addEventListener("turbo:render", injectIndexButton);
  window.addEventListener("pjax:end", injectIndexButton);
  window.addEventListener("popstate", injectIndexButton);

  // MutationObserver fallback to catch dynamic React / client-side rendering
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      injectIndexButton();
    } else if (!document.getElementById(BUTTON_ID) && parseRepoDetails()) {
      injectIndexButton();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
