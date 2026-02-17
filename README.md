# Gemini Pro Selector

Chrome extension (Manifest V3) that keeps Gemini mode set to **Pro** on `https://gemini.google.com/app`.

## What it does

- Runs only on `https://gemini.google.com/app`.
- On page load, tries to switch the mode to **Pro**.
- If mode changes back to **Fast**, it immediately tries to switch to **Pro** again.
- If you manually choose **Thinking**, it does not force-switch back to Pro.
- If **Pro** is unavailable, retries with exponential backoff **3 times** (`400ms`, `800ms`, `1600ms`) and shows a small in-page warning.
- Provides a popup toggle to enable/disable enforcement (stored with `chrome.storage.sync`).

These attributes are used first, with role/text fallbacks if layout/classes change.

## Project structure

```text
.
├── manifest.json
├── src
│   ├── background.js
│   ├── content.js
│   ├── popup.css
│   ├── popup.html
│   ├── popup.js
│   └── selectors.js
```

## Load extension locally

1. Open Chrome/Brave and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.

### Pack with Brave/Chrome (macOS)

1. Ensure your private key exists at `keys/gemini-pro-selector.pem`.
2. Run one of the following commands from the project root.

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --pack-extension="$PWD" \
    --pack-extension-key="$PWD/keys/gemini-pro-selector.pem"
```

```bash
"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
    --pack-extension="$PWD" \
    --pack-extension-key="$PWD/keys/gemini-pro-selector.pem"
```