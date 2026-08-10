/**
 * structur.aI — Visual Logic Debugger & AST Indexer
 * GitHub Content Script (Manifest V3)
 */

(function () {
  "use strict";

  const BACKEND_API_BASE = "http://localhost:5001";
  const FRONTEND_APP_BASE = "http://localhost:5173";
  const BUTTON_ID = "structurai-index-btn";
  const TOAST_ID = "structurai-toast";

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

    const payload = {
      name: repoDetails.repo,
      fullName: repoDetails.fullName,
      cloneUrl: `https://github.com/${repoDetails.fullName}.git`,
      defaultBranch: "main",
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${BACKEND_API_BASE}/api/repositories`, {
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
          ? `${FRONTEND_APP_BASE}/repository/${repositoryId}`
          : `${FRONTEND_APP_BASE}/dashboard`;
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
        showToast("❌ Could not connect to structur.aI backend on localhost:5001", true);
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
   * Inject Index Button into GitHub DOM
   */
  function injectIndexButton() {
    const repoDetails = parseRepoDetails();
    if (!repoDetails) return;

    // Idempotency: Skip if button already exists in DOM
    if (document.getElementById(BUTTON_ID)) return;

    // Target candidate containers in priority order
    const fileNav = document.querySelector(".file-navigation");
    const pageheadActions = document.querySelector("ul.pagehead-actions");
    const headerBox = document.querySelector("#repository-container-header div[data-component='Box']");

    const container = fileNav || pageheadActions || headerBox;
    if (!container) return;

    // Create wrapper & button element
    const wrapper = document.createElement(pageheadActions && container === pageheadActions ? "li" : "div");
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

    // Insert cleanly into selected target
    if (fileNav && container === fileNav) {
      fileNav.appendChild(wrapper);
    } else if (pageheadActions && container === pageheadActions) {
      pageheadActions.insertBefore(wrapper, pageheadActions.firstChild);
    } else {
      container.appendChild(wrapper);
    }

    console.log(`[structur.aI] Button injected successfully for ${repoDetails.fullName}`);
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
