# 📁 MetaFold - Project Template Manager

A modern web application for creating, managing, and sharing project templates with folder structures and experiment metadata.

## 🚀 Features

- **📂 Folder Templates**: Create reusable project folder structures
- **🧪 Experiment Templates**: Scientific templates with metadata forms
- **👥 User Management**: Multi-user support with group collaboration
- **🔄 Template Sharing**: Share templates within groups
- **🧬 elabFTW Integration**: Sync experiments with electronic lab notebook
- **⚙️ Settings Management**: Configurable options and preferences
- **🎨 Modern UI**: Clean, responsive interface with dark theme

## 🎯 Quick Start

### Simple Mode (Default)
1. Open `index.html` in your browser
2. Click **New Template** to create your first template
3. Choose **Folder** or **Experiment** type
4. Define structure and metadata
5. Use template to create projects

### Advanced Mode (Teams)
1. Open application
2. Go to **Settings > General**
3. Enable **User Management**
4. Restart application
5. Login with your name
6. Create and share templates with your team

## 📂 Project Structure

```
MetaFold/
├── index.html                 # Main application
├── settingsModal.html         # Settings interface
├── css/
│   └── styles.css            # Application styling
├── js/
│   ├── app.js                # Main application logic
│   ├── settingsManager.js    # Settings and configuration
│   ├── userManager.js        # User and group management
│   ├── templateManager.js    # Template operations
│   ├── loginModal.js         # User authentication
│   ├── templateModal.js      # Template editor
│   ├── storage.js            # Data persistence
│   └── ...                   # Additional modules
└── docs/
    ├── metafold_user_guide.md # Complete user guide
    └── README.md             # This file
```

## 🔧 Configuration

### Settings Location
- **General**: User management, theme, auto-save
- **elabFTW**: Server integration settings
- **Storage**: Browser localStorage
- **Export/Import**: JSON format

### User Management
- **Disabled** (default): Single user mode
- **Enabled**: Multi-user with groups and sharing

### elabFTW Integration
- **Server URL**: Your elabFTW instance
- **API Key**: Personal authentication token
- **Auto-sync**: Automatic experiment creation
- **Manual**: Selective experiment sync

## 💾 Data Storage

### Local Storage Keys
- `metafold_settings` - Application settings
- `metafold_templates` - User templates
- `metafold_group_templates_[group]` - Shared group templates
- `metafold_last_user` - Last logged in user
- `metafold_user_history` - User login history
- `metafold_user_group_mapping` - User-group assignments

### Data Format
```javascript
// Template Structure
{
  name: "Web Project",
  description: "React web application template",
  type: "folders", // or "experiment"
  structure: "src/\n  components/\n  assets/",
  metadata: {...}, // experiment fields
  createdBy: "John Doe",
  createdByGroup: "Development",
  createdAt: "2025-01-01T00:00:00.000Z"
}
```

## 🔌 API Integration

### elabFTW API
- **Endpoint**: `/api/v2/experiments`
- **Authentication**: API Key header
- **Methods**: POST (create), PATCH (update)
- **Metadata**: JSON in experiment body
- **Files**: Folder structure as attachment

### Browser APIs
- **localStorage**: Data persistence
- **fetch**: elabFTW communication
- **File API**: Settings import/export
- **DOM**: User interface manipulation

## 🎨 Theming

### CSS Custom Properties
```css
:root {
  --primary-color: #7c3aed;
  --secondary-color: #a855f7;
  --background: linear-gradient(135deg, #1e1e2e, #2a2a40);
  --text-color: #e0e0e0;
  --border-color: rgba(255, 255, 255, 0.1);
}
```

### Component Classes
- `.template-item` - Template list items
- `.template-avatar` - User identification
- `.modal-content` - Dialog containers
- `.form-group` - Input grouping
- `.btn` - Button styling

## 🔒 Security

### Data Privacy
- **Local Storage**: All data stays in browser
- **No Cloud**: No external data transmission (except elabFTW)
- **API Keys**: Stored locally, transmitted securely
- **Groups**: Logical separation, not security boundary

### Best Practices
- Use HTTPS for elabFTW connections
- Verify SSL certificates in production
- Regular backup via settings export
- Clear browser data when sharing devices

## 🧪 Development

### Adding New Template Types
1. Extend `templateTypeManager.js`
2. Add UI components in template modal
3. Update rendering in `templateManager.js`
4. Add metadata handling if needed

### Creating New Settings
1. Add default value in `settingsManager.js`
2. Add UI element in `settingsModal.html`
3. Implement change handler
4. Add validation if needed

### Extending User System
1. Modify `userManager.js` for new user properties
2. Update storage format in `storage.js`
3. Adjust UI in `loginModal.js` and `userManagementModal.js`
4. Handle migration for existing data

## 📋 Browser Support

### Minimum Requirements
- **Chrome**: 80+
- **Firefox**: 75+
- **Safari**: 13+
- **Edge**: 80+

### Required Features
- ES6+ JavaScript
- localStorage API
- fetch API
- CSS Grid & Flexbox
- HTML5 form validation

## 🐛 Troubleshooting

### Common Issues
- **Templates not showing**: Check template type filter
- **Cannot edit template**: Template belongs to another user
- **Login loop**: Clear localStorage and restart
- **Settings not saved**: Check browser storage permissions
- **elabFTW sync fails**: Verify API key and server URL

### Debug Mode
Open browser console and run:
```javascript
window.checkModules(); // Check module loading
localStorage.clear();  // Reset all data
```

## 📈 Performance

### Optimization Tips
- Templates cached in memory during session
- Settings loaded once at startup
- Minimal DOM manipulation
- Efficient event handling
- Lazy loading of settings modal

### Limits
- ~5MB total localStorage limit
- ~1000 templates recommended maximum
- Group size not technically limited
- Browser memory dependent

## 🔄 Updates & Migration

### Version Compatibility
- Settings format backward compatible
- Template structure extensible
- User data preserved across updates
- Manual migration for major changes

### Update Process
1. Backup settings via export
2. Replace application files
3. Clear browser cache
4. Test functionality
5. Import settings if needed

---

## 📞 Support

For questions, issues, or feature requests:
- Check the [User Guide](metafold_user_guide.md)
- Review browser console for errors
- Verify settings configuration
- Test with minimal example

---

**MetaFold v2.0** - Efficient project template management for individuals and teams.