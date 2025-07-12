# I Don't Like That - Chrome Extension

A Chrome extension for providing UI feedback and generating prompts for improvements.

## Features

- Click any element on a page to add feedback
- Comments are saved locally for each page
- Generate AI prompts from your feedback
- Copy prompts to clipboard
- Export all comments as JSON
- Visual markers show where comments exist

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Load in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Usage

1. Click the blue chat bubble button (💬) on any webpage to enter selection mode
2. Click any element you want to comment on
3. Type your feedback and click Save
4. Your comments will appear as small markers next to elements
5. Click a marker to view, copy prompt, or delete the comment

## Icon Setup

The extension needs proper icon files. Either:
- Convert the included `icon.svg` to PNG at sizes 16x16, 48x48, and 128x128
- Create your own icons and save them as `icon16.png`, `icon48.png`, and `icon128.png`

## Development

- `npm run dev` - Start Vite in watch mode
- `npm run build` - Build for production

## Project Structure

- `src/contentScript.ts` - Main content script for element selection and comment UI
- `src/background.ts` - Background service worker
- `src/popup.ts` - Extension popup functionality
- `src/styles.css` - All overlay styles
- `src/types.ts` - TypeScript type definitions