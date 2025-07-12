import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'fs';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function packageExtension() {
  try {
    // Read version from manifest
    const manifest = JSON.parse(await readFile(join(rootDir, 'manifest.json'), 'utf8'));
    const version = manifest.version;
    
    // Create output directory
    const outputDir = join(rootDir, 'releases');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    // Create zip filename
    const zipFilename = `i-dont-like-that-v${version}.zip`;
    const outputPath = join(outputDir, zipFilename);
    
    // Create a file to stream archive data to
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    // Pipe archive data to the file
    archive.pipe(output);
    
    // Add files to the archive
    archive.directory(join(rootDir, 'dist'), false);
    archive.file(join(rootDir, 'manifest.json'), { name: 'manifest.json' });
    archive.file(join(rootDir, 'icon16.png'), { name: 'icon16.png' });
    archive.file(join(rootDir, 'icon48.png'), { name: 'icon48.png' });
    archive.file(join(rootDir, 'icon128.png'), { name: 'icon128.png' });
    
    // Finalize the archive
    await archive.finalize();
    
    console.log(`✅ Extension packaged successfully!`);
    console.log(`📦 Package: ${outputPath}`);
    console.log(`📏 Size: ${(archive.pointer() / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error('❌ Error packaging extension:', error);
    process.exit(1);
  }
}

// Check if archiver is installed
try {
  await import('archiver');
} catch (e) {
  console.error('❌ archiver package not found. Installing...');
  const { execSync } = await import('child_process');
  execSync('npm install --save-dev archiver', { stdio: 'inherit' });
  console.log('✅ archiver installed. Please run the command again.');
  process.exit(0);
}

packageExtension();