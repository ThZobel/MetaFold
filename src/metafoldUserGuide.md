# MetaFold - User Guide

## 🚀 Welcome to MetaFold

MetaFold is a tool for creating and managing project templates. You can create folder structures and experiment templates, share them with your team, and reuse them efficiently.

---

## ⚙️ Initial Setup

### Simple vs. Advanced Mode

MetaFold offers two modes to suit different use cases:

#### 🎯 **Simple Mode (Default)**
- No user selection at startup
- Perfect for individual users
- App starts immediately with default user "User"
- Ideal for quick, personal project management

#### 👥 **Advanced Mode (User Management)**
- Multiple users and groups
- Template sharing and collaboration
- User-specific template organization
- Requires enabling in **Settings > General > Enable User Management**

### Enabling User Management

1. Click **⚙️ Settings** button in the sidebar
2. Navigate to **🔧 General** tab
3. Check **👥 Enable User Management**
4. Restart the application
5. Login dialog will appear on next startup

---

## 🔐 User Management (Advanced Mode)

### First Login
When User Management is enabled, a login window appears:

1. **Enter Name**: Enter your full name (e.g., "John Doe")
2. **Auto-completion**: Previously used names are suggested
3. **Groups**: Automatically assigned or configured in user management

### User Management (👥 Manage Button)
- **Assign User Groups**: Organize users into groups
- **Create New Groups**: Add group names for better organization  
- **Switch Users**: Change active user without restarting
- **User History**: Quickly access recently used accounts

---

## 📁 Template Management

### Template Types

#### 🗂️ **Folder Templates**
Create predefined folder structures for projects:
```
src/
  components/
  assets/
    images/
    css/
public/
docs/
README.md
```

#### 🧪 **Experiment Templates**
Scientific projects with metadata forms:
- **Structure**: Folders for data, analysis, results
- **Metadata**: Experiment name, hypothesis, data source, etc.
- **Validation**: Required fields and dropdown options
- **elabFTW Integration**: Automatic sync with electronic lab notebook

### Creating Templates

1. **➕ New Template**: Click button in sidebar
2. **Choose Template Type**: Folder or Experiment
3. **Enter Details**:
   - **Name**: Unique template name
   - **Description**: Brief explanation of purpose
   - **Structure**: Folder hierarchy (one line per folder/file)

#### Structure Syntax
```
folder1/
  subfolder/
    file.txt
  file2.md
folder2/
root_file.txt
```

4. **Metadata** (Experiments only):
   - **Field Name**: Unique identifier
   - **Display Label**: What users see
   - **Type**: Text, Textarea, Date, Dropdown
   - **Required**: Must be filled out
   - **Options**: Available choices for dropdowns

### Using Templates

1. **Select Template**: Click on template in the list
2. **Review Preview**: Structure is displayed on the right
3. **Fill Metadata** (Experiments): Complete form below
4. **Set Project Path**: Choose directory and project name
5. **Create Project**: Click "🎯 Create Project" button

---

## 👥 Collaboration (Advanced Mode)

### Own vs. Shared Templates

#### 📝 **Own Templates**
- Created by you
- Full access: Edit, Delete, Use
- Standard color coding based on your username

#### 📋 **Shared Templates**
- Created by other group members
- "📋 Shared" badge visible
- Copy and use only (cannot edit original)
- "📋 Copy" button creates your own copy
- Same color coding as creator for consistency

### Template Sharing
Templates are automatically shared with your group:
1. Create a template
2. Other group members see it as "shared template"
3. They can copy and customize it
4. Original remains unchanged

---

## ⚙️ Detailed Features

### Settings Management

#### 🔧 General Settings
- **👥 User Management**: Enable/disable multi-user features
- **🎨 Theme**: Choose visual appearance (Dark/Light)
- **💾 Auto-save**: Automatic template saving
- **💡 Show Tips**: Display helpful hints

#### 🧪 elabFTW Integration
- **Server Configuration**: Connect to your elabFTW instance
- **API Authentication**: Secure connection with personal API key
- **Auto-sync**: Automatic experiment creation
- **SSL Verification**: Security settings for connections

### Template Operations

#### Editing Templates
- Only available for own templates
- **✏️ Edit** button in template details
- Opens template editor with pre-filled data
- Changes are saved immediately

#### Deleting Templates
- Only available for own templates
- **🗑️ Delete** button in template details
- Confirmation required - **Action cannot be undone**

#### Copying Templates
- Available for shared templates
- Creates own copy named "Template Name (Copy)"
- Can then be edited and customized

#### Template Type Switching
- **Folder Templates** / **Experiment Templates** toggle at top
- Filters display by template type
- Saved templates remain intact

---

## 🧪 elabFTW Integration

