const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const fs = require('fs').promises;
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        titleBarStyle: 'default',
        show: false
    });

    mainWindow.loadFile('index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        if (process.argv.includes('--dev')) {
            mainWindow.webContents.openDevTools();
        }
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers

// Folder Dialog
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Select Target Folder'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

// Create Project (Main API) - EXTENDED for optional folder structure
ipcMain.handle('create-project', async (event, basePath, projectName, structure, metadata = null) => {
    try {
        // Construct path correctly - path.join normalizes automatically
        const projectPath = path.join(basePath, projectName);
        
        console.log(`📁 Creating project: ${projectPath}`);
        
        // Create main project folder
        await fs.mkdir(projectPath, { recursive: true });
        console.log(`📁 Project folder created: ${projectPath}`);
        
        // Only create folder structure if present
        if (structure && structure.trim() !== '') {
            await createFolderStructure(projectPath, structure);
        } else {
            console.log(`📋 No folder structure defined - skipping structure creation`);
        }
        
        // Metadaten-JSON erstellen (falls vorhanden)
        if (metadata && Object.keys(metadata).length > 0) {
            await createMetadataFiles(projectPath, metadata, projectName);
        }
        
        // Adjust success message based on created content
        let message = 'Project created successfully!';
        const hasStructure = structure && structure.trim() !== '';
        const hasMetadata = metadata && Object.keys(metadata).length > 0;
        
        if (!hasStructure && hasMetadata) {
            message = 'Project with metadata created successfully!';
        } else if (hasStructure && hasMetadata) {
            message = 'Project with folder structure and metadata created successfully!';
        } else if (hasStructure && !hasMetadata) {
            message = 'Project with folder structure created successfully!';
        }
        
        // Normalize path for consistent return
        const normalizedPath = path.resolve(projectPath);
        
        return { 
            success: true, 
            message: message,
            projectPath: normalizedPath,
            hasStructure: hasStructure,
            hasMetadata: hasMetadata
        };
    } catch (error) {
        console.error('Error creating project:', error);
        return { success: false, message: `Error: ${error.message}` };
    }
});

// Legacy Support: Old create-folders API
ipcMain.handle('create-folders', async (event, targetPath, structure) => {
    try {
        await createFolderStructure(targetPath, structure);
        return { success: true, message: 'Folder structure created successfully!' };
    } catch (error) {
        console.error('Error creating folders:', error);
        return { success: false, message: `Error: ${error.message}` };
    }
});

// Open folder in explorer
ipcMain.handle('open-folder', async (event, folderPath) => {
    try {
        await shell.openPath(folderPath);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// Load JSON file (for metadata import)
ipcMain.handle('load-json-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'JSON Files', extensions: ['json'] }
        ],
        title: 'Select JSON File'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        try {
            const content = await fs.readFile(result.filePaths[0], 'utf8');
            return { success: true, content: JSON.parse(content) };
        } catch (error) {
            return { success: false, message: `Error loading JSON file: ${error.message}` };
        }
    }
    return { success: false, message: 'No file selected' };
});

// Save JSON file (for metadata export)
ipcMain.handle('save-json-file', async (event, data) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        filters: [
            { name: 'JSON Files', extensions: ['json'] }
        ],
        title: 'Save JSON File'
    });
    
    if (!result.canceled && result.filePath) {
        try {
            await fs.writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf8');
            return { success: true, message: 'JSON file saved successfully!' };
        } catch (error) {
            return { success: false, message: `Error saving JSON file: ${error.message}` };
        }
    }
    return { success: false, message: 'Save cancelled' };
});

// Helper Functions

