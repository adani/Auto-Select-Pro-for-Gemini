# Auto-Select Pro for Gemini

Chrome extension that keeps Gemini mode set to **Pro** on `https://gemini.google.com/app`.

## What it does

- Runs only on `https://gemini.google.com/app`.
- On page load, tries to switch the mode to **Pro**.
- If mode changes back to **Fast**, it immediately tries to switch to **Pro** again.
- If you manually choose **Thinking**, it does not force-switch back to Pro.
- If **Pro** is unavailable, retries **3 times** and shows a small in-page warning.
- Provides a popup toggle to enable/disable enforcement.

## Installation

### Load extension locally

0. Clone this repository
1. Open Chrome/Brave and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.

## License

This project is licensed under Creative Commons Attribution 4.0 International.

## Disclaimer

This software is provided as-is, without warranty of any kind.
