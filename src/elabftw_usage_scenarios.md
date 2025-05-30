# MetaFold elabFTW Integration - Usage Scenarios

## 📋 Overview

MetaFold's elabFTW integration provides flexible options for syncing experiment templates to your elabFTW server. There are three main scenarios depending on your configuration.

---

## 🚀 Scenario 1: Automatic Sync Mode

### **Configuration:**
- ✅ **elabFTW Integration: Enabled**  
- ✅ **Auto-sync experiments: Enabled**

### **User Experience:**
1. **Select experiment template** with metadata fields
2. **Fill out metadata** in the experiment form  
3. **Enter project details** (name, path)
4. **Click "Create Project"** 
5. **✨ Magic happens automatically:**
   - Local project folder created
   - README.md generated with metadata
   - elabFTW experiment created automatically
   - Metadata transferred to elabFTW as extra fields

### **Success Message:**
```
✅ Success!
Project "MyExperiment" created successfully!
📁 Folder structure + 📄 Metadata created
🧪 Synced to elabFTW successfully!

[📂 Open Folder] [🧪 View in elabFTW]
```

### **Best For:**
- **Research teams** with standardized workflows
- **Users who always** want experiments in elabFTW
- **Automated workflows** without manual decisions

---

## 🎯 Scenario 2: Manual Sync Mode  

### **Configuration:**
- ✅ **elabFTW Integration: Enabled**
- ❌ **Auto-sync experiments: Disabled**

### **User Experience:**
1. **Select experiment template** with metadata fields
2. **📱 New UI element appears:** "🧪 Send to elabFTW" checkbox in Project Setup
3. **Choose your option:**
   - ✅ **Check the box** = Send to elabFTW  
   - ❌ **Leave unchecked** = Local only
4. **Fill out metadata** and project details
5. **Click "Create Project"**
6. **Conditional sync:**
   - If checked: Creates elabFTW experiment + local files
   - If unchecked: Creates only local files + shows sync option

### **Success Message (with checkbox checked):**
```
✅ Success!
Project "MyExperiment" created successfully!
📁 Folder structure + 📄 Metadata created  
🧪 Synced to elabFTW successfully!

[📂 Open Folder] [🧪 View in elabFTW]
```

### **Success Message (without checkbox):**
```
✅ Success!
Project "MyExperiment" created successfully!
📁 Folder structure + 📄 Metadata created

[📂 Open Folder]

🧪 elabFTW Integration Available
Would you like to create this experiment in elabFTW?
[🚀 Sync to elabFTW]
```

### **Best For:**
- **Selective syncing** - some experiments local, some in elabFTW
- **Testing workflows** before committing to elabFTW
- **Mixed teams** with different preferences

---

## 🔒 Scenario 3: Integration Disabled

### **Configuration:**  
- ❌ **elabFTW Integration: Disabled**

### **User Experience:**
1. **Select any template** (folder or experiment)
2. **No elabFTW options visible** anywhere in the UI
3. **Standard MetaFold workflow:**
   - Fill out metadata (if experiment)
   - Enter project details
   - Click "Create Project"
4. **Local-only creation:**
   - Project folder created
   - README.md generated
   - No elabFTW communication

### **Success Message:**
```
✅ Success!
Project "MyProject" created successfully!
📁 Folder structure + 📄 Metadata created

[📂 Open Folder]
```

### **Best For:**
- **Local-only workflows** 
- **Teams without elabFTW**
- **Testing MetaFold** without external dependencies
- **Offline environments**

---

## ⚙️ Settings Configuration Guide

### **To Enable Automatic Sync:**
```
Settings → elabFTW Integration:
✅ Enable elabFTW Integration
🌐 Server URL: https://your-elabftw-server.com  
🔑 API Key: your_api_key_here
✅ Automatically sync experiments to elabFTW
```

### **To Enable Manual Sync:**
```
Settings → elabFTW Integration:
✅ Enable elabFTW Integration
🌐 Server URL: https://your-elabftw-server.com
🔑 API Key: your_api_key_here  
❌ Automatically sync experiments to elabFTW
```

### **To Disable Integration:**
```
Settings → elabFTW Integration:
❌ Enable elabFTW Integration
(All other options become irrelevant)
```

---

## 🎛️ UI Elements Reference

### **Project Setup Section:**

#### **Integration Enabled + Auto-sync OFF:**
```
🎯 Project Setup
📂 Base Directory: [_________________] [Browse]
📝 Project Name: [_________________]

🧪 Send to elabFTW ☐
Create this experiment in elabFTW with metadata and structure
```

#### **Integration Enabled + Auto-sync ON:**
```  
🎯 Project Setup
📂 Base Directory: [_________________] [Browse]
📝 Project Name: [_________________]

(No checkbox - automatic sync enabled)
```

#### **Integration Disabled:**
```
🎯 Project Setup  
📂 Base Directory: [_________________] [Browse]
📝 Project Name: [_________________]

(No elabFTW options visible)
```

### **Template Info Section:**
Shows what content will be created:
- **📁 Folder structure + 📄 Metadata** (Full experiment)
- **📁 Folder structure only** (Structure without metadata)  
- **📄 Metadata only (no folders)** (Metadata-only template)
- **⚠️ Empty template** (Nothing defined)

---

## 🔍 Troubleshooting Scenarios

### **"I don't see the elabFTW checkbox"**
**Possible causes:**
- elabFTW Integration is disabled
- Auto-sync is enabled (checkbox not needed)
- Current template is not an experiment
- Current template has no metadata fields

**Solution:** Check Settings → elabFTW Integration

### **"Auto-sync isn't working"**  
**Check:**
- elabFTW Integration enabled?
- Auto-sync enabled? 
- API credentials correct?
- Server reachable?

**Test:** Use "Test Connection" in Settings

### **"Metadata not appearing in elabFTW"**
**Check:**
- Template has metadata fields defined?
- Metadata fields were filled out?
- Check browser console for API errors

---

## 📊 Decision Matrix

| Want elabFTW? | Always sync? | Configuration | UI Experience |
|---------------|--------------|---------------|---------------|
| ❌ No | N/A | Integration: **OFF** | Clean, local-only |
| ✅ Yes | ✅ Always | Integration: **ON**, Auto-sync: **ON** | Automatic, streamlined |
| ✅ Yes | ❌ Sometimes | Integration: **ON**, Auto-sync: **OFF** | Manual control, checkbox |

---

## 🎯 Recommended Workflows

### **For Research Labs:**
- **Enable integration** with **auto-sync ON**
- Set default category ID for consistent organization
- Train team members on metadata best practices

### **For Individual Researchers:**  
- **Enable integration** with **auto-sync OFF**
- Use manual checkbox for selective syncing
- Test workflows before enabling auto-sync  

### **For Local Development:**
- **Disable integration** initially
- Enable later when ready to connect to elabFTW
- Use local README files for documentation

---

*Last updated: May 2025*  
*Version: MetaFold 1.1.0 with elabFTW Integration*