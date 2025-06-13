const { app, BrowserWindow, dialog, ipcMain, shell, safeStorage } = require('electron');
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

// =================== SECURE STORAGE API ===================

// Check if safeStorage is available
ipcMain.handle('secure-storage-available', () => {
    try {
        return safeStorage.isEncryptionAvailable();
    } catch (error) {
        console.warn('safeStorage not available:', error.message);
        return false;
    }
});

// Encrypt sensitive data
ipcMain.handle('encrypt-data', (event, plaintext) => {
    try {
        if (!plaintext || plaintext.trim() === '') {
            return { success: true, encrypted: '', method: 'empty' };
        }
        
        if (safeStorage.isEncryptionAvailable()) {
            const buffer = safeStorage.encryptString(plaintext);
            const encrypted = buffer.toString('base64');
            console.log('🔐 Data encrypted using safeStorage');
            return { 
                success: true, 
                encrypted: encrypted,
                method: 'safeStorage'
            };
        } else {
            // Fallback: Return plaintext for browser-side encryption
            console.log('⚠️ safeStorage not available, using fallback method');
            return { 
                success: true, 
                encrypted: plaintext,
                method: 'fallback'
            };
        }
    } catch (error) {
        console.error('❌ Encryption failed:', error);
        return { 
            success: false, 
            error: error.message,
            encrypted: plaintext // Fallback to plaintext
        };
    }
});

// Decrypt sensitive data
ipcMain.handle('decrypt-data', (event, encryptedData, method = 'safeStorage') => {
    try {
        if (!encryptedData || encryptedData.trim() === '') {
            return { success: true, decrypted: '' };
        }
        
        if (method === 'safeStorage' && safeStorage.isEncryptionAvailable()) {
            const buffer = Buffer.from(encryptedData, 'base64');
            const decrypted = safeStorage.decryptString(buffer);
            console.log('🔓 Data decrypted using safeStorage');
            return { 
                success: true, 
                decrypted: decrypted 
            };
        } else {
            // For fallback method, return as-is (will be handled by browser-side crypto)
            return { 
                success: true, 
                decrypted: encryptedData 
            };
        }
    } catch (error) {
        console.error('❌ Decryption failed:', error);
        return { 
            success: false, 
            error: error.message,
            decrypted: encryptedData // Fallback to original data
        };
    }
});

// Migrate plaintext credentials to encrypted
ipcMain.handle('migrate-credentials', async (event, credentials) => {
    try {
        const migratedCredentials = {};
        
        for (const [key, value] of Object.entries(credentials)) {
            if (value && typeof value === 'string' && value.trim() !== '') {
                const encryptResult = await ipcMain.emit('encrypt-data', event, value);
                const result = encryptResult[0]; // Get the first result from the event
                
                migratedCredentials[key] = {
                    encrypted: result?.encrypted || value,
                    method: result?.method || 'fallback'
                };
                console.log(`🔄 Migrated credential: ${key.replace(/password|key/gi, '***')}`);
            } else {
                migratedCredentials[key] = { encrypted: '', method: 'none' };
            }
        }
        
        return { success: true, migrated: migratedCredentials };
    } catch (error) {
        console.error('❌ Migration failed:', error);
        return { success: false, error: error.message };
    }
});

// Generate secure random salt
ipcMain.handle('generate-salt', () => {
    try {
        const crypto = require('crypto');
        const salt = crypto.randomBytes(32).toString('hex');
        return { success: true, salt: salt };
    } catch (error) {
        console.error('❌ Salt generation failed:', error);
        return { success: false, error: error.message };
    }
});

// Secure credential storage with metadata
ipcMain.handle('store-secure-credential', async (event, key, value, metadata = {}) => {
    try {
        if (!value || value.trim() === '') {
            return { success: true, stored: '', method: 'empty' };
        }

        const timestamp = new Date().toISOString();
        const credentialData = {
            value: value,
            timestamp: timestamp,
            metadata: metadata
        };

        if (safeStorage.isEncryptionAvailable()) {
            const buffer = safeStorage.encryptString(JSON.stringify(credentialData));
            const encrypted = buffer.toString('base64');
            
            console.log(`🔐 Credential '${key.replace(/password|key/gi, '***')}' encrypted and stored`);
            
            return {
                success: true,
                stored: encrypted,
                method: 'safeStorage',
                timestamp: timestamp
            };
        } else {
            // Mark for browser-side encryption
            return {
                success: true,
                stored: JSON.stringify(credentialData),
                method: 'fallback',
                timestamp: timestamp
            };
        }
    } catch (error) {
        console.error('❌ Secure credential storage failed:', error);
        return {
            success: false,
            error: error.message,
            stored: value // Fallback
        };
    }
});

