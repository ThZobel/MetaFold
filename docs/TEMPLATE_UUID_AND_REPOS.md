# MetaFold Template UUIDs, QR/DataMatrix Codes, Per-UUID User Defaults & Multi-Repository Contract

This document describes how MetaFold identifies templates across local installations, lab/institute GitHub repositories, the MetaFold Community repository, and future mobile/PWA scanner workflows (e.g., Zebra Android handhelds).

---

## 1. Template `uuid` Field

Each MetaFold template can carry a stable RFC 4122 v4 UUID in `uuid`:

```json
{
  "schemaVersion": "0.1",
  "schemaType": "metafold-template",
  "id": "template_1710000000_abc123",
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Confocal Microscopy"
}
```

Lifecycle rules:
- **Create / Save**: New templates automatically receive a lowercase v4 `uuid`. Legacy templates without a `uuid` receive one automatically the next time they are saved or uploaded (existing files are never rewritten on read).
- **Edit / Update / Download / Upload**: The existing `uuid` is preserved so printed QR/DataMatrix labels remain valid without version lock-in.
- **Duplicate / Copy / Save as New**: Generates a **new** `uuid` and records the source in `derivedFromTemplateUuid`.

Project metadata (`<ProjectName>-metadata.json`) records `template.uuid` (and `template.derivedFromTemplateUuid` when present) inside `template`.

---

## 2. Compact QR / DataMatrix Payload

To keep printed labels as small and robust as possible (especially DataMatrix on microscope stickers and sample tubes), MetaFold encodes only the compact URI without a hardcoded repository URL:

```text
metafold:tpl:<uuid>
```

Example:

```text
metafold:tpl:550e8400-e29b-41d4-a716-446655440000
```

`src/js/shared/templateUuid.js` (`parseTemplateCode`) accepts:
- `metafold:tpl:<uuid>`
- `metafold://template/<uuid>`
- Bare 36-character `<uuid>`
- Query/hash URLs with `templateUuid=<uuid>` or `tpl=<uuid>`

Both Desktop and PWA resolve the UUID against **the user's own local store and configured repositories**, so the same QR sticker can resolve from an internal lab repo for team members or from a public repo for external collaborators.

---

## 3. Offline-First Resolution Order

When scanning or entering a template code (`src/js/templateResolver.js`):

1. **Local own templates** (`~/MetaFold/Templates/<Group>/<User>/*.json`) — opened immediately offline.
2. **Local shared group templates** (`~/MetaFold/Templates/<Group>/<OtherUser>/*.json`) — opened immediately offline.
3. **Custom repositories** (in user-configured priority order, top to bottom) — fetches from index by `uuid`, downloads full JSON, and installs locally.
4. **Official MetaFold Community repository** (when enabled) — fallback remote lookup, downloads full JSON, and installs locally.

Once installed locally, subsequent scans hit Step 1 and work 100% offline.

---

## 4. Per-User Local Defaults Store (`user_defaults/<username>.json`)

Personal defaults (field values, `targetPath` / `basePath`, `projectName`, and integration toggles/category settings) are stored per user outside `Templates/` in:

```text
~/MetaFold/user_defaults/<sanitizedUsername>.json
```

Schema (`schemaType: "metafold-template-defaults"`):

```json
{
  "schemaVersion": "0.1",
  "schemaType": "metafold-template-defaults",
  "username": "Thomas",
  "updatedAt": "2026-11-20T15:00:00.000Z",
  "defaults": {
    "550e8400-e29b-41d4-a716-446655440000": {
      "templateName": "Confocal Microscopy",
      "fields": {
        "Operator": "Thomas",
        "Objective": "63x Oil"
      },
      "projectDefaults": {
        "targetPath": "D:\\Data\\Microscopy",
        "basePath": "D:\\Data\\Microscopy",
        "projectName": "2026_Confocal_"
      },
      "integrations": {
        "elabftwEnabled": true,
        "elabftw": {
          "defaultCategory": "12",
          "fetchNextId": true
        }
      },
      "updatedAt": "2026-11-20T15:00:00.000Z"
    }
  }
}
```

The future PWA can mirror the identical `defaults` map keyed by lowercase template `uuid` in `IndexedDB` / `localStorage`.

---

## 5. Multi-Repository Configuration & Private GitHub Tokens

In **Settings → General → 📦 Template Repositories**:

- **Supported URL inputs** (normalized automatically by `communityManager.normalizeRepositoryUrl`):
  - `https://github.com/<owner>/<repo>`
  - `https://github.com/<owner>/<repo>/tree/<branch>`
  - `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/templates-index.json`
  - Custom intranet/Gitea/GitLab HTTP(S) URLs pointing to `templates-index.json` or a folder containing it
- **`templates-index.json` entry format**:
  Each index entry should include `uuid` alongside `name`, `path`, `collection`, `category`/`type`, `tags`, `author`, `description`:

  ```json
  [
    {
      "id": "confocal_standard",
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Confocal Standard",
      "path": "Communities/Microscopy/confocal_standard.json",
      "category": "Experiments",
      "collection": "Microscopy",
      "tags": ["Confocal", "Microscopy"],
      "author": "Imaging Core"
    }
  ]
  ```

- **Private GitHub repositories (Access Token)**:
  - Each repository supports an optional GitHub Personal Access Token (recommended: fine-grained token with **Contents: Read-only** scoped to the template repository).
  - Tokens are **never** stored in plaintext inside `templates.repositories` or `users.json`. They are encrypted via `settingsManager.setTemplateRepoToken(repoId, token)` using Electron `safeStorage` + user-scoped entropy.
  - When a GitHub repository has a token configured, Electron Main Process (`fetch-repo-json` IPC) requests `https://api.github.com/repos/<owner>/<repo>/contents/<path>?ref=<branch>` with `Accept: application/vnd.github.raw+json` and `Authorization: Bearer <token>`.

---

## 6. Zebra ZPL II Label Output (e.g., Zebra ZD421t-HC)

The Template Label Code modal (`src/js/templateQrModal.js`) can copy or export native **ZPL II** commands so Zebra thermal printers render crisp codes directly in printer firmware:

- **Defaults**: `60 × 30 mm` label at **203 dpi** (8 dots/mm → `^PW480`, `^LL240`), with presets for `60 × 25 mm`, `60 × 40 mm`, `25 × 13 mm`, and `300 dpi` (12 dots/mm).
- **Encoding**: Uses `^CI28` (UTF-8) with `^FH\` hexadecimal escaping for field data (`\`, `^`, `~`).
- **QR Code**: Emits `^BQN,2,<mag>^FDMA,metafold:tpl:<uuid>^FS` (`MA,` selects Error Correction M + Auto mode).
- **DataMatrix**: Emits `^BXN,<module>,200^FDmetafold:tpl:<uuid>^FS` (ECC 200).

