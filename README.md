# Codeshare

Instantly share links to specific lines of code with universal URLs that work anywhere.

## Features

🚀 **Universal Code Sharing** - Generate web-accessible links to specific code selections that work in any browser

⌨️ **Keyboard Shortcut** - Quick access with `Cmd+Option+C` (Mac) or `Ctrl+Alt+C` (Windows/Linux)

🎯 **Precise Line Selection** - Share exact line ranges with automatic highlighting

🔗 **Git Integration** - Automatically detects repository information and file paths

📋 **One-Click Copy** - Generated links are instantly copied to your clipboard

## Installation

1. Open VS Code
2. Go to Extensions (`Cmd+Shift+X` on Mac, `Ctrl+Shift+X` on Windows/Linux)
3. Search for "codeshare"
4. Click Install

## Usage

### Method 1: Keyboard Shortcut (Recommended)
1. Select the code you want to share
2. Press `Cmd+Option+C` (Mac) or `Ctrl+Alt+C` (Windows/Linux)
3. The link is automatically copied to your clipboard!

### Method 2: Context Menu
1. Select the code you want to share
2. Right-click on the selection
3. Choose "Codeshare: Copy Link to Selection"

### What You Get

The extension generates a universal URL in this format:
```
https://codeshare.sarthaks.tech/l/{repo}/{file}/{lineRange}
```

**Example:**
```
https://codeshare.sarthaks.tech/l/aHR0cHM6Ly9naXRodWIuY29tL3VzZXIvcmVwby9naXQ=/c3JjL2V4dGVuc2lvbi50cw==/10-20
```

This URL can be:
- Opened in any web browser
- Shared via email, Slack, or any messaging platform
- Bookmarked for future reference
- Embedded in documentation

## How It Works: Two Powerful Modes

The CodeShare extension automatically adapts to your context.

**1. Git-Aware Mode (Default)**

If the file you share is part of a Git repository with a recognized remote (like `origin`), the extension creates a permanent, context-rich link. This link contains the repository URL, branch, file path, and line numbers.

**2. Stateless Snippet Mode (Fallback)**

If you share code from a file that isn't in a Git repository, the extension automatically creates a temporary, anonymous snippet link. This link contains only the code you selected and will expire after 24 hours. This ensures you can share code from *anywhere*.

## Requirements

- VS Code 1.90.0 or higher (including forks like Cursor, VSCodium).
- For full functionality (permanent, context-aware links), the shared file should be in a Git repository with a remote configured.
- An internet connection is required to generate links.

## Extension Settings

This extension doesn't add any VS Code settings. It works out of the box with your existing Git configuration.

## Known Issues

- Requires a Git repository with an "origin" remote
- Only works with files that are part of your workspace
- The generated links require the web application to be deployed and accessible

## Troubleshooting

**"No active editor found"**
- Make sure you have a file open in the editor

**"Please select code to share"**
- Select one or more lines of code before using the command

**"No 'origin' remote found"**
- Ensure your Git repository has an origin remote configured
- Run: `git remote add origin <your-repo-url>`

**"Repository not found in your open workspaces"**
- Make sure the repository is open in VS Code
- The repository URL must match exactly (including protocol)

## Release Notes

### 1.0.0
- Initial release with universal URL generation
- Keyboard shortcut support (`Cmd+Option+C` / `Ctrl+Alt+C`)
- Context menu integration
- Git repository detection
- Base64url encoding for special characters

## Contributing

Found a bug or have a feature request? Please open an issue on our [GitHub repository](https://github.com/Sarthakischill/codeshare-project.git).

## License

This extension is open source and available under the MIT License.

---

**Enjoy sharing your code effortlessly!** 🎉