### Setup
1. **Enable Integration**: Settings > elabFTW > Enable elabFTW Integration
2. **Server URL**: Enter your elabFTW server address
3. **API Key**: Generate and enter personal API key from elabFTW
4. **Test Connection**: Verify settings work correctly

### Auto-sync Mode
- **Automatic Creation**: Experiments are created in elabFTW automatically
- **Metadata Transfer**: All experiment metadata is included
- **Structure Documentation**: Folder structure is documented

### Manual Mode
- **Checkbox Option**: "🧪 Send to elabFTW" appears for experiments
- **Selective Sync**: Choose which experiments to sync
- **Update Existing**: Option to update existing experiment by ID

---

## 💡 Tips & Best Practices

### Template Structure
- **Consistent Naming**: Use uniform naming conventions
- **Logical Grouping**: Group similar files in common folders
- **README Files**: Document template purpose and usage
- **Example Files**: Add dummy content for guidance

### Metadata Design
- **Clear Field Names**: "experiment_date" instead of "ed"
- **Helpful Labels**: "Experiment Start Date" instead of "Date"
- **Sensible Defaults**: Dropdowns with commonly used options
- **Minimal Required Fields**: Only mark truly necessary fields as required

### Group Organization (Advanced Mode)
- **Descriptive Names**: "Lab A", "Marketing Team", "Development"
- **Clear Assignment**: One user = one primary group
- **Regular Cleanup**: Remove inactive users periodically

### Template Management
- **Version Control**: Use names like "Web Project v2", "Experiment Template 2025"
- **Use Descriptions**: Explain purpose and special features
- **Regular Updates**: Delete or update outdated templates

---

## 🔧 Troubleshooting

### Common Issues

#### "Template not displayed"
- **Cause**: Wrong template type selected
- **Solution**: Check template type toggle (Folder/Experiment)

#### "Cannot edit template"
- **Cause**: Template belongs to another user
- **Solution**: Copy template, then edit the copy

#### "Metadata form missing"
- **Cause**: Template is not experiment type
- **Solution**: Create template as "Experiment" type

#### "Shared templates not visible"
- **Cause**: Not in same group or user management disabled
- **Solution**: Check Settings > General > User Management enabled

#### "Settings not working"
- **Cause**: Settings may need app restart
- **Solution**: Refresh browser or restart application

### Browser Compatibility
- **Supported**: Chrome, Firefox, Safari, Edge (modern versions)
- **Storage**: Local browser storage (localStorage)
- **Data Exchange**: Not automatically synchronized between browsers

### Preventing Data Loss
- **Regular Usage**: Inactive browsers may clear data
- **Backup**: Export settings regularly via Settings > Export
- **Documentation**: Document important template structures externally

---

## 📱 User Interface

### Navigation
- **Sidebar**: Template list and controls
- **Main Area**: Project setup and template details
- **Modals**: Template creation and settings

### Visual Indicators
- **Template Badges**: 🗂️ Folder / 🧪 Experiment markers
- **User Avatars**: Color-coded user identification
- **Shared Indicators**: 📋 Badges for shared templates
- **Status Messages**: Success/error notifications

### Keyboard Shortcuts
- **Ctrl + N**: Create new template
- **Escape**: Close modals
- **Enter**: Confirm in dialogs

---

## 📊 Data Management

### Settings Export/Import
- **Export**: Download settings as JSON file
- **Import**: Upload previously saved settings
- **Reset**: Return to default settings
- **Backup**: Regular exports recommended

### Template Data
- **Local Storage**: All data stored in browser
- **Group Sharing**: Templates shared within groups
- **No Cloud Sync**: Data remains on local device

---

## 🌟 Getting Started Checklist

### For Individual Users (Simple Mode)
1. ✅ Open MetaFold (starts immediately)
2. ✅ Create first template
3. ✅ Set up project structure
4. ✅ Use template to create project

### For Team Users (Advanced Mode)
1. ✅ Enable User Management in Settings
2. ✅ Restart application and log in
3. ✅ Set up user groups via 👥 Manage
4. ✅ Create and share templates
5. ✅ Configure elabFTW if needed

---

## 📞 Support & Status

### Status Messages
- **🟢 Green**: Successful actions (5 seconds visible)
- **🔴 Red**: Errors or warnings (15 seconds visible)
- **🔵 Blue**: Information messages (3 seconds visible)
- **Position**: Top right corner of browser

### Getting Help
- **User Guide**: This comprehensive documentation
- **Settings**: Built-in configuration options
- **Console**: Browser developer tools for technical issues

---

*MetaFold v2.0 - Developed for efficient project template management*

*Features: Simple & Advanced modes, User management, elabFTW integration, Template sharing*