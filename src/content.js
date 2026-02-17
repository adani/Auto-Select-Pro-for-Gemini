(function runGeminiProSelector() {
  const selectors = window.GeminiProSelectors;
  if (!selectors) {
    return;
  }

  const MAX_RETRIES = 3;
  const RETRY_DELAYS_MS = [400, 800, 1600];
  const WARNING_ID = "gemini-pro-selector-warning";

  let enabled = true;
  let observer = null;
  let modeClickListenerAttached = false;
  let scheduleTimer = null;
  let inFlight = null;

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function log(level, message, extra) {
    chrome.runtime.sendMessage({
      type: "GEMINI_PRO_SELECTOR_LOG",
      payload: {
        level,
        message,
        extra: extra || null,
        href: location.href,
        timestamp: Date.now()
      }
    }).catch(() => {
      // Ignore send-message issues when extension service worker is unavailable.
    });
  }

  async function readEnabledState() {
    const data = await chrome.storage.sync.get({ enabled: true });
    return data.enabled !== false;
  }

  function removeWarning() {
    const warning = document.getElementById(WARNING_ID);
    if (warning) {
      warning.remove();
    }
  }

  function showWarning(message) {
    removeWarning();
    const warning = document.createElement("div");
    warning.id = WARNING_ID;
    warning.textContent = message;
    warning.style.position = "fixed";
    warning.style.top = "12px";
    warning.style.right = "12px";
    warning.style.zIndex = "2147483647";
    warning.style.background = "rgba(165, 18, 18, 0.95)";
    warning.style.color = "#fff";
    warning.style.padding = "10px 12px";
    warning.style.borderRadius = "8px";
    warning.style.fontSize = "12px";
    warning.style.fontFamily = "system-ui, sans-serif";
    warning.style.maxWidth = "320px";
    warning.style.boxShadow = "0 6px 14px rgba(0, 0, 0, 0.2)";
    warning.textContent = message;
    document.body.appendChild(warning);
  }

  function closeModeMenu() {
    document.body.click();
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true
      })
    );
  }

  async function focusPromptTextbox() {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const promptTextbox = selectors.getPromptTextboxElement();
      if (promptTextbox) {
        promptTextbox.click();
        promptTextbox.focus({ preventScroll: true });

        if (promptTextbox.matches(":focus") || document.activeElement === promptTextbox) {
          return true;
        }
      }

      await sleep(120);
    }

    return false;
  }

  async function trySelectProOnce() {
    const modeButton = selectors.getModePickerButton();
    if (!modeButton) {
      return { ok: false, reason: "mode-button-missing" };
    }

    if (selectors.isProModeActive(modeButton)) {
      return { ok: true, reason: "already-pro" };
    }

    if (!selectors.isModeMenuOpen(modeButton)) {
      modeButton.click();
      await sleep(140);
    }

    const proOption = selectors.getProOptionElement();
    if (!proOption) {
      closeModeMenu();
      return { ok: false, reason: "pro-option-missing" };
    }

    if (proOption.getAttribute("aria-checked") === "true") {
      closeModeMenu();
      return { ok: true, reason: "already-pro-checked" };
    }

    proOption.click();
    await sleep(240);

    const switched = selectors.isProModeActive();
    return {
      ok: switched,
      reason: switched ? "selected-pro" : "switch-not-confirmed"
    };
  }

  async function ensureProMode(reason) {
    if (!enabled) {
      removeWarning();
      return false;
    }

    if (inFlight) {
      return inFlight;
    }

    inFlight = (async () => {
      let lastFailure = "unknown";

      for (let retry = 0; retry <= MAX_RETRIES; retry += 1) {
        if (retry > 0) {
          await sleep(RETRY_DELAYS_MS[retry - 1]);
        }

        const result = await trySelectProOnce();
        if (result.ok) {
          if (result.reason === "selected-pro") {
            const focused = await focusPromptTextbox();
            if (!focused) {
              log("warn", "Switched to Pro but prompt textbox was not focused", { reason });
            }
          }

          removeWarning();
          log("info", "Pro mode ensured", { reason, attempt: retry + 1, outcome: result.reason });
          return true;
        }

        lastFailure = result.reason;
      }

      showWarning("Auto-Select Pro for Gemini: Pro mode is unavailable right now. Retried 3 times.");
      log("warn", "Failed to enforce Pro mode", { reason, lastFailure });
      return false;
    })();

    try {
      return await inFlight;
    } finally {
      inFlight = null;
    }
  }

  function scheduleEnsure(reason, immediate) {
    if (!enabled) {
      return;
    }

    if (scheduleTimer) {
      window.clearTimeout(scheduleTimer);
      scheduleTimer = null;
    }

    const delay = immediate ? 0 : 120;
    scheduleTimer = window.setTimeout(() => {
      const modeButton = selectors.getModePickerButton();
      if (selectors.isFastModeActive(modeButton)) {
        ensureProMode(reason).catch((error) => {
          log("error", "ensureProMode threw", { reason, error: String(error) });
        });
      }
    }, delay);
  }

  function setupMutationObserver() {
    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver(() => {
      scheduleEnsure("dom-mutation", false);
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-expanded", "aria-checked", "class", "data-test-id"]
    });
  }

  function attachFastModeClickListener() {
    if (modeClickListenerAttached) {
      return;
    }

    document.addEventListener(
      "click",
      (event) => {
        if (!enabled) {
          return;
        }

        const target = event.target instanceof Element ? event.target.closest("button,[role='menuitemradio']") : null;
        if (!target) {
          return;
        }

        const testId = target.getAttribute("data-test-id") || "";
        const text = selectors.normalizeText(target.textContent);
        if (/mode-option-fast/i.test(testId) || /^fast\b/i.test(text)) {
          scheduleEnsure("fast-click", true);
        }
      },
      true
    );

    modeClickListenerAttached = true;
  }

  function setupRuntimeListeners() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (!message) {
        return;
      }

      if (message.type === "GEMINI_PRO_SELECTOR_SET_ENABLED") {
        enabled = Boolean(message.enabled);
        if (enabled) {
          scheduleEnsure("popup-enable", true);
        } else {
          removeWarning();
        }
        sendResponse({ ok: true, enabled });
      }
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync" || !changes.enabled) {
        return;
      }

      enabled = changes.enabled.newValue !== false;
      if (enabled) {
        scheduleEnsure("storage-enable", true);
      } else {
        removeWarning();
      }
    });
  }

  async function init() {
    enabled = await readEnabledState();
    setupMutationObserver();
    attachFastModeClickListener();
    setupRuntimeListeners();

    if (enabled) {
      scheduleEnsure("initial-load", true);
    }
  }

  init().catch((error) => {
    log("error", "Initialization failed", { error: String(error) });
  });
})();
