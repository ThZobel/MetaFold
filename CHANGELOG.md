# MetaFold Release Update

This release brings massive architectural improvements, transitioning MetaFold into a more modular, component-driven application, alongside several powerful new features aimed at data lineage, automated metadata extraction, and FAIR data compliance.

## 🚀 Major New Features

### 🕸️ Data Linking & Lineage (Knowledge Graph)
- **Interactive Visualizations**: View your projects as an interactive hierarchical Lineage Tree or semantic Knowledge Graph.
- **Dynamic Linking**: Link projects seamlessly using ID dictionaries with autocomplete for `id_anchor` and `derived_from` relationships.
- **Visual Connection Mode**: Connect projects directly within the graph using the new interactive "Connect" mode.
- **Lineage Export & Data Harvest**: Export entire project dependency graphs as standalone HTML dashboards. Perform a "Full Data Harvest" to selectively copy raw data from linked projects into a single, portable directory.

### 🔬 BioFormats & File Sidecar Scanner
- **Automated Metadata Extraction**: New built-in 3-step wizard to recursively scan microscopy files (e.g., `.czi`, `.tif`).
- **Inheritance & OME-XML**: Inherits ISA metadata from parent project folders and automatically extracts OME-XML via BioFormats in the background.
- **Sidecar Generation**: Creates `.metafold-sidecar.json` files next to image files, fully embedding provenance and metadata.

### 👥 User Profiles & RDM Provenance
- **RDM-Compliant Profiles**: Introduced rich user and group profiles (ISA-JSON inspired) storing details like ORCID, Affiliation, and ROR.
- **Automated Provenance**: Provenance data (User & Group metadata) is automatically injected into `ReadyToImport.json` and sidecar files, ensuring FAIR data principles.

## 🎨 UI/UX & Quality of Life
- **Sidebar Metadata Viewer**: Click any project in the Discovery tab to instantly view its fully parsed, recursive metadata directly in the sidebar.
- **Manage Categories (Facet Search)**: New context menu and modal to easily show/hide specific metadata fields in the Facet Search sidebar.
- **Facet Search Stability**: Completely rebuilt the table layout engine (via Tabulator) ensuring flawless resize behavior and rapid redrawing on filtering.
- **Light & Dark Mode**: Full UI support for Light Mode with seamless, persistent toggling.

## 🔗 Integration Enhancements
- **n8n Automation**: Trigger custom webhooks on project creation (configurable per project).
- **OMERO Namespaces**: Annotations are now automatically grouped into clean namespaces (e.g., `System Metadata by MetaFold`, or template group names).
- **elabFTW Templates**: Fetch and select elabFTW experiment templates directly from a dropdown in the UI.
- **Secure Storage**: Upgraded to multi-layer encryption (DPAPI + user-specific entropy) for all integration credentials.

## 🛠️ Architecture & Under the Hood
- **Component Loading System**: Migrated from a monolithic `index.html` to dynamic, runtime-injected HTML components.
- **Optimized Data Flow**: Refactored the DOM and state management (e.g., `facetSearch.js` singleton) for significant performance gains when rendering thousands of projects.
