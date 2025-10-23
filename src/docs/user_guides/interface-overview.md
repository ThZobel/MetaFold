# Interface Overview

MetaFold's interface is designed for intuitive research data management. This comprehensive guide covers every feature, button, and workflow to help you become a power user of organized research.

![Interface Overview](images/interface-overview-complete.png)

## Main Application Layout

### Window Structure

**Title Bar**
- Application name and version
- Standard window controls (minimize, maximize, close)
- Menu bar (File, Edit, View, Help)

**Navigation Tabs**
- Five main functional areas
- Tab indicators show current location
- Keyboard shortcuts for quick switching

**Main Content Area**
- Dynamic content based on selected tab
- Responsive design adapts to window size
- Context-sensitive help and tooltips

**Status Bar**
- Current user information (multi-user mode)
- Integration status indicators
- System health and connectivity

![Window Structure](images/window-structure-overview.png)

### Color Coding and Visual Design

**Status Indicators**
- 🟢 Green - Success, connected, active
- 🔵 Blue - Information, neutral status
- 🟡 Yellow - Warning, attention needed
- 🔴 Red - Error, problem requiring action
- ⚪ Gray - Disabled, inactive, unavailable

**Interactive Elements**
- **Buttons** - Rounded corners, hover effects
- **Links** - Underlined, color-coded by function
- **Form Fields** - Clear borders, validation feedback
- **Cards** - Elevated appearance for grouped content

![Visual Design System](images/visual-design-system.png)

## Tab 1: Templates (📋)

The Templates tab is your template management center.

### Template Library View

**Template Cards**
Each template displays:
- **Template Name** - Large, prominent title
- **Template Type** - Folder or Experiment badge
- **Description** - Brief summary of purpose
- **Usage Stats** - Number of projects created
- **Last Modified** - When template was updated
- **Quick Actions** - Edit, duplicate, delete, export

![Template Library](images/template-library-interface.png)

**Template Filtering and Search**
- **Search Bar** - Find templates by name or description
- **Type Filter** - Show only Folder or Experiment templates
- **Sort Options** - By name, date, usage, or custom order
- **View Modes** - Grid view (default) or list view

### Template Creation Interface

**Template Type Selection**
- **Folder Template** - Simple directory organization
- **Experiment Template** - Rich metadata and integrations
- **Import Template** - From JSON file or external source

**Basic Information Panel**
- **Template Name** - Unique identifier
- **Description** - Detailed purpose and usage notes
- **Tags** - Organizational keywords
- **Sharing Settings** - Private, team, or public access

![Template Creation Interface](images/template-creation-interface.png)

**Folder Structure Editor**
- **Add Folder** - Input field with autocomplete
- **Nested Structure** - Drag and drop organization
- **Preview Tree** - Visual representation of structure
- **Validation** - Real-time checking for conflicts

**Metadata Schema Editor**
- **Field Types** - Dropdown selection of available types
- **Field Properties** - Required, default values, validation
- **Conditional Logic** - Show/hide fields based on other values
- **Field Groups** - Organize related fields together

### Template Actions

**Template Menu Options**
- **Edit** - Modify template structure and metadata
- **Duplicate** - Create copy for modification
- **Export** - Save as JSON file for sharing
- **Delete** - Remove template (with confirmation)
- **View Usage** - See projects created from template

**Bulk Operations**
- **Select Multiple** - Checkbox selection for batch operations
- **Bulk Export** - Export multiple templates
- **Bulk Delete** - Remove multiple templates
- **Bulk Sharing** - Share templates with team members

![Template Actions](images/template-actions-interface.png)

## Tab 2: Create Project (🚀)

The Create Project tab orchestrates the project creation workflow.

### Project Creation Workflow

**Step 1: Template Selection**
- **Template Gallery** - Visual selection interface
- **Template Preview** - Folder structure and metadata preview
- **Template Information** - Description, requirements, features
- **Quick Start** - Recently used or recommended templates

![Project Creation Step 1](images/project-creation-step1.png)

**Step 2: Project Configuration**
- **Project Name** - Auto-generated or custom
- **Project Location** - Browse and select directory
- **Path Preview** - Shows final project path
- **Validation** - Checks permissions and space

**Step 3: Metadata Entry**
- **Dynamic Form** - Generated from template schema
- **Field Validation** - Real-time error checking
- **Auto-completion** - Suggestions based on history
- **Save Draft** - Preserve partially completed forms

![Project Creation Metadata](images/project-creation-metadata.png)

