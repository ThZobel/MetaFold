# MetaFold Development Instructions for Claude

## Project Overview

You are developing **MetaFold**, an Electron desktop application for laboratory data management in life sciences. The app creates standardized folder structures and metadata (JSON) for experiments.

**Core Features:**
- Template-based project creation with configurable metadata
- 4 customizable template categories per user
- Multi-user management with password protection
- Integration with elabFTW (electronic lab notebook) and OMERO (image management)
- User-specific and group-level settings

**Key Requirements:**
- **Language**: English UI
- **Design**: Simple, intuitive user experience
- **Architecture**: Modular structure
- **Code Quality**: Clean, concise, not overly complex

---

## Critical Development Principles

### 1. Minimal Invasive Development ⚠️
- **NEVER rewrite entire files** without explicit request
- Make targeted, surgical changes only
- Preserve all existing functionality
- **NEVER change existing function names**

### 2. Read Before You Code 📖
**Before adding/modifying any function:**
- Read the target `*.js` file completely
- Read related `*.js` files that call these functions
- Avoid assumptions - verify actual function signatures
- Check the comprehensive documentation in `MetaFold_v15_Complete_Documentation.md`

### 3. Step-by-Step Approach 🔄
- Break large tasks into small, manageable steps
- Ask for file confirmation before proceeding
- Present one change at a time
- Test incrementally

### 4. Console-First Debugging 🐛
- **Always test in browser console first** before making file changes
- Use debug functions:
  - `window.storage.healthCheck()`
  - `window.templateManager.debugStatus()`
  - `window.userManager.debugPasswordSystem()`
- Verify behavior before committing to files

---

## Development Workflow

### When Adding New Functionality:

1. **Research Phase:**
   - Check `*.md` files in project knowledge for overview
   - Search project knowledge for current file versions
   - Read relevant existing `*.js` files

2. **Implementation Phase:**
   - Create new functions as **individual artifacts**
   - Provide detailed integration instructions:
     - "Locate the section: `// Section Name`"
     - "Insert after function: `functionName()`"
     - "Add before line: `// Comment`"
   - **GOAL: No existing functions should be lost**

3. **Verification Phase:**
   - Test in browser console first
   - Verify integration points
   - Check for side effects

### Artifact Creation Guidelines:

```
✅ DO: Create single-function artifacts with precise integration instructions
✅ DO: Explain exactly where to insert code
✅ DO: Preserve all existing code

❌ DON'T: Rewrite entire files
❌ DON'T: Include unchanged code in artifacts
❌ DON'T: Change function names
```

---

## File Structure & Locations

### Project Root
**Path**: `C:\Users\Thomas Zobel\Documents\MetaFold\latest_dev`

### Key Files
- **HTML**: `src/index.html`
- **Main Process**: `src/main.js`
- **JavaScript**: `src/js/` (modular structure)
- **Styles**: `src/css/`

### Important Modules
- `js/templateManager.js` - Template CRUD operations
- `js/userManager.js` - User sessions & switching
- `js/settingsManager.js` - Settings with user/group context
- `js/storage.js` - File-based storage system
- `js/omero/` - OMERO integration (11 modules)
- `js/experimentForm.js` - Dynamic metadata forms

### Documentation
- **Complete Reference**: `MetaFold_v15_Complete_Documentation.md`
- Always check this for architecture decisions and current implementation

---

## File System Access

### If Project Knowledge is Empty:
1. Check file system connection
2. Access local files at: `C:\Users\Thomas Zobel\Documents\MetaFold\latest_dev`
3. Use Filesystem tools to read current file versions

### Reading Files:
```javascript
// Always read files before modifying
await window.fs.readFile('path/to/file.js', { encoding: 'utf8' })
```

---

## Important Technical Rules

### Code Quality
- Keep code **simple and maintainable**
- Verify edited code for correctness
- Use modular design patterns
- Follow existing code style (camelCase, emoji logs)

### Function Management
- **Preserve all existing function names**
- Add new functions, don't replace old ones
- Maintain backward compatibility
- Document integration points clearly

### Error Handling
- Always include try-catch blocks
- Log errors with context: `console.error('❌ Operation failed:', error)`
- Provide meaningful error messages
- Handle edge cases gracefully

### Settings & Storage
- User-specific settings: `metafold_[Group]_[User]_settings`
- Group defaults: `metafold_group_[Group]_category_settings`
- Templates: File-based in `MetaFold\Templates\[Group]\[User]\`

---

## Quick Reference

### Console Debug Commands
```javascript
// Current user context
window.userManager.getCurrentUserInfo()

// Storage status
window.storage.healthCheck()
window.storage.getStorageStats()

// Template info
window.templateManager.getAllTemplates()

// Settings
await window.settingsManager.get('key')
await window.settingsManager.getAllCategories()
```

### Before Every Code Change
1. ✅ Read the documentation
2. ✅ Read the target file(s)
3. ✅ Test in console
4. ✅ Create minimal artifact
5. ✅ Verify integration points

---

## Summary: The Golden Rules

🎯 **Think Step-by-Step** - Break down complex tasks
📖 **Read Before Writing** - Understand existing code first  
🔬 **Console First** - Test before committing  
✂️ **Minimal Changes** - Surgical precision, not wholesale replacement  
🔒 **Preserve Functions** - Never change existing function names  
📦 **Single Artifacts** - One function/feature per artifact  
📍 **Clear Instructions** - Explain exactly where code goes

---

*This instruction set ensures consistent, safe, and maintainable development of the MetaFold application.*