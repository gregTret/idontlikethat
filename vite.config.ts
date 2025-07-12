import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        contentScript: resolve(__dirname, 'src/contentScript.ts'),
        background: resolve(__dirname, 'src/background.ts'),
        popup: resolve(__dirname, 'src/popup.html')
      },
      output: {
        entryFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          // Handle popup.html to be in root of dist
          if (assetInfo.name === 'src/popup.html') {
            return 'popup.html';
          }
          return '[name][extname]';
        }
      }
    },
    outDir: 'dist',
    emptyOutDir: true
  },
  plugins: [
    {
      name: 'copy-manifest',
      writeBundle() {
        // Copy manifest.json to dist
        fs.copyFileSync('manifest.json', 'dist/manifest.json');
        // Copy icon files to dist
        if (fs.existsSync('icon16.png')) {
          fs.copyFileSync('icon16.png', 'dist/icon16.png');
        }
        if (fs.existsSync('icon48.png')) {
          fs.copyFileSync('icon48.png', 'dist/icon48.png');
        }
        if (fs.existsSync('icon128.png')) {
          fs.copyFileSync('icon128.png', 'dist/icon128.png');
        }
        // Move popup.html from src folder to root of dist
        if (fs.existsSync('dist/src/popup.html')) {
          fs.copyFileSync('dist/src/popup.html', 'dist/popup.html');
          // Remove the src directory
          fs.rmSync('dist/src', { recursive: true, force: true });
        }
      }
    }
  ]
});