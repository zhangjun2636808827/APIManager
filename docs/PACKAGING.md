# Windows Packaging Guide

This document explains how to package API Manager as a Windows desktop app that can run on another computer without installing the development environment.

## Short Answer

If another computer receives only the source code, it still needs Node.js, npm, Rust, and the Tauri build environment.

If another computer receives the built `.exe` app or installer, it does not need Node.js, npm, Rust, or frontend dependencies.

## Recommended Distribution

The recommended artifact is the NSIS installer:

```text
src-tauri\target\release\bundle\nsis\*.exe
```

This is the best option for normal Windows usage. The user can double-click the installer and run the app after installation.

## Portable App Binary

Tauri also generates the main executable:

```text
src-tauri\target\release\api-manager.exe
```

You can usually copy this file to another Windows computer and run it directly. Notes:

- It is not an installer.
- It will not create Start Menu or desktop shortcuts.
- The target computer may need Microsoft Edge WebView2 Runtime.
- Most Windows 10 and Windows 11 computers already have WebView2 Runtime installed.

If you want the least support trouble, distribute the NSIS installer.

## Build Requirements

Only the development computer needs these tools:

- Node.js 18 or newer
- npm
- Rust toolchain
- Tauri 2 Windows build dependencies
- Microsoft Edge WebView2 Runtime

The target computer does not need the development tools.

## Build Commands

Run these commands from the project root:

```powershell
npm install
npm run package:windows
```

Equivalent command:

```powershell
npm run tauri:build
```

## Build Output

After a successful build, check these paths:

```text
src-tauri\target\release\api-manager.exe
src-tauri\target\release\bundle\nsis\
```

Recommended file to share:

```text
src-tauri\target\release\bundle\nsis\*.exe
```

## How To Run On Another Computer

Recommended installer flow:

1. Copy `src-tauri\target\release\bundle\nsis\*.exe` to the target computer.
2. Double-click the installer.
3. Start API Manager from the Start Menu or desktop shortcut.

Portable binary flow:

1. Copy `src-tauri\target\release\api-manager.exe` to the target computer.
2. Double-click the executable.
3. If Windows reports a missing WebView2 Runtime, install Microsoft Edge WebView2 Runtime.

## API Key Safety

Do not commit or package real API keys into the repository.

API Manager stores provider settings on the user's local machine. A packaged build does not automatically include API keys from your development machine.

After distribution, each user should add their own API providers inside the app.

## GitHub Upload Notes

Do not upload these files or directories:

```text
node_modules/
dist/
src-tauri/target/
.env
.env.local
*.key
*.pem
*.pfx
*.p12
```

`src-tauri/target/` contains build outputs. It should usually stay out of Git. If you want to publish installers, upload them to GitHub Releases instead.

## Common Issues

### Why can source code not run directly on another computer?

Source code is not the final app. It must be built by Vite, compiled by Rust, and packaged by Tauri before it becomes a Windows executable.

### Why prefer the installer over only `api-manager.exe`?

The installer is closer to normal Windows software distribution. It handles installation location and shortcuts better than a single copied binary.

### What if the app cannot start on the target computer?

Check these first:

- Windows SmartScreen may block unsigned apps.
- Microsoft Edge WebView2 Runtime may be missing.
- Antivirus software may block unsigned binaries.
- The user may be running an incomplete build artifact.

### Will my API keys be shared with the build?

Normally no. Do not commit `.env` files, local app data, logs, or secret files. Do not manually copy local secret data into the release package.

