# MetaFold JSON Schemas (`v0.1`)

MetaFold acts as an **agnostic capture layer** for research and project metadata. Because every laboratory, facility, and user defines their own templates and fields, MetaFold intentionally **does not enforce a rigid domain content schema**.

Instead, MetaFold defines and versions a **stable JSON envelope ("Hülle")** with **self-describing field objects**. This guarantees that any external tool, script, ELN/LIMS adapter, or future scanner can reliably read, validate, and translate MetaFold JSON files years from now—without needing MetaFold itself installed.

---

## Design Principles

1. **Fixed Envelope, Free Content:** Only the outer envelope keys (`schemaVersion`, `schemaType`, `metafold_project_id`, `projectName`, `created_at`, `updated_at`, `provenance`, `template`, `metafold_integration`, `System.*`, etc.) are reserved. All user-defined fields and nested groups are allowed via `additionalProperties`.
2. **Self-Describing Fields (Snapshot Principle):** Every captured metadata field stores its own definition alongside its value (`{ label, type, value, unit, options, term }`). A project file is 100% interpretable even if the original template file is no longer available.
3. **Backward Compatibility (`0.0` Legacy Support):** Any file without a `schemaVersion` field is treated as version `"0.0"` (Legacy) and remains readable.
4. **Forward Tolerance:** Readers must ignore unknown keys so future minor versions do not break existing parsers.
5. **Ontology-Ready:** Any field object may optionally carry a `term` (describing the field concept via URI) and/or `valueTerm` (describing the chosen value via URI) without forcing ontology usage on users.

---

## Overview of MetaFold JSON File Types (`v0.1`)