**Step 4: Integration Configuration**
- **elabFTW Settings** - Experiment type, team, tags
- **OMERO Settings** - Group, project, dataset name
- **Integration Status** - Connection health indicators
- **Advanced Options** - Custom field mappings

### Project Creation Controls

**Navigation Controls**
- **Previous/Next** - Step-by-step navigation
- **Progress Indicator** - Shows completion status
- **Save and Continue Later** - Draft preservation
- **Cancel** - Abort creation with confirmation

**Creation Options**
- **Create and Open** - Open project folder after creation
- **Create Multiple** - Batch project creation
- **Template Override** - Modify template for this project only
- **Integration Toggle** - Enable/disable specific integrations

![Project Creation Controls](images/project-creation-controls.png)

### Success and Error Handling

**Success Interface**
- **Confirmation Message** - Clear success indication
- **Project Summary** - Key information and statistics
- **Quick Actions** - Open folder, view in scanner, create another
- **Integration Links** - Direct links to elabFTW/OMERO entries

**Error Handling**
- **Error Messages** - Clear, actionable error descriptions
- **Retry Options** - Attempt failed operations again
- **Partial Success** - When some operations succeed
- **Recovery Tools** - Fix common problems automatically

## Tab 3: Discover Projects (🔍)

The Project Scanner provides comprehensive project discovery and analysis.

### Scan Configuration

**Directory Selection**
- **Browse Button** - Select root directory for scanning
- **Recent Locations** - Quick access to frequently scanned paths
- **Bookmarks** - Save important scan locations
- **Path Validation** - Check accessibility and permissions

![Scanner Configuration](images/scanner-configuration-interface.png)

**Scan Options**
- **Maximum Depth** - Limit scanning depth to avoid infinite recursion
- **Include Hidden** - Scan hidden directories and files
- **File Filters** - Specify file types or patterns to include/exclude
- **Performance Mode** - Fast scan vs. detailed analysis

### Results Display

**Overview Panel**
- **Scan Statistics** - Total projects, time taken, errors
- **Distribution Charts** - Visual breakdown by template, date, status
- **Quick Filters** - Rapid filtering by common criteria
- **Export Options** - Save results in various formats

**Project List**
- **Sortable Columns** - Name, date, template, status, size
- **Multi-select** - Checkbox selection for batch operations
- **Status Icons** - Integration status, completion level, issues
- **Quick Preview** - Hover to see project details

![Scanner Results](images/scanner-results-interface.png)

### Analysis Tools

**Filtering and Search**
- **Text Search** - Search across all project metadata
- **Date Range** - Filter by creation or modification date
- **Template Filter** - Show projects from specific templates
- **Status Filter** - Complete, incomplete, error states
- **Custom Filters** - Advanced filter combinations

**Project Actions**
- **Open Folder** - Quick access to project directory
- **View Metadata** - Detailed metadata examination
- **Edit Project** - Modify project information
- **Repair Project** - Fix common issues automatically
- **Add to Visualization** - Include in data visualization

![Scanner Analysis Tools](images/scanner-analysis-tools.png)

## Tab 4: Visualize Data (📊)

The Visualization tab transforms your research data into interactive visual representations.

### Data Source Selection

**Available Data Sources**
- **Template Data** - Visualize template structures and relationships
- **Scanned Projects** - Use Project Scanner results
- **Custom JSON** - Import external data for visualization
- **Integration Data** - elabFTW and OMERO data visualization

![Visualization Data Sources](images/visualization-data-sources.png)

### Visualization Types

**Network Graphs**
- **Node-Link Diagrams** - Show relationships between projects
- **Force-Directed Layout** - Automatic organization by similarity
- **Hierarchical Layout** - Tree-like structure for nested relationships
- **Custom Layout** - Manual positioning with constraints

**Timeline Views**
- **Chronological Timeline** - Projects arranged by date
- **Gantt Charts** - Project duration and overlap visualization
- **Activity Heatmaps** - Research intensity over time
- **Milestone Tracking** - Key project events and deadlines

**Statistical Charts**
- **Bar Charts** - Template usage, completion rates
- **Pie Charts** - Distribution by category or status
- **Scatter Plots** - Correlation analysis
- **Box Plots** - Statistical distribution analysis

![Visualization Types](images/visualization-types-interface.png)

### Interactive Controls

**Navigation Controls**
- **Zoom and Pan** - Mouse wheel and drag navigation
- **Fit to View** - Automatic sizing for optimal viewing
- **Center on Selection** - Focus on specific elements
- **Reset View** - Return to default view state

**Selection and Filtering**
- **Click to Select** - Individual element selection
- **Lasso Selection** - Freeform selection tool
- **Filter Panel** - Dynamic filtering controls
- **Search and Highlight** - Find and emphasize specific elements