// Improved folder structure creation
async function createFolderStructure(basePath, structure) {
    const lines = structure.split('\n').filter(line => line.trim() !== '');
    const pathStack = [basePath];
    
    console.log(`📋 Creating structure in: ${basePath}`);
    console.log(`📋 Structure:\n${structure}`);
    
    for (const line of lines) {
        if (!line.trim()) continue;
        
        // Determine indentation (2 spaces = 1 level)
        const indentMatch = line.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1].length : 0;
        const depth = Math.floor(indent / 2);
        const name = line.trim();
        
        console.log(`📝 Processing: "${line}" (depth: ${depth}, name: "${name}")`);
        
        // Adjust stack to correct depth
        pathStack.splice(depth + 1);
        
        console.log(`📚 Stack after adjustment: [${pathStack.join(', ')}]`);
        
        if (name.endsWith('/')) {
            // Create folder
            const folderName = name.slice(0, -1);
            const folderPath = path.join(...pathStack, folderName);
            
            try {
                await fs.mkdir(folderPath, { recursive: true });
                console.log(`📁 Folder created: ${folderPath}`);
                
                pathStack.push(folderName);
                console.log(`📚 Stack after folder addition: [${pathStack.join(', ')}]`);
                
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    throw error;
                }
                console.log(`📁 Folder already exists: ${folderPath}`);
                pathStack.push(folderName);
            }
        } else {
            // Create file
            const filePath = path.join(...pathStack, name);
            const dir = path.dirname(filePath);
            
            try {
                await fs.mkdir(dir, { recursive: true });
                
                // Check if file already exists
                try {
                    await fs.access(filePath);
                    console.log(`📄 File already exists: ${filePath}`);
                } catch {
                    // File doesn't exist, create it
                    await fs.writeFile(filePath, '', 'utf8');
                    console.log(`📄 File created: ${filePath}`);
                }
            } catch (error) {
                throw error;
            }
        }
    }
    
    console.log(`✅ Folder structure creation completed`);
}

// Create metadata files - ONLY ELABFTW FORMAT + ENHANCED README
async function createMetadataFiles(projectPath, metadata, projectName = null) {
    // 1. elabftw-metadata.json (elabFTW-compatible format)
    const elabftwPath = path.join(projectPath, 'elabftw-metadata.json');
    const elabftwContent = convertToElabFTWFormat(metadata);
    
    await fs.writeFile(elabftwPath, JSON.stringify(elabftwContent, null, 2), 'utf8');
    console.log(`📄 elabFTW metadata created: ${elabftwPath}`);
    
    // 2. Create enhanced README with metadata info - ALWAYS CREATE/OVERWRITE for experiments
    const readmePath = path.join(projectPath, 'README.md');
    const readmeContent = generateReadmeWithMetadata(metadata, projectName);
    await fs.writeFile(readmePath, readmeContent, 'utf8');
    console.log(`📄 Enhanced README.md with experiment metadata created: ${readmePath}`);
}

// Convert to elabFTW format
function convertToElabFTWFormat(metadata) {
    const elabftwData = {
        extra_fields: {},
        elabftw: {
            display_main_text: true
        }
    };
    
    const groups = new Map(); // Collect all groups
    let groupIdCounter = 1;
    let positionCounter = 1;
    
    // First pass: identify groups
    Object.entries(metadata).forEach(([key, fieldInfo]) => {
        if (fieldInfo.type === 'group') {
            const groupId = groupIdCounter++;
            groups.set(key, {
                id: groupId,
                name: fieldInfo.label || key
            });
        }
    });
    
    // Add groups to elabftw.extra_fields_groups
    if (groups.size > 0) {
        elabftwData.elabftw.extra_fields_groups = [];
        groups.forEach(group => {
            elabftwData.elabftw.extra_fields_groups.push(group);
        });
    }
    
    // Second pass: convert fields
    Object.entries(metadata).forEach(([key, fieldInfo]) => {
        // Skip group headers (handled separately)
        if (fieldInfo.type === 'group') {
            return;
        }
        
        // IMPORTANT: ensure value
        let safeValue = fieldInfo.value;
        
        // Base field properties
        const elabField = {
            type: mapFieldTypeToElabFTW(fieldInfo.type)
        };
        
        // Adjust value by type
        switch (fieldInfo.type) {
            case 'checkbox':
                // elabFTW expects "on" for true, "" for false
                elabField.value = safeValue ? "on" : "";
                break;
            case 'number':
                // Save numbers as string
                elabField.value = String(safeValue || 0);
                break;
            case 'dropdown':
                // Dropdown value as string
                elabField.value = String(safeValue || '');
                break;
            default:
                // All others as string
                elabField.value = String(safeValue || '');
        }
        
        // Position only if needed
        if (positionCounter > 1) {
            elabField.position = positionCounter;
        }
        positionCounter++;
        
        // Add description
        if (fieldInfo.description) {
            elabField.description = fieldInfo.description;
        }
        
        // Optional properties
        if (fieldInfo.required) {
            elabField.required = true;
        }
        
        // Mark textarea as multiline
        if (fieldInfo.type === 'textarea') {
            elabField.multiline = true;
        }
        
        // Dropdown options - IMPORTANT: as simple string array!
        if (fieldInfo.type === 'dropdown' && fieldInfo.options) {
            elabField.options = fieldInfo.options.map(opt => String(opt));
        }
        
        // Number constraints
        if (fieldInfo.type === 'number') {
            if (fieldInfo.min !== undefined) elabField.min = fieldInfo.min;
            if (fieldInfo.max !== undefined) elabField.max = fieldInfo.max;
        }
        
        // Assign to group (if field belongs to a group)
        if (key.includes('.')) {
            // Extract group name from nested field name
            const parts = key.split('.');
            const possibleGroupKey = parts[0] + '_group';
            
            if (groups.has(possibleGroupKey)) {
                elabField.group_id = groups.get(possibleGroupKey).id;
            }
        }
        
        // Add field (use label as key if available)
        const fieldKey = fieldInfo.label || key;
        elabftwData.extra_fields[fieldKey] = elabField;
    });
    
    return elabftwData;
}

