# Font Replacer - Chrome Extension

A Chrome browser extension that replaces specified fonts (Microsoft YaHei, MiSans, PingFang, Meiryo, Malgun Gothic, Sarabun, Segoe UI, etc.) with `system-ui` on web pages — covering Simplified/Traditional Chinese, Japanese, Korean, Thai, Vietnamese, and Latin/English font stacks.

## Features

- Targeted replacement: only replaces elements using specified fonts, leaving other fonts untouched
- International font coverage: CN / HK / TW / JP / KR / TH / VI / EN font stacks
- Site blocklist: never applies on excluded sites (ChatGPT, Claude by default), with a user-extensible custom blocklist
- Real-time monitoring: watches DOM changes and applies replacement to dynamically loaded content
- Multi-language support: UI available in 49 locales
- Enable/disable toggle via extension popup
- Dark mode support in popup UI

## Installation

### Developer Mode (Recommended)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select the extension folder
5. The extension will appear in your extensions list

### Packaged File

1. On the Chrome extensions page, click "Pack extension"
2. Select the extension folder to generate a `.crx` file
3. Drag the `.crx` file onto the Chrome extensions page

## Usage

1. After installation, an icon appears in the browser toolbar
2. Visit any web page — elements using targeted fonts will be automatically replaced with `system-ui` (excluded sites such as ChatGPT / Claude are skipped)
3. Click the extension icon to toggle font replacement on/off
4. Use the language selector to switch the popup UI language

## How It Works

1. Scans all DOM elements and checks their computed `font-family`
2. If an element's font matches any target font (e.g., Microsoft YaHei, Meiryo, Malgun Gothic, Segoe UI), it's marked with a `data-force-font` attribute
3. A CSS rule `[data-force-font] { font-family: system-ui, sans-serif !important; }` handles the actual replacement
4. A `MutationObserver` watches for new elements and applies the same logic
5. Icon elements are automatically skipped to preserve their icon fonts

### Target Fonts

Fonts are organized by script/region in the `targetFonts` array in `content.js`:

| Region | Representative fonts |
|---|---|
| Simplified Chinese (CN) | Microsoft YaHei / 微软雅黑, DengXian / 等线, MiSans, SimSun / 宋体, SimHei / 黑体, KaiTi / 楷体, FangSong / 仿宋, PingFang SC, Noto Sans SC, Source Han Sans SC / 思源黑体, HarmonyOS Sans |
| Traditional Chinese (HK/TW) | Microsoft JhengHei / 微軟正黑體, PMingLiU / 新細明體, DFKai-SB / 標楷體, PingFang TC/HK, Heiti TC / 黑體-繁, LiHei Pro, Noto Sans TC, Source Han Sans TC/HK, Taipei Sans TC |
| Japanese (JP) | Meiryo, Yu Gothic / Yu Mincho, MS PGothic / ＭＳ Ｐゴシック, Hiragino Kaku Gothic / Mincho / Maru Gothic, Noto Sans JP, Source Han Sans JP, Osaka |
| Korean (KO) | Malgun Gothic / 맑은 고딕, NanumGothic / 나눔고딕, Apple SD Gothic Neo, Noto Sans KR, Source Han Sans KR, Batang / 바탕, Gulim / 굴림, Dotum / 돋움 |
| Thai (TH) | Sukhumvit Set, Leelawadee UI, TH Sarabun New, Angsana New, Cordia New, Noto Sans Thai, IBM Plex Sans Thai, Sarabun, Prompt, Kanit |
| Vietnamese (VI) | Be Vietnam / Be Vietnam Pro (plus Latin web fonts shared with EN) |
| English / Latin | Segoe UI, Helvetica, Arial, Tahoma, Verdana, Georgia, Times New Roman, SF Pro, Ubuntu, Noto Sans, plus popular web fonts (Roboto, Inter, Open Sans, Montserrat, Poppins, ...) |
| Generic | `sans-serif`, `ui-sans-serif`, `-apple-system`, `BlinkMacSystemFont` |

To add or remove target fonts, edit the `targetFonts` array in `content.js`.

### Site Blocklist

Font standardization is **never applied** on excluded sites. AI chat apps such as ChatGPT and Claude rely on their own tuned font stacks, so they are blocked by default:

- `chatgpt.com` (and all subdomains)
- `claude.ai` (and all subdomains)

The blocklist is enforced in two layers:

1. **Static** — `exclude_matches` in `manifest.json` prevents the content script and CSS from being injected at all.
2. **Runtime** — `blocked-sites.js` checks `location.hostname` again before doing anything, and also merges your custom blocklist from `chrome.storage.sync`:

```js
// Add custom excluded domains (e.g. via DevTools on the extension's service worker console)
chrome.storage.sync.set({ blockedDomains: ['example.com', 'sub.example.org'] });
```

When the active tab is an excluded site, the popup shows an amber dot with an "excluded site" status.

To change the default list, edit `DEFAULT_BLOCKED_DOMAINS` in `blocked-sites.js` **and** `exclude_matches` in `manifest.json` (then reload the extension).

## File Structure

```
├── _locales/                 # Localization files (49 locales)
│   ├── en/messages.json      # English
│   ├── zh_CN/messages.json   # Simplified Chinese
│   ├── zh_TW/messages.json   # Traditional Chinese
│   ├── ja/messages.json      # Japanese
│   ├── ko/messages.json      # Korean
│   └── ...
├── manifest.json             # Extension configuration (incl. exclude_matches blocklist)
├── blocked-sites.js          # Shared site blocklist (used by content script + popup)
├── content.css               # CSS rules (targeted replacement)
├── content.js                # Content script (main logic, international font lists)
├── popup.html                # Popup UI
├── popup.js                  # Popup logic (toggle + excluded-site status)
└── README.md
```

## Technical Implementation

- Manifest V3
- Content scripts inject CSS and JavaScript
- `MutationObserver` monitors DOM changes
- `getComputedStyle` checks element font-family
- `data-force-font` attribute marks elements for replacement
- Chrome Storage API for settings persistence
- CSS `@layer` support for priority management

## Compatibility

- Chrome 88+
- Chromium-based browsers (Edge, Opera, Brave, etc.)

## License

This project is for learning and personal use only.