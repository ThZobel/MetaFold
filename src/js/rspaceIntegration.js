/**
 * RSpace ELN Integration Module
 * Handles communication with RSpace API
 */

const rspaceIntegration = {
    // Default configuration
    config: {
        apiUrl: 'https://community.researchspace.com/api/v1', // Default community URL
        apiKey: ''
    },

    /**
     * Initialize the integration with settings
     */
    async init() {
        console.log('🧪 Initializing RSpace Integration...');
        await this.loadSettings();
    },

    /**
     * Load settings from settingsManager
     */
    async loadSettings() {
        if (window.settingsManager) {
            this.config.apiUrl = await window.settingsManager.get('rspace.server_url') || 'https://community.researchspace.com/api/v1';
            this.config.apiKey = await window.settingsManager.get('rspace.api_key') || '';
        }
    },

    /**
     * Test connection to RSpace API
     * Uses GET /documents with limit 1 to verify auth
     */
    async testConnection() {
        await this.loadSettings();

        if (!this.config.apiKey) {
            throw new Error('API Key is missing');
        }

        console.log('🧪 Testing RSpace connection to:', this.config.apiUrl);

        try {
            const response = await fetch(`${this.config.apiUrl}/documents?maxResults=1`, {
                method: 'GET',
                headers: {
                    'apiKey': this.config.apiKey,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Unauthorized: Invalid API Key');
                }
                throw new Error(`Connection failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ RSpace Connection successful:', data);
            return { success: true, message: 'Connection successful' };

        } catch (error) {
            console.error('❌ RSpace Connection failed:', error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Create a new document in RSpace
     * @param {string} name - Document name
     * @param {string} tags - Comma separated tags
     * @param {string} contentHtml - HTML content for the document
     * @param {string} parentId - Optional parent folder ID
     */
    async createDocument(name, tags = '', contentHtml = '', parentId = null) {
        await this.loadSettings();

        console.log('🧪 Creating RSpace document:', name, 'in folder:', parentId || 'root');

        try {
            // 1. Create the document
            const docPayload = {
                name: name,
                tags: tags,
                fields: [
                    {
                        content: contentHtml
                    }
                ]
            };

            if (parentId) {
                docPayload.parentFolderId = parentId;
            }

            const response = await fetch(`${this.config.apiUrl}/documents`, {
                method: 'POST',
                headers: {
                    'apiKey': this.config.apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(docPayload)
            });

            if (!response.ok) {
                throw new Error(`Failed to create document: ${response.statusText}`);
            }

            const docData = await response.json();
            console.log('✅ RSpace Document created:', docData);

            return docData;

        } catch (error) {
            console.error('❌ Error creating RSpace document:', error);
            throw error;
        }
    },

    /**
     * Upload a file to RSpace
     * @param {File|Blob} file - File to upload
     * @param {string} filename - Name of the file
     */
    async uploadFile(file, filename) {
        await this.loadSettings();
        console.log('🧪 Uploading file to RSpace:', filename);

        try {
            const formData = new FormData();
            formData.append('file', file, filename);

            const response = await fetch(`${this.config.apiUrl}/files`, {
                method: 'POST',
                headers: {
                    'apiKey': this.config.apiKey
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Failed to upload file: ${response.statusText}`);
            }

            const fileData = await response.json();
            console.log('✅ RSpace File uploaded:', fileData);
            return fileData;

        } catch (error) {
            console.error('❌ Error uploading file to RSpace:', error);
            throw error;
        }
    },

    /**
     * Get documents and folders from RSpace
     * @param {string} parentId - Optional parent folder ID
     */
    async getDocuments(parentId = null) {
        await this.loadSettings();

        let url = `${this.config.apiUrl}/documents`;
        const params = new URLSearchParams();

        if (parentId) {
            params.append('parentId', parentId);
        }

        // Add query params if any
        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        console.log('🧪 Fetching RSpace documents from:', url);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'apiKey': this.config.apiKey,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch documents: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ RSpace Documents fetched:', data);
            return data;

        } catch (error) {
            console.error('❌ Error fetching RSpace documents:', error);
            throw error;
        }
    },

    /**
     * Create a document with an attached file
     * @param {string} name - Document name
     * @param {string} tags - Tags
     * @param {string} contentHtml - HTML content
     * @param {File} file - File object to upload
     */
    async createDocumentWithAttachment(name, tags, contentHtml, file) {
        try {
            // 1. Upload the file
            const fileData = await this.uploadFile(file, file.name);

            // 2. Append file link to content
            // Using RSpace internal link format if possible, or just a note
            // The fileData usually contains an 'id' and 'name'
            // We can create a link like <a href="fileId=123">Filename</a> which RSpace might resolve,
            // or simply mention the file was uploaded.

            // For now, we'll append a simple HTML link referencing the file ID
            // RSpace likely has a specific format for embedding, but without docs, we'll use a generic approach
            // that at least records the upload.
            const fileLink = `<p>Attached File: <b>${fileData.name}</b> (ID: ${fileData.id})</p>`;
            const updatedContent = `${contentHtml}<br/><hr/>${fileLink}`;

            // 3. Create the document
            return await this.createDocument(name, tags, updatedContent);

        } catch (error) {
            console.error('❌ Error creating document with attachment:', error);
            throw error;
        }
    }
};

// Expose to window
window.rspaceIntegration = rspaceIntegration;