// Map field types to elabFTW types
function mapFieldTypeToElabFTW(type) {
    const typeMap = {
        'text': 'text',
        'number': 'number',
        'date': 'date',
        'textarea': 'text', // elabFTW has no separate textarea
        'dropdown': 'select',
        'checkbox': 'checkbox'
    };
    
    return typeMap[type] || 'text';
}

// Generate README with metadata - ENHANCED for experiments
function generateReadmeWithMetadata(metadata, projectName = null) {
    const date = new Date().toISOString().split('T')[0];
    const formattedDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Start with project header
    let content = '';
    if (projectName) {
        content += `# ${projectName}\n\n`;
    } else {
        content += `# Project\n\n`;
    }
    
    content += `**Created:** ${formattedDate}\n\n`;
    
    // Add metadata section
    content += `## Experiment Metadata\n\n`;
    
    let hasMetadata = false;
    Object.entries(metadata).forEach(([key, fieldInfo]) => {
        if (fieldInfo.type !== 'group') {
            hasMetadata = true;
            const value = fieldInfo.value || '_Not filled_';
            const label = fieldInfo.label || key;
            
            // Format different types appropriately
            let formattedValue = value;
            if (fieldInfo.type === 'checkbox') {
                // Fix checkbox display: check the actual boolean value
                formattedValue = (value === true || value === 'true' || value === 'on') ? '✅ Yes' : '❌ No';
            } else if (fieldInfo.type === 'date' && value) {
                try {
                    const dateObj = new Date(value);
                    formattedValue = dateObj.toLocaleDateString('en-US');
                } catch (e) {
                    formattedValue = value;
                }
            } else if (fieldInfo.type === 'textarea' && value && value.length > 50) {
                // For long text, use blockquote format
                formattedValue = `\n> ${value.replace(/\n/g, '\n> ')}`;
            }
            
            content += `- **${label}**: ${formattedValue}\n`;
            
            // Add description if available
            if (fieldInfo.description) {
                content += `  - *${fieldInfo.description}*\n`;
            }
        }
    });
    
    if (!hasMetadata) {
        content += `*No metadata fields defined.*\n\n`;
    } else {
        content += `\n`;
    }
    
    // Add project description section
    content += `## Project Description\n\n`;
    content += `*Add your project description here. Describe the purpose, methodology, expected outcomes, and any important notes about this experiment.*\n\n`;
    
    // Add sections for experiment documentation
    content += `## Methodology\n\n`;
    content += `*Describe your experimental methodology, procedures, and protocols here.*\n\n`;
    
    content += `## Results\n\n`;
    content += `*Document your findings, observations, and results here.*\n\n`;
    
    content += `## Notes\n\n`;
    content += `*Add any additional notes, observations, or important information here.*\n\n`;
    
    // Add footer with generation info
    content += `---\n`;
    content += `*This README was automatically generated by MetaFold on ${formattedDate}*\n`;
    
    return content;
}

// Default value for metadata types
function getDefaultValueForType(type) {
    switch (type) {
        case 'number': return 0;
        case 'checkbox': return false;
        case 'date': return new Date().toISOString().split('T')[0];
        case 'textarea': return '';
        case 'dropdown': return '';
        default: return '';
    }
}