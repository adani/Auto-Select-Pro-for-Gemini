const DEFAULT_SETTINGS = {
  enabled: true
};

async function ensureDefaultSettings() {
  const current = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  if (typeof current.enabled !== "boolean") {
    await chrome.storage.sync.set(DEFAULT_SETTINGS);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  ensureDefaultSettings().catch((error) => {
    console.error("Auto-Select Pro for Gemini: failed to set defaults on install", error);
  });
});

chrome.runtime.onStartup.addListener(() => {
  ensureDefaultSettings().catch((error) => {
    console.error("Auto-Select Pro for Gemini: failed to set defaults on startup", error);
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== "GEMINI_PRO_SELECTOR_LOG") {
    return;
  }

  const payload = {
    ...message.payload,
    recordedAt: Date.now()
  };

  chrome.storage.local.set({ lastLog: payload }).catch(() => {
    // Ignore storage-local failures for non-critical logs.
  });
});
