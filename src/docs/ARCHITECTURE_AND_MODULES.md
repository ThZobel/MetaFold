# MetaFold Architecture & Module Documentation

## Overview
This document outlines the architectural changes made to the MetaFold application, specifically focusing on the modularization of the original monolithic `index.html` file. The application has been refactored to load UI components dynamically, improving maintainability and separation of concerns.

## 1. File Structure Refactoring

The original `index.html` has been stripped down to a skeleton that acts as the entry point. The actual UI content has been moved to separate HTML files within the `src/components` directory.

### Entry Point
*   **`src/index.html`**: The main shell. It defines the basic layout containers (`.sidebar`, `.main-content`, `.right-sidebar`) and loads all necessary CSS and JavaScript files. It **does not** contain the actual HTML for the sidebars or tabs anymore.

### Component Directory (`src/components/`)
The UI parts are now located here:

*   **`src/components/sidebars/`**
    *   `left-sidebar.html`: Contains the template selection list and category navigation.
    *   `right-sidebar.html`: Contains the "Project Info" (path preview) and "Integrations" (elabFTW, OMERO, RSpace) panels.
*   **`src/components/tabs/`**
    *   `create-project-tab.html`: The main form for creating new projects (Metadata Editor).
    *   `discover-projects-tab.html`: The project scanner and browser interface.
    *   `visualize-data-tab.html`: The JSONCrack visualization tab.
*   **`src/components/modals/`**
    *   `settings-modal.html`: The comprehensive settings dialog (General, elabFTW, OMERO, RSpace).
    *   `login-modal.html`: The user login/switch user interface.
    *   `template-modal.html`: The modal for creating/editing templates.

## 2. Component Loading System

Since the HTML is no longer in `index.html`, a loading mechanism is required to fetch and inject these components at runtime.

*   **`src/js/componentLoader.js`**: 
    *   Contains the core logic for fetching HTML files (`loadComponent`) and injecting them into specific DOM elements.
    *   Handles error logging if a component fails to load.
*   **`src/js/init_components.js`**:
    *   Orchestrates the loading process.
    *   Calls `componentLoader.loadComponent()` for each part of the UI (Left Sidebar, Right Sidebar, Tabs, Modals).
    *   **Crucial:** Initializes the corresponding JavaScript logic *after* the HTML has been injected (e.g., calling `sidebarIntegration.init()` only after `right-sidebar.html` is loaded).

## 3. Key JavaScript Modules

### Sidebar & Integrations
*   **`src/js/sidebarIntegration.js`**: 
    *   **Purpose:** Manages the interactivity of the Right Sidebar.
    *   **Functionality:** 
        *   Handles the visibility of integration cards (elabFTW, OMERO, RSpace) based on settings.
        *   Manages the toggle switches (Enable/Disable integration for current project).
        *   Implements `loadRSpaceFolders()` to fetch RSpace folders.
        *   Handles "Copy Path" functionality.
*   **`src/js/integrationOptionsFix.js`**:
    *   **Purpose:** Ensures integration options in the UI are correctly shown/hidden based on the active category and global settings.
*   **`src/js/rspaceIntegration.js`**:
    *   **Purpose:** Handles API communication with RSpace (fetching documents, creating content).

### Settings & Configuration
*   **`src/js/settingsManager.js`**:
    *   **Purpose:** Central store for application settings.
    *   **Functionality:**
        *   Manages `localStorage` for settings.
        *   Handles secure credential storage (API keys, passwords).
        *   **Recent Fix:** Fixed syntax errors and template literals to ensure stable loading.
        *   **Recent Fix:** Added `migrateSecureCredentials` to safely move plaintext secrets to secure storage.
*   **`src/js/globalHandlers.js`**:
    *   **Purpose:** Acts as a bridge between the HTML UI (onclick events) and the underlying logic modules.
    *   **Functionality:** Contains functions like `updateElabFTWSetting`, `showSettingsModal`, etc., which are called directly from the HTML.

### Core Logic
*   **`src/js/app.js`**: Main application initialization.
*   **`src/js/projectManager.js`**: Handles project creation logic, path generation, and file system interactions.
*   **`src/js/templateManager.js`**: Manages template loading, saving, and application.

## 4. Recent Fixes (Sidebar & Settings)

### Issue
The Right Sidebar integrations (elabFTW, OMERO, RSpace) were not appearing, and console errors indicated `settingsManager` was undefined.

### Solution
1.  **`src/index.html`**: Added missing `<script src="js/sidebarIntegration.js"></script>`.
2.  **`src/js/settingsManager.js`**: 
    *   Fixed a critical syntax error (missing function definition for `migrateSecureCredentials`).
    *   Restored broken template literals (backticks) that were causing parse errors.
3.  **`src/js/sidebarIntegration.js`**:
    *   Implemented `updateSidebarVisibilityFromSettings()` with a retry mechanism to wait for `settingsManager`.
    *   Added `window.loadRSpaceFolders()` to fix the missing RSpace folder refresh function.
    *   Ensured integration cards are hidden by default (`display: none` in HTML) and only shown if explicitly enabled in Settings.
4.  **`src/js/globalHandlers.js`**:
    *   Added safety checks to ensure `settingsManager` exists before attempting to write settings, preventing crash loops.

## How to Verify
1.  Open **Settings** (Gear Icon).
2.  Go to **elabFTW**, **OMERO**, or **RSpace** tabs.
3.  Toggle **Enable Integration**.
4.  Observe the **Right Sidebar**: The corresponding card should appear immediately.
5.  Toggle **Disable**: The card should disappear.