**Customization Options**
- **Color Schemes** - Predefined and custom color palettes
- **Size Mapping** - Map data values to visual size
- **Label Options** - Show/hide labels, font size, positioning
- **Animation Settings** - Transition speed and effects

![Visualization Controls](images/visualization-controls-interface.png)

## Tab 5: Settings (⚙️)

The Settings tab provides comprehensive configuration for all MetaFold features.

### Settings Categories

**General Settings**
- **User Preferences** - Theme, language, default paths
- **Application Behavior** - Auto-save, notifications, updates
- **Performance Settings** - Memory usage, cache size, threading
- **Backup Configuration** - Automatic backup frequency and retention

![General Settings](images/general-settings-interface.png)

**Integration Settings**
- **elabFTW Configuration** - Server URL, API key, default settings
- **OMERO Configuration** - Server details, authentication, proxy settings
- **Integration Testing** - Connection tests and diagnostics
- **Advanced Options** - Custom field mappings, timeout settings

**Security Settings**
- **Credential Management** - Stored passwords and API keys
- **Encryption Status** - Current encryption level and options
- **Security Testing** - Validate encryption and storage
- **Privacy Settings** - Data collection and sharing preferences

![Integration Settings](images/integration-settings-interface.png)

### User Management (Multi-User Mode)

**User Administration**
- **User List** - All registered users with status
- **Add User** - Create new user accounts
- **User Permissions** - Role-based access control
- **Group Management** - Research group organization

**Template Sharing**
- **Sharing Permissions** - Who can access which templates
- **Template Visibility** - Private, team, or public templates
- **Version Control** - Template change tracking and approval
- **Import/Export** - Bulk template management

### Debug and Diagnostics

**System Information**
- **Application Version** - Current version and update status
- **System Requirements** - Hardware and software compatibility
- **Log Files** - Application logs for troubleshooting
- **Performance Metrics** - Memory usage, CPU usage, disk space

**Diagnostic Tools**
- **Connection Tests** - Test all configured integrations
- **Template Validation** - Check all templates for errors
- **Project Integrity** - Verify project files and metadata
- **Cache Management** - Clear cache and temporary files

![Debug Interface](images/debug-interface.png)

## Keyboard Shortcuts and Navigation

### Global Shortcuts

**Tab Navigation**
- `Ctrl+1` - Templates tab
- `Ctrl+2` - Create Project tab
- `Ctrl+3` - Discover Projects tab
- `Ctrl+4` - Visualize Data tab
- `Ctrl+5` - Settings tab

**Common Actions**
- `Ctrl+N` - New template or project (context-dependent)
- `Ctrl+S` - Save current work
- `Ctrl+Z` - Undo last action
- `Ctrl+F` - Search/filter current view
- `F5` - Refresh current data
- `F11` - Full screen mode

![Keyboard Shortcuts](images/keyboard-shortcuts.png)

### Context-Specific Shortcuts

**Template Management**
- `Ctrl+D` - Duplicate selected template
- `Delete` - Delete selected template (with confirmation)
- `Ctrl+E` - Edit selected template
- `Ctrl+Shift+E` - Export selected template

**Project Creation**
- `Tab` - Navigate between form fields
- `Ctrl+Enter` - Create project (when form is complete)
- `Esc` - Cancel current operation
- `Ctrl+P` - Preview project structure

**Data Visualization**
- `Ctrl+0` - Reset zoom to fit
- `Ctrl++` / `Ctrl+-` - Zoom in/out
- `Space+Drag` - Pan view
- `Ctrl+A` - Select all visible elements

## Responsive Design and Accessibility

### Window Sizing

**Minimum Window Size**
- Width: 1024px
- Height: 768px
- Scaling: Automatic UI scaling for high-DPI displays

**Responsive Breakpoints**
- **Large Screens** (>1920px) - Full feature set with expanded panels
- **Standard Screens** (1024-1920px) - Default layout and sizing
- **Small Screens** (<1024px) - Condensed layout with hidden non-essential elements

![Responsive Design](images/responsive-design-interface.png)

### Accessibility Features

**Visual Accessibility**
- **High Contrast Mode** - Enhanced contrast for better visibility
- **Large Font Mode** - Increased text size throughout interface
- **Color Blind Support** - Alternative color schemes and patterns
- **Screen Reader Support** - Proper ARIA labels and semantic HTML

**Keyboard Accessibility**
- **Tab Navigation** - Complete keyboard navigation support
- **Focus Indicators** - Clear visual indication of focused elements
- **Skip Links** - Quick navigation to main content areas
- **Keyboard Shortcuts** - Comprehensive shortcut system

