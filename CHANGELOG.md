# Changelog

All notable changes, new tools, and security/bug fixes for **MetaFold** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added
- **Security Policy (`SECURITY.md`):** Documented trust boundaries, local-first/explicit server integration model (OMERO, eLabFTW, RSpace, GitHub Community Templates), and OS-encrypted credential storage (`safeStorage`).
- **Automated Security CI (`.github/workflows/security.yml`):** Added Electronegativity (Electron security audit), Gitleaks (secret scanning), and `npm audit --omit=dev` checks on `main` and pull requests.
- **Automated Dependency Updates (`.github/dependabot.yml`):** Configured monthly Dependabot checks for npm (`src/`) and GitHub Actions.
- **Automated Release Versioning & Changelog Formatting (`.github/workflows/release.yml`):** Added `auto` patch-version bumping, automatic `Latest` tagging on `main`, and automatic `Pre-release` handling for suffixed test tags (e.g., `-beta.1`, `-rc.1`) or non-`main` branches.

### Changed
- **Electron Runtime & Build Tooling:** Upgraded `electron` from `38.2.2` to `45.3.2` and `electron-builder` from `26.0.12` to `26.18.0`.

### Security & Fixes
- **XSS & Sanitization Hardening:** Replaced unsafe `innerHTML` / unescaped fallbacks with `textContent`, DOM APIs, and full HTML/attribute escaping across `utils.js`, `projectInlineEditor.js`, `facetSearch.js`, `projectManager.js`, `templateModal.js`, `userManagementModal.js`, `loginModal.js`, `metadataEditor.js`, `communityManager.js`, `projectScanner.js`, `lineageTree.js`, `experimentForm.js`, `working-visualization-manager.js`, and `settings-modal.html`.
- **OMERO Proxy & Auth Hardening:** Restricted CORS `Access-Control-Allow-Origin` to an explicit `localhost` / `127.0.0.1` allowlist, enabled TLS certificate validation by default (`rejectUnauthorized: true`, with explicit opt-in for self-signed dev servers), fixed log format-string handling in `proxyManager.js`, and added `Secure` flag to `SameSite=None` cookies in `omeroAuth.js`.
- **Supply Chain & Crypto:** Added Subresource Integrity (`sha384`) hashes for CDN scripts in `src/index.html` and replaced `Math.random()` UUID fallback with `crypto.getRandomValues` in `projectManager.js`.
- **Codebase Cleanup:** Removed obsolete backup files (`proxyManager_neu.js`, `src/js/backup/userManager_old_func.js`, `src/js/backup/projectManager_old.js`, `omeroAuth_v12.js`, `omeroAuth_backup.js`, `metadataLoader_new_readme.js`).
