import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json version
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));
const version = packageJson.version;

// Read manifest.json
const manifestPath = join(__dirname, '../manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

// Update manifest version
manifest.version = version;

// Write back to manifest.json
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log(`✅ Synced version ${version} to manifest.json`);