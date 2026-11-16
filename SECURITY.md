# Security Policy & Architecture Overview

> **Transparency Notice (100% AI-Coded):**  
> MetaFold is **100% AI-coded** under human architectural guidance, review, and testing. Because the codebase is AI-generated, this project explicitly relies on automated static analysis, Electron security checks, dependency auditing, and minimal trust boundaries rather than "security by obscurity".

---

## Security Model & Trust Boundaries

1. **No MetaFold Backend, Zero Telemetry, Explicit Server Integrations**
   - MetaFold runs locally as an Electron desktop application. There are **no** MetaFold-operated servers, **no** cloud accounts, and **no** hidden telemetry or analytics uploads.
   - **Outbound connections only on explicit user action:** Metadata and integration payloads are sent **only** to servers explicitly configured and triggered by the user:
     - **Institutional ELN / Repository integrations:** **OMERO**, **eLabFTW**, and **RSpace** (typically self-hosted institutional HTTPS endpoints).
     - **Community Templates (optional):** Reading public template indexes from GitHub; template submissions open a pre-filled GitHub Issue in the user's browser with local file paths and usernames stripped.
   - **Transport & Proxy Security:**
     - Outbound HTTPS connections enforce TLS certificate validation by default (`rejectUnauthorized: true` in `src/js/proxyManager.js`; self-signed development certificates require explicit opt-in).
     - The local OMERO CORS/CSRF proxy operates on `localhost` only and restricts `Access-Control-Allow-Origin` to `localhost` / `127.0.0.1` origins.
     - Server credentials and API tokens are transmitted only to their respective configured endpoint.

2. **Non-Destructive Data Handling**
   - MetaFold creates folder structures and metadata files (`README.html`, metadata JSON / RO-Crate files) in user-selected target directories.
   - Existing raw research data is not modified, overwritten, or deleted by metadata workflows.

3. **Encrypted Credential Storage**
   - Passwords and API keys are **never** stored in plain text in `localStorage` or config files.
   - Sensitive credentials are handled by `secureStorage` (`src/js/secureStorage.js`) using Electron's `safeStorage` API (OS-level encryption: Windows DPAPI, macOS Keychain, or Linux Secret Service) with user-specific entropy.
   - Non-sensitive UI display identifiers (such as username history and group names for the local user switcher) are stored separately in `localStorage`.

4. **Electron Process Isolation**
   - `BrowserWindow` is configured with `nodeIntegration: false` and `contextIsolation: true` (`src/main.js`).
   - Renderer-to-main communication is mediated through `src/preload.js`.

---

## Automated Security Checks

This repository uses automated, publicly verifiable security checks on `main` and pull requests:

| Check | Purpose | Configuration |
| :--- | :--- | :--- |
| **GitHub CodeQL (SAST)** | Static analysis for XSS, injection, CORS, TLS, and unsafe data flows | GitHub Code Scanning (Default Setup) |
| **Electronegativity** | Electron-specific security audit (`BrowserWindow`, `preload`, IPC, CSP) | [`.github/workflows/security.yml`](.github/workflows/security.yml) |
| **Gitleaks** | Secret scanning across code and Git history | [`.github/workflows/security.yml`](.github/workflows/security.yml) |
| **npm audit** | Known vulnerability (CVE) check for `src/package-lock.json` | [`.github/workflows/security.yml`](.github/workflows/security.yml) |
| **Dependabot** | Automated dependency & GitHub Actions update PRs (monthly) | [`.github/dependabot.yml`](.github/dependabot.yml) |

---

## Reporting a Vulnerability

If you discover a security issue in MetaFold:
1. Please report it privately via **GitHub Security Advisories** (*Security → Advisories → Report a vulnerability*) rather than opening a public issue with exploit details.
2. Include the affected file/component, steps to reproduce, and potential impact.
