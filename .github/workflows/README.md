# GitHub Actions Workflow

This repository includes an automated workflow for building and releasing the Chrome extension.

## Automatic Releases

The workflow triggers automatically when you push to the `main` branch and will:

1. **Bump the version** - Automatically increments the patch version (e.g., 1.0.0 → 1.0.1)
2. **Update manifest.json** - Syncs the version number in manifest.json
3. **Build the extension** - Runs `npm run build`
4. **Package the extension** - Creates a ZIP file ready for Chrome Web Store
5. **Create a GitHub Release** - Tags the commit and creates a release with the ZIP file
6. **Generate changelog** - Automatically creates a changelog from commit messages

## Manual Release with Version Control

You can also trigger the workflow manually from the Actions tab to control the version bump type:

1. Go to the [Actions tab](../../actions)
2. Select "Build and Release Extension"
3. Click "Run workflow"
4. Choose version bump type:
   - **patch**: 1.0.0 → 1.0.1 (bug fixes)
   - **minor**: 1.0.0 → 1.1.0 (new features)
   - **major**: 1.0.0 → 2.0.0 (breaking changes)

## Local Development

For local packaging without GitHub Actions:

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Package manually
zip -r extension.zip dist/ manifest.json icon*.png
```

## Important Notes

- The workflow uses `[skip ci]` in the version bump commit to avoid infinite loops
- Version numbers are synchronized between package.json and manifest.json
- Releases are automatically tagged as `v{version}` (e.g., v1.0.1)
- The packaged ZIP file is attached to each release