**Motor Accessibility**
- **Large Click Targets** - Buttons and links sized for easy clicking
- **Drag and Drop Alternatives** - Keyboard alternatives for all drag operations
- **Customizable Interface** - Adjustable layouts and panel sizes
- **Voice Command Support** - Integration with system voice commands

## Interface Customization

### Theme Options

**Built-in Themes**
- **Light Theme** - Clean, bright interface for well-lit environments
- **Dark Theme** - Dark background for reduced eye strain
- **High Contrast** - Maximum contrast for accessibility
- **Custom Themes** - User-defined color schemes and styling

**Theme Settings**
- **Automatic Theme Switching** - Follow system preferences
- **Time-based Switching** - Light during day, dark at night
- **Custom Colors** - Override specific interface colors
- **Font Preferences** - Choose system fonts or web fonts

![Theme Customization](images/theme-customization.png)

### Layout Customization

**Panel Management**
- **Resizable Panels** - Adjust panel sizes to preference
- **Collapsible Sections** - Hide unused interface elements
- **Custom Panel Arrangements** - Reorganize interface layout
- **Panel Persistence** - Remember layout preferences

**Toolbar Customization**
- **Custom Buttons** - Add frequently used actions to toolbar
- **Button Grouping** - Organize related functions together
- **Icon Preferences** - Choose icon style and size
- **Toolbar Position** - Top, bottom, or floating toolbars

## Integration Status Indicators

### Visual Status System

**Connection Status Icons**
- 🟢 **Connected** - Active, healthy connection
- 🟡 **Connecting** - Authentication in progress
- 🔴 **Disconnected** - Connection failed or unavailable
- ⚪ **Disabled** - Integration not configured or turned off

**Integration Health Monitoring**
- **Real-time Status** - Continuous monitoring of connection health
- **Last Success** - Timestamp of last successful operation
- **Error Messages** - Clear indication of connection problems
- **Retry Controls** - Manual retry and automatic retry options

![Integration Status](images/integration-status-interface.png)

### Notification System

**Notification Types**
- **Success Notifications** - Confirm successful operations
- **Warning Notifications** - Alert to potential issues
- **Error Notifications** - Report failures and problems
- **Information Notifications** - Provide helpful tips and updates

**Notification Management**
- **Notification History** - Review past notifications
- **Notification Preferences** - Control notification frequency and types
- **Persistent Notifications** - Keep important messages visible
- **Dismissal Controls** - Clear individual or all notifications

## Tips for Efficient Interface Use

### Power User Tips

**Workflow Optimization**
- **Use Keyboard Shortcuts** - Faster than mouse navigation
- **Bookmark Frequent Locations** - Quick access to common directories
- **Create Template Variations** - Slight modifications for different needs
- **Set Up Default Preferences** - Reduce configuration time for new projects

**Data Management**
- **Regular Template Review** - Keep templates current and useful
- **Periodic Project Scanning** - Stay informed about all research projects
- **Integration Health Checks** - Ensure connections remain active
- **Backup Important Templates** - Protect against data loss

![Power User Tips](images/power-user-tips.png)

### Common Interface Workflows

**Daily Research Workflow**
1. Check integration status in Settings
2. Review recent projects in Discover tab
3. Create new project from established template
4. Monitor project creation success
5. Update visualizations with new data

**Weekly Maintenance Workflow**
1. Run comprehensive project scan
2. Review and update templates based on usage
3. Check integration health and credentials
4. Export important data for backup
5. Clean up obsolete projects and templates

**Monthly Analysis Workflow**
1. Generate comprehensive project reports
2. Analyze research productivity and patterns
3. Review and optimize template library
4. Update team sharing and permissions
5. Plan upcoming research organization needs

## Getting the Most from the Interface

Understanding MetaFold's interface thoroughly enables:

- **Faster Research Workflows** - Efficient project creation and management
- **Better Data Organization** - Consistent, discoverable research structure
- **Enhanced Collaboration** - Effective team coordination and sharing
- **Improved Research Reproducibility** - Standardized, well-documented projects

## Next Steps

Now that you understand the complete interface:

1. **[Template Management](templates.md)** - Master advanced template creation techniques
2. **[Project Creation](project-creation.md)** - Learn efficient project creation workflows
3. **[Integration Setup](elabftw-integration.md)** - Connect with laboratory systems
4. **[Data Visualization](data-visualization.md)** - Create compelling visual representations

---

*Master the MetaFold interface and transform your research data management efficiency!*