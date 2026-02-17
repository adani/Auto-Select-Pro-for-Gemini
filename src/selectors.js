(function attachGeminiProSelectors() {
  const MODE_PICKER_SELECTORS = [
    '[data-test-id="bard-mode-menu-button"]',
    'button[data-test-id*="mode-menu"]',
    'button[aria-label*="mode" i]',
    'bard-mode-switcher button',
    'button.input-area-switch'
  ];

  const PRO_OPTION_SELECTORS = [
    '[data-test-id="bard-mode-option-pro"]',
    '[role="menuitemradio"][data-test-id*="mode-option-pro"]',
    '[role="menuitemradio"][data-test-id*="pro"]'
  ];

  const FAST_OPTION_SELECTORS = [
    '[data-test-id="bard-mode-option-fast"]',
    '[role="menuitemradio"][data-test-id*="mode-option-fast"]',
    '[role="menuitemradio"][data-test-id*="fast"]'
  ];

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function isElementVisible(element) {
    if (!element) {
      return false;
    }

    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function getFirstVisible(selectorList, root) {
    const scope = root || document;
    for (const selector of selectorList) {
      const candidates = Array.from(scope.querySelectorAll(selector));
      const visible = candidates.find((candidate) => isElementVisible(candidate));
      if (visible) {
        return visible;
      }
    }
    return null;
  }

  function getModePickerButton() {
    const bySelector = getFirstVisible(MODE_PICKER_SELECTORS);
    if (bySelector) {
      return bySelector;
    }

    const allButtons = Array.from(document.querySelectorAll('button,[role="button"]'));
    return allButtons.find((button) => {
      const label = normalizeText(button.getAttribute("aria-label"));
      const text = normalizeText(button.textContent);
      return /open mode picker|mode picker/i.test(label) || /\b(fast|pro|thinking)\b/i.test(text);
    }) || null;
  }

  function getModeButtonLabelText(button) {
    const modeButton = button || getModePickerButton();
    if (!modeButton) {
      return "";
    }

    const candidates = [
      modeButton.querySelector('[data-test-id="logo-pill-label-container"] span'),
      modeButton.querySelector('.input-area-switch-label span'),
      modeButton.querySelector('span:not(.mat-mdc-button-touch-target)')
    ].filter(Boolean);

    for (const candidate of candidates) {
      const text = normalizeText(candidate.textContent);
      if (/^(fast|pro|thinking)$/i.test(text)) {
        return text;
      }
    }

    const fallback = normalizeText(modeButton.textContent);
    const match = fallback.match(/\b(Fast|Pro|Thinking)\b/i);
    return match ? match[1] : "";
  }

  function isProModeActive(button) {
    return /^pro$/i.test(getModeButtonLabelText(button));
  }

  function isFastModeActive(button) {
    return /^fast$/i.test(getModeButtonLabelText(button));
  }

  function isThinkingModeActive(button) {
    return /^thinking$/i.test(getModeButtonLabelText(button));
  }

  function getModeMenuRoot(button) {
    const modeButton = button || getModePickerButton();
    if (modeButton) {
      const controlsId = modeButton.getAttribute("aria-controls");
      if (controlsId) {
        const controlledPanel = document.getElementById(controlsId);
        if (controlledPanel) {
          return controlledPanel;
        }
      }
    }

    const openMenus = Array.from(document.querySelectorAll('[role="menu"], .mat-mdc-menu-panel, .cdk-overlay-pane')).filter(
      (menu) => isElementVisible(menu) && /fast|pro/i.test(normalizeText(menu.textContent))
    );

    return openMenus[0] || document;
  }

  function getMenuOption(optionSelectors, fallbackTextMatcher) {
    const root = getModeMenuRoot();
    const direct = getFirstVisible(optionSelectors, root);
    if (direct) {
      return direct;
    }

    const menuItems = Array.from(root.querySelectorAll('[role="menuitemradio"],button,[role="option"]')).filter(
      isElementVisible
    );

    return menuItems.find((item) => fallbackTextMatcher.test(normalizeText(item.textContent))) || null;
  }

  function getProOptionElement() {
    return getMenuOption(PRO_OPTION_SELECTORS, /\bpro\b/i);
  }

  function getFastOptionElement() {
    return getMenuOption(FAST_OPTION_SELECTORS, /\bfast\b/i);
  }

  function isModeMenuOpen(button) {
    const modeButton = button || getModePickerButton();
    if (!modeButton) {
      return false;
    }

    return modeButton.getAttribute("aria-expanded") === "true";
  }

  window.GeminiProSelectors = {
    normalizeText,
    getModePickerButton,
    getModeButtonLabelText,
    getModeMenuRoot,
    getProOptionElement,
    getFastOptionElement,
    isModeMenuOpen,
    isFastModeActive,
    isThinkingModeActive,
    isProModeActive
  };
})();
