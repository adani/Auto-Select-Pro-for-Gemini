const enabledToggle = document.getElementById("enabledToggle");
const statusText = document.getElementById("statusText");

function setStatus(text) {
  statusText.textContent = text;
}

function getFriendlyTime(timestamp) {
  if (!timestamp) {
    return "no recent activity";
  }

  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

async function getActiveGeminiTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const active = tabs[0];
  if (!active || !active.url) {
    return null;
  }

  if (active.url.startsWith("https://gemini.google.com/app")) {
    return active;
  }

  return null;
}

async function pushToggleToActiveTab(value) {
  const tab = await getActiveGeminiTab();
  if (!tab || typeof tab.id !== "number") {
    return false;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "GEMINI_PRO_SELECTOR_SET_ENABLED",
      enabled: value
    });
    return true;
  } catch (_error) {
    return false;
  }
}

async function refreshStatus(enabled) {
  const data = await chrome.storage.local.get({ lastLog: null });
  const lastLog = data.lastLog;

  const state = enabled ? "Enabled" : "Disabled";
  const log = lastLog
    ? `Last event: ${lastLog.message} at ${getFriendlyTime(lastLog.timestamp || lastLog.recordedAt)}`
    : "Last event: none";

  setStatus(`${state}. ${log}`);
}

async function initPopup() {
  const syncData = await chrome.storage.sync.get({ enabled: true });
  const enabled = syncData.enabled !== false;
  enabledToggle.checked = enabled;
  await refreshStatus(enabled);

  enabledToggle.addEventListener("change", async () => {
    const nextValue = enabledToggle.checked;
    await chrome.storage.sync.set({ enabled: nextValue });
    await pushToggleToActiveTab(nextValue);
    await refreshStatus(nextValue);
  });
}

initPopup().catch((error) => {
  setStatus(`Failed to load popup: ${String(error)}`);
});