// Retrieve secure credential with metadata
ipcMain.handle('retrieve-secure-credential', async (event, encryptedData, method = 'safeStorage') => {
    try {
        if (!encryptedData || encryptedData.trim() === '') {
            return { success: true, value: '', metadata: {}, timestamp: null };
        }

        let credentialData;

        if (method === 'safeStorage' && safeStorage.isEncryptionAvailable()) {
            const buffer = Buffer.from(encryptedData, 'base64');
            const decrypted = safeStorage.decryptString(buffer);
            credentialData = JSON.parse(decrypted);
            console.log('🔓 Secure credential retrieved and decrypted');
        } else {
            // Try to parse as JSON, fallback to plain string
            try {
                credentialData = JSON.parse(encryptedData);
            } catch {
                credentialData = { value: encryptedData, timestamp: null, metadata: {} };
            }
        }

        return {
            success: true,
            value: credentialData.value || '',
            metadata: credentialData.metadata || {},
            timestamp: credentialData.timestamp || null
        };
    } catch (error) {
        console.error('❌ Secure credential retrieval failed:', error);
        return {
            success: false,
            error: error.message,
            value: encryptedData, // Fallback
            metadata: {},
            timestamp: null
        };
    }
});

// =================== EXISTING IPC HANDLERS ===================

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

// Open URL
ipcMain.handle('open-external', async (event, url) => {
    try {
        await shell.openExternal(url);
        return { success: true };
    } catch (error) {
        console.error('Error opening external URL:', error);
        return { success: false, error: error.message };
    }
});

// =================== EXISTING HELPER FUNCTIONS ===================

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
				elabField.value = (safeValue === true || safeValue === 'true' || safeValue === 'on') ? "on" : "";
				break;
			case 'number':
				// Save numbers as string
				elabField.value = String(safeValue !== undefined && safeValue !== null && safeValue !== '' ? safeValue : 0);
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
					if (!isNaN(dateObj.getTime())) {
						formattedValue = dateObj.toLocaleDateString('en-US');
					} else {
						formattedValue = value || '_Not filled_';
					}
				} catch (e) {
					formattedValue = value || '_Not filled_';
				}
			} else if (fieldInfo.type === 'textarea' && value && value.length > 50) {
				// For long text, use blockquote format
				formattedValue = `\n> ${value.replace(/\n/g, '\n> ')}`;
			} else {
				formattedValue = value || '_Not filled_';
			}
            
            content += `- **${label}:** ${formattedValue}\n`;
            
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

// =================== PROJECT SCANNER API - Add to main.js ===================
// Add these handlers to the existing main.js file

// Scan directory recursively for MetaFold projects
ipcMain.handle('scan-metafold-projects', async (event, basePath, maxDepth = 5) => {
    try {
        console.log(`🔍 Scanning for MetaFold projects in: ${basePath}`);
        
        const projects = await scanForMetaFoldProjects(basePath, maxDepth);
        
        console.log(`✅ Found ${projects.length} MetaFold projects`);
        return { 
            success: true, 
            projects: projects,
            scannedPath: basePath,
            projectCount: projects.length
        };
    } catch (error) {
        console.error('❌ Error scanning for MetaFold projects:', error);
        return { 
            success: false, 
            message: `Error scanning projects: ${error.message}`,
            projects: []
        };
    }
});

// Get detailed project information
ipcMain.handle('get-project-details', async (event, projectPath) => {
    try {
        console.log(`📋 Getting project details for: ${projectPath}`);
        
        const details = await getProjectDetails(projectPath);
        
        return { 
            success: true, 
            details: details
        };
    } catch (error) {
        console.error('❌ Error getting project details:', error);
        return { 
            success: false, 
            message: `Error getting project details: ${error.message}`
        };
    }
});

// Get project statistics
ipcMain.handle('get-projects-statistics', async (event, projects) => {
    try {
        const stats = analyzeProjectStatistics(projects);
        
        return { 
            success: true, 
            statistics: stats
        };
    } catch (error) {
        console.error('❌ Error analyzing project statistics:', error);
        return { 
            success: false, 
            message: `Error analyzing statistics: ${error.message}`
        };
    }
});

// =================== HELPER FUNCTIONS ===================