Schema source directory on GitHub: [`https://github.com/ThZobel/MetaFold/tree/main/docs/schema/v0.1`](https://github.com/ThZobel/MetaFold/tree/main/docs/schema/v0.1)

All files written by MetaFold carry `"schemaVersion": "0.1"` and a `"schemaType"` identifier at the top level:

| File Pattern | `schemaType` | JSON Schema & Canonical Raw ID | Purpose & Location |
|---|---|---|---|
| `<ProjectName>-metadata.json` / `ReadyToImport.json` | `"metafold-project-metadata"` | [project-metadata.schema.json](https://raw.githubusercontent.com/ThZobel/MetaFold/refs/heads/main/docs/schema/v0.1/project-metadata.schema.json) | **Portable Ground Truth** stored directly inside the project directory alongside the data. |
| `<File>.metafold-sidecar.json` | `"metafold-sidecar"` | [sidecar.schema.json](https://raw.githubusercontent.com/ThZobel/MetaFold/refs/heads/main/docs/schema/v0.1/sidecar.schema.json) | Extensible file-level metadata & extracted file header payloads (Microscopy OME-XML, Flow Cytometry FCS, Genomics, etc.) stored in `<Project>/.metafold/sidecars/`. |
| `<template_name>.json` | `"metafold-template"` | [template.schema.json](https://raw.githubusercontent.com/ThZobel/MetaFold/refs/heads/main/docs/schema/v0.1/template.schema.json) | Reusable folder structure & metadata form template stored in `~/MetaFold/Templates/`. |
| `user_index.json` | `"metafold-user-index"` | [user-index.schema.json](https://raw.githubusercontent.com/ThZobel/MetaFold/refs/heads/main/docs/schema/v0.1/user-index.schema.json) | Reconstructible local search cache for Facet Search & Discovery. |
| `users.json` / `groups.json` | `"metafold-users"` / `"metafold-groups"` | [profiles.schema.json](https://raw.githubusercontent.com/ThZobel/MetaFold/refs/heads/main/docs/schema/v0.1/profiles.schema.json) | Local RDM user & group profiles (ORCID, ROR, affiliation; never contains passwords). |
| `id_dictionary_<user>.json` | `"metafold-id-dictionary"` | [exports.schema.json](https://raw.githubusercontent.com/ThZobel/MetaFold/refs/heads/main/docs/schema/v0.1/exports.schema.json) | Autocomplete cache of project names, `id_anchor` identifiers, and tags. |
| Scanner Summary / Lineage Export | `"metafold-scan-summary"` / `"metafold-lineage-export"` | [exports.schema.json](https://raw.githubusercontent.com/ThZobel/MetaFold/refs/heads/main/docs/schema/v0.1/exports.schema.json) | Portable snapshots exported from the Project Scanner or Lineage Graph. |

> **Note on RO-Crate (`ro-crate-metadata.json`):** RO-Crate exports follow the official W3C/RO-Crate 1.1 JSON-LD specification (`"conformsTo": { "@id": "https://w3id.org/ro/crate/1.1" }`) and are validated against the RO-Crate 1.1 standard.

---

## Reference: `<ProjectName>-metadata.json` ("Where is What?")

### 1. Reserved Envelope Keys (Top-Level)

| Key | Type | Required | Description |
|---|---|---|---|
| `schemaVersion` | `string` | Yes (`v0.1+`) | Schema version of the MetaFold JSON envelope (`"0.1"`). Missing in `"0.0"` legacy files. |
| `schemaType` | `string` | Yes (`v0.1+`) | Fixed identifier `"metafold-project-metadata"`. |
| `metafold_project_id` | `string` (UUID v4) | Yes | Immutable unique identifier of the project across renames and moves. |
| `projectName` | `string` | Yes | Human-readable project name (matches folder/filename prefix). |
| `created_at` | `string` (ISO 8601) | Yes (`v0.1+`) | Timestamp when the project metadata was initially created. |
| `updated_at` | `string` (ISO 8601) | Yes (`v0.1+`) | Timestamp of the last modification (initial creation, inline edit, note addition, or template extension). |
| `previous_names` | `string[]` | Optional | List of former project names if the project was renamed (used for silent self-healing of links). |
| `template` | `object` | Optional | Reference to the template used: `{ "id": "...", "name": "...", "category": "..." }`. |
| `provenance` | `object` | Yes | ISA/RDM-inspired creator and group metadata (`creator: { username, firstName, lastName, email, orcid, affiliation, role }`, `group: { name, principalInvestigator, institution, department }`). |
| `metafold_integration` | `object` | Optional | External integration state and backlinks (`external_links: { elabftw, omero, rspace }`, `local_path`, `created_at`). |
| `notes_markdown` | `string` | Optional | Consolidated human-readable Markdown notes block. |
| `notes_log` | `object[]` | Optional | Structured array of timestamped log entries: `[{ id, category, text, timestamp, user }]`. |
| `hypothesis_or_goal` | `string` | Optional | Short scientific hypothesis or study goal. |
| `changelog` | `object[]` | Optional | Audit log of field modifications (`[{ timestamp, user, action, changes: [{ field, from, to, op }] }]`). |
| `System.ProjectAbsolutePath` | `object` | Optional | Runtime system field storing the absolute local folder path at write time (used for navigation and lineage resolution). |
| `System.ProjectRelativePath` | `object` | Optional | Runtime system field storing the relative path from the scan root (ensures portable lineage exports). |
| `System.UpdateHistory` | `object` | Optional | Audit history array `{ type: "history", value: [{ date, user, group, action }] }` tracking batch extensions and edits. |
| `System.LastUpdatedBy` / `System.LastUpdatedAt` | `object` | Optional | Quick lookup fields for the username and timestamp of the last modification. |
| `System.Level` | `object` | Optional | Directory hierarchy depth assigned during folder scanning (e.g. `1` for root project, `2` for subproject). |
| `System.TemplateCategory` | `object` | Optional | Cached template category (e.g. `"Microscopy"`) used for instant facet search filtering without loading full templates. |

> **Why the `System.*` prefix?**  
> Keys prefixed with `System.` represent **operational runtime metadata** generated automatically by MetaFold. The `System.` prefix guarantees that these keys are **never** rendered as user experiment fields in form editors, never added to user-facing README tables, and never uploaded to ELN/LIMS systems (like OMERO or eLabFTW) as experimental measurements.

---

### 2. Self-Describing User Fields & Nested Groups

Any top-level key **not** listed in the reserved envelope table above is either:
- a **User Field Object** (has at least `type` and `value`), or
- a **Field Group Object** (a nested object whose properties are User Field Objects, e.g. `"Microscopy": { "Laser_Wavelength": { ... } }`). When uploaded to OMERO, groups map to dedicated Map Annotation namespaces.

#### Structure of a User Field Object

```json
"Excitation_Laser": {
  "label": "Excitation Laser Wavelength",
  "type": "number",
  "value": 488,
  "unit": "nm",
  "required": true,
  "position": 1,
  "description": "Primary excitation laser line",
  "templateName": "Confocal Microscopy",
  "term": {
    "label": "excitation wavelength",
    "uri": "http://purl.obolibrary.org/obo/OBI_0000001",
    "ontology": "OBI"
  }
}
```

#### What is `term` and `valueTerm`? (Ontology Anchoring)

MetaFold supports semantic research data management (FAIR principles):
- **`term` (Concept URI):** Unambiguously anchors what the field represents. While different labs might label a field `"Laser"`, `"Wavelength"`, or `"Anregungswellenlänge"`, setting `"term": { "uri": "http://purl.obolibrary.org/obo/OBI_0000001", "label": "excitation wavelength", "ontology": "OBI" }` enables external tools, knowledge graphs, and AI agents to recognize that all three mean the exact same concept in the *Ontology for Biomedical Investigations* (OBI).
- **`valueTerm` (Value URI):** Used on dropdowns or controlled vocabularies to anchor the *chosen value* to an ontology (e.g. Organism: `"Mouse"` anchored to `http://purl.obolibrary.org/obo/NCBITaxon_10090`).
- **Completely Optional:** Templates and fields without `term` work identically. It acts as an optional semantic enrichment layer.

#### Supported Field Types (`type`)

| `type` | Value Type in JSON (`value`) | Notes |
|---|---|---|
| `text`, `email`, `url`, `date` | `string` | Standard scalar strings (`date` in `YYYY-MM-DD`). |
| `textarea`, `notes` | `string` | Multi-line text or Markdown content. |
| `number` | `number` or `string` | Numeric value; optional `unit`, `min`, `max`. |
| `checkbox` | `boolean` (or `"on"`/`""` in eLabFTW envelope) | Boolean flag. |
| `dropdown` | `string` | Selected option from `options: string[]`. Optional `valueTerm` for ontology-backed choices. |
| `multicheckbox`, `tags` | `string[]` | Array of selected options or free-form tags. |
| `rating` | `integer` (`1`–`5`) | Rendered as a 5-star rating in UI and `README.html`. |
| `id_anchor` | `string` | Custom sample/entity identifier provided by this project (e.g. `"cell-42"`). |
| `derived_from` | `Array<string \| { id, name, anchor }>` | Lineage parent references (projects or `id_anchor` IDs this project builds upon). |
| `related_to` | `Array<string \| { id, name, origin, relation_note }>` | Horizontal cross-references (controls, sister runs, `[[Project]]` mentions in notes). |

---

### 3. Annotated Complete Example (`<ProjectName>-metadata.json`)

See [fixtures/v0.1/project-metadata.example.json](./fixtures/v0.1/project-metadata.example.json) for a valid, self-contained v0.1 file:

```json
{
  "schemaVersion": "0.1",
  "schemaType": "metafold-project-metadata",
  "metafold_project_id": "9f8c2b10-4e3a-4d91-8a7c-123456789abc",
  "projectName": "2026-11-14_HeLa_DrugScreen",
  "created_at": "2026-11-14T09:15:00.000Z",
  "updated_at": "2026-11-14T10:30:00.000Z",
  "template": {
    "id": "template_confocal_01",
    "name": "Confocal Microscopy",
    "category": "category1"
  },
  "provenance": {
    "creator": {
      "username": "tzobel",
      "firstName": "Thomas",
      "lastName": "Zobel",
      "orcid": "0000-0002-1825-0097",
      "affiliation": "University of Münster"
    },
    "group": {
      "name": "BioImaging Facility",
      "institution": "University of Münster"
    },
    "createdAt": "2026-11-14T09:15:00.000Z",
    "metafoldVersion": "0.1"
  },
  "Sample_ID": {
    "label": "Sample ID (Own ID)",
    "type": "id_anchor",
    "value": "HeLa-Batch-07",
    "required": true,
    "position": 1
  },
  "derived_from": {
    "label": "Derived From",
    "type": "derived_from",
    "value": [
      {
        "id": "3a1b4c5d-0000-4000-8000-000000000001",
        "name": "2026-11-10_HeLa_Passage12",
        "anchor": "HeLa-P12"
      }
    ],
    "position": 2
  },
  "Microscopy": {
    "Excitation_Wavelength": {
      "label": "Excitation Wavelength",
      "type": "number",
      "value": 488,
      "unit": "nm",
      "required": true,
      "position": 3,
      "term": {
        "label": "excitation wavelength",
        "uri": "http://purl.obolibrary.org/obo/OBI_0000001",
        "ontology": "OBI"
      }
    },
    "Quality_Rating": {
      "label": "Image Quality",
      "type": "rating",
      "value": 5,
      "position": 4
    }
  },
  "notes_markdown": "### 2026-11-14 10:30\nCells showed strong membrane signal after 30 min incubation with [[2026-11-10_HeLa_Passage12]]. #confocal #live-imaging",
  "notes_log": [
    {
      "id": "note_1731580200_a1b2c3d4",
      "category": "observation",
      "text": "Cells showed strong membrane signal after 30 min incubation with [[2026-11-10_HeLa_Passage12]]. #confocal #live-imaging",
      "timestamp": "2026-11-14T10:30:00.000Z",
      "user": "tzobel"
    }
  ],
  "metafold_integration": {
    "created_at": "2026-11-14T09:16:00.000Z",
    "local_path": "D:/Data/2026-11-14_HeLa_DrugScreen",
    "external_links": {
      "omero": {
        "url": "https://omero.example.org/webclient/?show=dataset-421",
        "_comment": "Example URL; actual URL points to your facility's OMERO instance",
        "dataset_id": "421",
        "object_type": "dataset",
        "group_name": "BioImaging",
        "uploaded_at": "2026-11-14T09:16:05.000Z",
        "status": "uploaded"
      }
    }
  },
  "System.ProjectAbsolutePath": {
    "label": "Project Absolute Path",
    "type": "text",
    "value": "D:/Data/2026-11-14_HeLa_DrugScreen",
    "position": 900
  },
  "System.ProjectRelativePath": {
    "label": "Project Relative Path",
    "type": "text",
    "value": "2026-11-14_HeLa_DrugScreen",
    "position": 901
  }
}
```

---

### 4. Variant: eLabFTW Envelope Format

When MetaFold writes an eLabFTW-wrapped metadata file (`createMetadataFiles` in `main.js`), the user fields are stored inside `"extra_fields": { ... }` alongside `"elabftw": { "display_main_text": true, "extra_fields_groups": [...] }`.
The top-level envelope keys (`schemaVersion`, `schemaType`, `metafold_project_id`, `projectName`, `created_at`, `updated_at`, `provenance`, `template`) still sit at the root of the JSON document. Both flat and eLabFTW-enveloped files are covered by [project-metadata.schema.json](./project-metadata.schema.json).
