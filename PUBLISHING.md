# Publishing Guide: VS Code Marketplace

This guide walks you through publishing the Local CSS IntelliSense extension to the VS Code Marketplace.

## Prerequisites

1. **Azure DevOps Account**: You need a Microsoft/Azure DevOps account
2. **Personal Access Token (PAT)**: Create a PAT with Marketplace management permissions
3. **Publisher Account**: Create a publisher ID (if you don't have one)

## Step 1: Create a Publisher Account

1. Go to [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage)
2. Sign in with your Microsoft account
3. Click **"Create Publisher"**
4. Fill in the publisher details:
   - **Publisher ID**: `local-css-sense` (must match your package.json)
   - **Publisher Name**: Your publisher name
   - **Support URL**: (optional) Your support/contact URL
   - **Logo**: (optional) Upload a logo image

## Step 2: Create a Personal Access Token (PAT)

1. Go to [Azure DevOps](https://dev.azure.com)
2. Click on your profile icon → **Security**
3. Click **"New Token"** or go to [User Settings → Personal Access Tokens](https://dev.azure.com/_usersSettings/tokens)
4. Create a new token with:
   - **Name**: "VS Code Marketplace Publishing"
   - **Organization**: Select your organization (or "All accessible organizations")
   - **Expiration**: Set appropriate expiration (90 days recommended)
   - **Scopes**: Select **"Custom defined"** → **"Marketplace"** → **"Manage"**
5. Click **"Create"** and **copy the token immediately** (you won't see it again)

## Step 3: Install vsce (if not already installed)

The extension already has `@vscode/vsce` as a dev dependency, but you can also install it globally:

```bash
npm install -g @vscode/vsce
```

## Step 4: Login to Marketplace

```bash
vsce login <your-publisher-id>
```

When prompted, enter your Personal Access Token (PAT).

**Example:**
```bash
vsce login local-css-sense
```

## Step 5: Verify Your Package

Before publishing, verify your package is ready:

```bash
# Check package contents
vsce ls

# Validate package.json
vsce verify
```

## Step 6: Publish the Extension

### Option A: Publish Directly (Recommended)

```bash
vsce publish
```

This will:
1. Run the `vscode:prepublish` script (compiles TypeScript)
2. Package the extension
3. Publish to the marketplace
4. Automatically increment the version (patch version)

### Option B: Publish a Specific Version

```bash
vsce publish <version>
```

**Example:**
```bash
vsce publish 0.1.0
```

### Option C: Publish Without Version Bump

```bash
vsce publish --no-update-package-json
```

## Step 7: Verify Publication

1. Go to [Visual Studio Marketplace](https://marketplace.visualstudio.com/vscode)
2. Search for "Local CSS IntelliSense"
3. Your extension should appear in the search results
4. Click on it to view the marketplace page

## Updating the Extension

For future updates:

1. Update the version in `package.json` (or let `vsce publish` do it automatically)
2. Update `CHANGELOG.md` with the new changes
3. Run `vsce publish` again

**Version Format**: Follow [Semantic Versioning](https://semver.org/)
- **Major** (1.0.0): Breaking changes
- **Minor** (0.2.0): New features, backward compatible
- **Patch** (0.1.1): Bug fixes, backward compatible

## Troubleshooting

### Error: "Publisher ID doesn't match"

Make sure the `publisher` field in `package.json` matches your publisher ID:
```json
{
  "publisher": "local-css-sense"
}
```

### Error: "Extension with the same version already exists"

Either:
- Increment the version in `package.json`
- Or use `vsce publish --no-update-package-json` with a new version

### Error: "Personal Access Token expired"

Create a new PAT and login again:
```bash
vsce login local-css-sense
```

### Warning: "Repository field missing"

This is just a warning. If you have a repository, add it to `package.json`:
```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/localCssSense.git"
  }
}
```

Or use `--allow-missing-repository` flag:
```bash
vsce publish --allow-missing-repository
```

## Package Contents

Your `.vsix` package includes:
- ✅ `package.json` - Extension manifest
- ✅ `README.md` - Marketplace description
- ✅ `LICENSE` - MIT License
- ✅ `CHANGELOG.md` - Version history
- ✅ `out/` - Compiled JavaScript files
- ✅ `tsconfig.json` - TypeScript configuration

## Next Steps After Publishing

1. **Test Installation**: Install your extension from the marketplace in a fresh VS Code instance
2. **Monitor Reviews**: Check the marketplace for user reviews and ratings
3. **Respond to Issues**: Monitor GitHub issues (if you have a repository)
4. **Update Documentation**: Keep README.md and CHANGELOG.md up to date

## Resources

- [VS Code Extension Publishing Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [vsce CLI Documentation](https://github.com/microsoft/vscode-vsce)
- [Marketplace Management Portal](https://marketplace.visualstudio.com/manage)
- [Semantic Versioning](https://semver.org/)

## Current Package Status

✅ **Ready to Publish**
- Package built: `local-css-intellisense-0.1.0.vsix`
- All required files present
- TypeScript compiled successfully
- Package size: ~54 KB

You're all set! Run `vsce publish` when ready to publish to the marketplace.