// Main scanning function - recursively finds MetaFold projects
async function scanForMetaFoldProjects(basePath, maxDepth, currentDepth = 0) {
    const projects = [];
    
    if (currentDepth >= maxDepth) {
        console.log(`⚠️ Maximum depth (${maxDepth}) reached at: ${basePath}`);
        return projects;
    }
    
    try {
        // Check if current directory is a MetaFold project
        const metadataPath = path.join(basePath, 'elabftw-metadata.json');
        
        try {
            await fs.access(metadataPath);
            // This directory contains elabftw-metadata.json - it's a MetaFold project!
            const project = await parseMetaFoldProject(basePath);
            if (project) {
                projects.push(project);
                console.log(`📁 Found MetaFold project: ${project.name} (${project.path})`);
            }
        } catch (accessError) {
            // No elabftw-metadata.json in this directory, continue scanning
        }
        
        // Recursively scan subdirectories
        const entries = await fs.readdir(basePath, { withFileTypes: true });
        
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const subPath = path.join(basePath, entry.name);
                
                // Skip hidden directories and common non-project directories
                if (shouldSkipDirectory(entry.name)) {
                    continue;
                }
                
                try {
                    const subProjects = await scanForMetaFoldProjects(subPath, maxDepth, currentDepth + 1);
                    projects.push(...subProjects);
                } catch (subError) {
                    console.warn(`⚠️ Error scanning subdirectory ${subPath}:`, subError.message);
                    // Continue with other directories
                }
            }
        }
        
    } catch (error) {
        console.warn(`⚠️ Error accessing directory ${basePath}:`, error.message);
    }
    
    return projects;
}

// Parse a single MetaFold project directory
async function parseMetaFoldProject(projectPath) {
    try {
        const metadataPath = path.join(projectPath, 'elabftw-metadata.json');
        const readmePath = path.join(projectPath, 'README.md');
        
        // Read metadata
        const metadataContent = await fs.readFile(metadataPath, 'utf8');
        const metadata = JSON.parse(metadataContent);
        
        // Read README if it exists
        let readmeContent = null;
        try {
            readmeContent = await fs.readFile(readmePath, 'utf8');
        } catch (readmeError) {
            // README is optional
        }
        
        // Get directory stats
        const stats = await fs.stat(projectPath);
        
        // Extract project name from directory path
        const projectName = path.basename(projectPath);
        
        // Analyze metadata
        const metadataAnalysis = analyzeProjectMetadata(metadata);
        
        // Build project object
        const project = {
            name: projectName,
            path: projectPath,
            relativePath: projectPath, // Will be updated by caller if needed
            created: stats.birthtime || stats.ctime,
            modified: stats.mtime,
            size: await getDirectorySize(projectPath),
            
            // Metadata information
            metadata: metadata,
            metadataFieldCount: metadataAnalysis.fieldCount,
            metadataTypes: metadataAnalysis.types,
            
            // Content information
            hasReadme: readmeContent !== null,
            readmePreview: readmeContent ? readmeContent.substring(0, 200) + '...' : null,
            
            // Project structure
            depth: 0, // Will be calculated by caller
            parentPath: path.dirname(projectPath),
            
            // Quick access info
            type: 'metafold-project',
            version: '1.1.0' // MetaFold version that created this
        };
        
        return project;
        
    } catch (error) {
        console.error(`❌ Error parsing MetaFold project at ${projectPath}:`, error);
        return null;
    }
}

// Analyze metadata structure
function analyzeProjectMetadata(metadata) {
    const analysis = {
        fieldCount: 0,
        types: {},
        hasRequiredFields: false,
        completedFields: 0
    };
    
    if (metadata && metadata.extra_fields) {
        const fields = metadata.extra_fields;
        analysis.fieldCount = Object.keys(fields).length;
        
        Object.values(fields).forEach(field => {
            const type = field.type || 'unknown';
            analysis.types[type] = (analysis.types[type] || 0) + 1;
            
            if (field.required) {
                analysis.hasRequiredFields = true;
            }
            
            if (field.value && field.value.trim() !== '') {
                analysis.completedFields++;
            }
        });
    }
    
    return analysis;
}

// Get directory size recursively
async function getDirectorySize(dirPath) {
    try {
        let totalSize = 0;
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const entryPath = path.join(dirPath, entry.name);
            
            if (entry.isDirectory()) {
                totalSize += await getDirectorySize(entryPath);
            } else {
                const stats = await fs.stat(entryPath);
                totalSize += stats.size;
            }
        }
        
        return totalSize;
    } catch (error) {
        console.warn(`⚠️ Error calculating directory size for ${dirPath}:`, error.message);
        return 0;
    }
}

// Check if directory should be skipped during scanning
function shouldSkipDirectory(dirName) {
    const skipPatterns = [
        // Hidden directories
        /^\./,
        // Version control
        /^\.git$/,
        /^\.svn$/,
        // Node.js
        /^node_modules$/,
        // Build directories
        /^build$/,
        /^dist$/,
        /^target$/,
        // Temporary directories
        /^tmp$/,
        /^temp$/,
        // Cache directories
        /^cache$/,
        /^\.cache$/,
        // OS specific
        /^__pycache__$/,
        /^\.DS_Store$/,
        /^Thumbs\.db$/
    ];
    
    return skipPatterns.some(pattern => pattern.test(dirName));
}

// Get detailed information about a specific project
async function getProjectDetails(projectPath) {
    try {
        const project = await parseMetaFoldProject(projectPath);
        if (!project) {
            throw new Error('Not a valid MetaFold project');
        }
        
        // Get additional details
        const entries = await fs.readdir(projectPath, { withFileTypes: true });
        
        const details = {
            ...project,
            fileCount: entries.filter(entry => entry.isFile()).length,
            directoryCount: entries.filter(entry => entry.isDirectory()).length,
            files: entries.filter(entry => entry.isFile()).map(entry => entry.name),
            directories: entries.filter(entry => entry.isDirectory()).map(entry => entry.name),
            
            // Check for nested MetaFold projects
            hasNestedProjects: false
        };
        
        // Check for nested projects
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const subPath = path.join(projectPath, entry.name);
                const nestedMetadataPath = path.join(subPath, 'elabftw-metadata.json');
                
                try {
                    await fs.access(nestedMetadataPath);
                    details.hasNestedProjects = true;
                    break;
                } catch {
                    // No nested project in this directory
                }
            }
        }
        
        return details;
        
    } catch (error) {
        throw new Error(`Failed to get project details: ${error.message}`);
    }
}

// Analyze statistics across multiple projects
function analyzeProjectStatistics(projects) {
    const stats = {
        totalProjects: projects.length,
        totalSize: 0,
        averageFieldCount: 0,
        fieldTypes: {},
        projectsByDepth: {},
        creationDates: [],
        mostRecentProject: null,
        oldestProject: null,
        largestProject: null,
        
        // MetaFold specific statistics
        projectsWithReadme: 0,
        averageCompletionRate: 0,
        commonFieldTypes: {},
        projectHierarchy: {
            rootProjects: 0,
            nestedProjects: 0,
            maxDepth: 0
        }
    };
    
    if (projects.length === 0) {
        return stats;
    }
    
    let totalFieldCount = 0;
    let totalCompletedFields = 0;
    let totalPossibleFields = 0;
    
    projects.forEach(project => {
        // Basic stats
        stats.totalSize += project.size || 0;
        totalFieldCount += project.metadataFieldCount || 0;
        
        if (project.hasReadme) {
            stats.projectsWithReadme++;
        }
        
        // Field types analysis
        if (project.metadataTypes) {
            Object.entries(project.metadataTypes).forEach(([type, count]) => {
                stats.fieldTypes[type] = (stats.fieldTypes[type] || 0) + count;
            });
        }
        
        // Creation dates
        if (project.created) {
            stats.creationDates.push(project.created);
            
            if (!stats.mostRecentProject || project.created > stats.mostRecentProject.created) {
                stats.mostRecentProject = project;
            }
            
            if (!stats.oldestProject || project.created < stats.oldestProject.created) {
                stats.oldestProject = project;
            }
        }
        
        // Largest project
        if (!stats.largestProject || (project.size || 0) > (stats.largestProject.size || 0)) {
            stats.largestProject = project;
        }
        
        // Completion rate calculation
        if (project.metadata && project.metadata.extra_fields) {
            const fields = project.metadata.extra_fields;
            const fieldCount = Object.keys(fields).length;
            const completedCount = Object.values(fields).filter(field => 
                field.value && field.value.toString().trim() !== ''
            ).length;
            
            totalPossibleFields += fieldCount;
            totalCompletedFields += completedCount;
        }
    });
    
    // Calculate averages
    stats.averageFieldCount = totalFieldCount / projects.length;
    stats.averageCompletionRate = totalPossibleFields > 0 ? 
        (totalCompletedFields / totalPossibleFields) * 100 : 0;
    
    // Format sizes
    stats.totalSizeFormatted = formatBytes(stats.totalSize);
    stats.averageSizeFormatted = formatBytes(stats.totalSize / projects.length);
    
    return stats;
}

// Format bytes to human readable format
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}