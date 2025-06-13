# Integration APIs Reference

This technical reference documents all integration APIs available in MetaFold, including elabFTW, OMERO, custom integrations, and the MetaFold internal API. Use this as a comprehensive guide for developing custom integrations and understanding the technical details of existing integrations.

![Integration APIs Reference](images/reference/integration-apis-reference.png)

## API Overview

### Integration Architecture

MetaFold supports multiple integration patterns:

**Direct API Integration**
- REST API calls to external services
- OAuth 2.0 and API key authentication
- Real-time data synchronization
- Error handling and retry logic

**Proxy-Based Integration**
- Python proxy server for CORS handling
- Session management and authentication forwarding
- Request filtering and validation
- Local caching and optimization

**Plugin Architecture**
- Custom integration plugins
- Standardized plugin interface
- Dynamic loading and configuration
- Extensible integration framework

**Webhook Integration**
- Event-driven updates from external systems
- Bidirectional data synchronization
- Real-time notifications
- Automated workflow triggers

![Integration Architecture](images/reference/integration-architecture.png)

### Supported Integration Types

| Integration | Type | Authentication | Capabilities |
|-------------|------|----------------|--------------|
| elabFTW | Direct REST API | API Key | Experiment creation, metadata sync |
| OMERO | Proxy-based | Username/Password | Dataset creation, annotations |
| Custom APIs | Direct REST API | Various | Configurable endpoints |
| Database | Direct connection | Credentials | Read/write operations |
| File Systems | Direct access | OS permissions | File operations |
| Webhooks | HTTP callbacks | Tokens/Signatures | Event notifications |

## elabFTW Integration API

### Authentication

**API Key Authentication**
```javascript
const elabftw = {
  base_url: 'https://your-elabftw-server.com',
  api_key: 'your-api-key-here',
  
  headers: {
    'Authorization': `Bearer ${api_key}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};
```

**Connection Testing**
```javascript
async function testElabFTWConnection(config) {
  try {
    const response = await fetch(`${config.base_url}/api/v2/users/me`, {
      method: 'GET',
      headers: config.headers
    });
    
    if (response.ok) {
      const user = await response.json();
      return {
        success: true,
        user: user,
        teams: user.teams || []
      };
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

### Experiment Management

**Create Experiment**
```javascript
async function createElabFTWExperiment(config, experimentData) {
  const payload = {
    title: experimentData.title,
    body: experimentData.description || '',
    category_id: experimentData.category_id || 1,
    status_id: experimentData.status_id || 1,
    tags: experimentData.tags || [],
    extra_fields: transformMetadataToExtraFields(experimentData.metadata)
  };
  
  try {
    const response = await fetch(`${config.base_url}/api/v2/experiments`, {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      const result = await response.json();
      return {
        success: true,
        experiment_id: result.id,
        experiment_url: `${config.base_url}/experiments.php?mode=view&id=${result.id}`
      };
    } else {
      throw new Error(`Failed to create experiment: ${response.statusText}`);
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

**Update Experiment**
```javascript
async function updateElabFTWExperiment(config, experimentId, updates) {
  const payload = {
    title: updates.title,
    body: updates.body,
    extra_fields: updates.extra_fields
  };
  
  const response = await fetch(`${config.base_url}/api/v2/experiments/${experimentId}`, {
    method: 'PATCH',
    headers: config.headers,
    body: JSON.stringify(payload)
  });
  
  return response.ok;
}
```

### Extra Fields Management

**Transform Metadata to Extra Fields**
```javascript
function transformMetadataToExtraFields(metadata) {
  const extraFields = {};
  
  for (const [key, value] of Object.entries(metadata)) {
    // Convert MetaFold field names to elabFTW format
    const elabftw_key = key.replace(/[^a-zA-Z0-9_]/g, '_');
    
    extraFields[elabftw_key] = {
      value: String(value),
      type: inferFieldType(value)
    };
  }
  
  return extraFields;
}

function inferFieldType(value) {
  if (typeof value === 'number') return 'number';
  if (value instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
  if (typeof value === 'boolean') return 'checkbox';
  if (Array.isArray(value)) return 'select';
  return 'text';
}
```

**Retrieve Extra Fields**
```javascript
async function getExperimentExtraFields(config, experimentId) {
  const response = await fetch(
    `${config.base_url}/api/v2/experiments/${experimentId}`,
    {
      method: 'GET',
      headers: config.headers
    }
  );
  
  if (response.ok) {
    const experiment = await response.json();
    return experiment.extra_fields || {};
  }
  
  throw new Error('Failed to retrieve experiment extra fields');
}
```

### File Attachments

**Upload Files to Experiment**
```javascript
async function uploadFileToExperiment(config, experimentId, file, filename) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('comment', `Uploaded from MetaFold: ${filename}`);
  
  const response = await fetch(
    `${config.base_url}/api/v2/experiments/${experimentId}/uploads`,
    {
      method: 'POST',
      headers: {
        'Authorization': config.headers.Authorization
        // Note: Don't set Content-Type for FormData
      },
      body: formData
    }
  );
  
  return response.ok;
}
```

![elabFTW API](images/reference/elabftw-api.png)

## OMERO Integration API

### Proxy Server Architecture

**Python Proxy Server Setup**
```python
#!/usr/bin/env python3
"""
OMERO Proxy Server for MetaFold Integration
Handles CORS and authentication for OMERO.web API
"""

import requests
import argparse
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

class OMEROProxy:
    def __init__(self, omero_server_url):
        self.omero_server = omero_server_url.rstrip('/')
        self.session = requests.Session()
    
    def login(self, username, password):
        """Authenticate with OMERO server"""
        login_url = f"{self.omero_server}/api/login/"
        
        response = self.session.post(login_url, json={
            'username': username,
            'password': password,
            'server': 1
        })
        
        if response.status_code == 200:
            # Extract session token and CSRF token
            self.session_token = response.json().get('eventContext', {}).get('sessionUuid')
            self.csrf_token = response.cookies.get('csrftoken')
            return True
        return False
    
    def proxy_request(self, method, endpoint, data=None, params=None):
        """Proxy request to OMERO server with session authentication"""
        url = f"{self.omero_server}/api/{endpoint}"
        
        headers = {
            'X-CSRFToken': self.csrf_token,
            'Referer': self.omero_server
        }
        
        response = self.session.request(
            method=method,
            url=url,
            json=data,
            params=params,
            headers=headers
        )
        
        return {
            'status_code': response.status_code,
            'data': response.json() if response.content else None,
            'headers': dict(response.headers)
        }

# Global proxy instance
proxy = None

@app.route('/login', methods=['POST'])
def login():
    global proxy
    data = request.json
    
    if proxy.login(data['username'], data['password']):
        return jsonify({'success': True, 'message': 'Login successful'})
    else:
        return jsonify({'success': False, 'error': 'Login failed'}), 401

@app.route('/api/<path:endpoint>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def proxy_api(endpoint):
    global proxy
    
    result = proxy.proxy_request(
        method=request.method,
        endpoint=endpoint,
        data=request.json,
        params=request.args
    )
    
    return jsonify(result['data']), result['status_code']

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--omero-server', required=True)
    args = parser.parse_args()
    
    proxy = OMEROProxy(args.omero_server)
    app.run(host='localhost', port=args.port, debug=False)
```

### Authentication and Session Management

**JavaScript Client for Proxy**
```javascript
class OMEROClient {
  constructor(proxyUrl = 'http://localhost:8000') {
    this.proxyUrl = proxyUrl;
    this.authenticated = false;
  }
  
  async login(username, password) {
    try {
      const response = await fetch(`${this.proxyUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const result = await response.json();
      this.authenticated = result.success;
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async apiCall(endpoint, method = 'GET', data = null) {
    if (!this.authenticated) {
      throw new Error('Not authenticated with OMERO');
    }
    
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${this.proxyUrl}/api/${endpoint}`, options);
    return response.json();
  }
}
```

### Dataset Management

**Create Dataset**
```javascript
async function createOMERODataset(client, datasetInfo) {
  const payload = {
    name: datasetInfo.name,
    description: datasetInfo.description || '',
    project: datasetInfo.project_id || null
  };
  
  try {
    const result = await client.apiCall('datasets/', 'POST', payload);
    
    if (result && result.id) {
      return {
        success: true,
        dataset_id: result.id,
        dataset_url: `${client.omeroServerUrl}/webclient/?show=dataset-${result.id}`
      };
    } else {
      throw new Error('Failed to create dataset');
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

**Link Dataset to Project**
```javascript
async function linkDatasetToProject(client, datasetId, projectId) {
  const payload = {
    dataset: datasetId,
    project: projectId
  };
  
  const result = await client.apiCall('project_dataset_links/', 'POST', payload);
  return result.success || false;
}
```

### Map Annotations

**Create Map Annotations**
```javascript
async function createMapAnnotations(client, objectType, objectId, metadata) {
  const annotations = [];
  
  // Convert metadata to OMERO map annotation format
  for (const [key, value] of Object.entries(metadata)) {
    if (value !== null && value !== undefined) {
      annotations.push([`MetaFold_${key}`, String(value)]);
    }
  }
  
  const payload = {
    map_annotations: [{
      values: annotations,
      description: 'MetaFold project metadata'
    }],
    object_type: objectType,
    object_ids: [objectId]
  };
  
  try {
    const result = await client.apiCall('annotations/', 'POST', payload);
    return {
      success: true,
      annotation_ids: result.annotation_ids || []
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

**Retrieve Map Annotations**
```javascript
async function getMapAnnotations(client, objectType, objectId) {
  const endpoint = `${objectType}s/${objectId}/map_annotations/`;
  
  try {
    const annotations = await client.apiCall(endpoint);
    const metadata = {};
    
    for (const annotation of annotations) {
      for (const [key, value] of annotation.values) {
        if (key.startsWith('MetaFold_')) {
          const metafield = key.replace('MetaFold_', '');
          metadata[metafield] = value;
        }
      }
    }
    
    return { success: true, metadata };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### Group and Permission Management

**Get User Groups**
```javascript
async function getUserGroups(client) {
  try {
    const groups = await client.apiCall('groups/');
    return groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      permissions: group.permissions
    }));
  } catch (error) {
    console.error('Failed to retrieve user groups:', error);
    return [];
  }
}
```

**Set Object Permissions**
```javascript
async function setObjectPermissions(client, objectType, objectId, groupId, permissions) {
  const payload = {
    object_type: objectType,
    object_id: objectId,
    group_id: groupId,
    permissions: permissions // 'rw-rw-rw-' format
  };
  
  const result = await client.apiCall('permissions/', 'POST', payload);
  return result.success || false;
}
```

![OMERO API](images/reference/omero-api.png)

## Custom Integration API

### Plugin Architecture

**Base Integration Plugin**
```javascript
class BaseIntegrationPlugin {
  constructor(config) {
    this.config = config;
    this.name = 'base_integration';
    this.version = '1.0.0';
  }
  
  // Required methods to implement
  async testConnection() {
    throw new Error('testConnection must be implemented');
  }
  
  async createProject(projectData) {
    throw new Error('createProject must be implemented');
  }
  
  async updateProject(projectId, updates) {
    throw new Error('updateProject must be implemented');
  }
  
  async getProject(projectId) {
    throw new Error('getProject must be implemented');
  }
  
  // Optional methods
  async deleteProject(projectId) {
    return { success: false, error: 'Delete not supported' };
  }
  
  async syncMetadata(projectId, metadata) {
    return { success: false, error: 'Sync not supported' };
  }
  
  // Lifecycle methods
  async initialize() {
    console.log(`Initializing ${this.name} plugin`);
  }
  
  async destroy() {
    console.log(`Destroying ${this.name} plugin`);
  }
  
  // Utility methods
  transformMetadata(metadata) {
    return metadata;
  }
  
  validateConfig() {
    return { valid: true };
  }
}
```

**Custom LIMS Integration Example**
```javascript
class CustomLIMSPlugin extends BaseIntegrationPlugin {
  constructor(config) {
    super(config);
    this.name = 'custom_lims';
    this.apiUrl = config.api_url;
    this.apiKey = config.api_key;
  }
  
  async testConnection() {
    try {
      const response = await fetch(`${this.apiUrl}/status`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      
      return {
        success: response.ok,
        status: response.status,
        message: response.ok ? 'Connection successful' : 'Connection failed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async createProject(projectData) {
    const limsData = this.transformToLIMSFormat(projectData);
    
    try {
      const response = await fetch(`${this.apiUrl}/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(limsData)
      });
      
      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          project_id: result.id,
          project_url: `${this.config.web_url}/projects/${result.id}`
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  transformToLIMSFormat(projectData) {
    return {
      name: projectData.title,
      description: projectData.description,
      principal_investigator: projectData.principal_investigator,
      start_date: projectData.date,
      custom_fields: this.transformMetadata(projectData.metadata)
    };
  }
  
  transformMetadata(metadata) {
    const customFields = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      customFields[`metafold_${key}`] = {
        value: value,
        type: this.inferFieldType(value)
      };
    }
    
    return customFields;
  }
  
  inferFieldType(value) {
    if (typeof value === 'number') return 'numeric';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    if (Array.isArray(value)) return 'list';
    return 'text';
  }
}
```

### Plugin Registration and Management

**Plugin Manager**
```javascript
class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.activePlugins = new Set();
  }
  
  registerPlugin(pluginClass, config) {
    const plugin = new pluginClass(config);
    
    // Validate plugin implementation
    if (!this.validatePlugin(plugin)) {
      throw new Error(`Invalid plugin: ${plugin.name}`);
    }
    
    this.plugins.set(plugin.name, plugin);
    return plugin;
  }
  
  async activatePlugin(pluginName) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginName}`);
    }
    
    await plugin.initialize();
    this.activePlugins.add(pluginName);
    
    return plugin;
  }
  
  async deactivatePlugin(pluginName) {
    const plugin = this.plugins.get(pluginName);
    if (plugin && this.activePlugins.has(pluginName)) {
      await plugin.destroy();
      this.activePlugins.delete(pluginName);
    }
  }
  
  getPlugin(pluginName) {
    return this.plugins.get(pluginName);
  }
  
  getActivePlugins() {
    return Array.from(this.activePlugins).map(name => this.plugins.get(name));
  }
  
  validatePlugin(plugin) {
    const requiredMethods = [
      'testConnection',
      'createProject', 
      'updateProject',
      'getProject'
    ];
    
    return requiredMethods.every(method => 
      typeof plugin[method] === 'function'
    );
  }
}

// Usage example
const pluginManager = new PluginManager();

// Register custom LIMS plugin
const limsConfig = {
  api_url: 'https://lims.example.com/api',
  api_key: 'your-api-key',
  web_url: 'https://lims.example.com'
};

pluginManager.registerPlugin(CustomLIMSPlugin, limsConfig);
await pluginManager.activatePlugin('custom_lims');
```

### Database Integration

**Database Plugin Example**
```javascript
class DatabaseIntegrationPlugin extends BaseIntegrationPlugin {
  constructor(config) {
    super(config);
    this.name = 'database_integration';
    this.connectionString = config.connection_string;
    this.tableName = config.table_name || 'metafold_projects';
  }
  
  async testConnection() {
    try {
      // Note: Actual database connection would use appropriate driver
      // This is a conceptual example
      const connection = await this.getConnection();
      await connection.query('SELECT 1');
      await connection.close();
      
      return { success: true, message: 'Database connection successful' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async createProject(projectData) {
    try {
      const connection = await this.getConnection();
      
      const insertQuery = `
        INSERT INTO ${this.tableName} 
        (project_id, title, description, metadata, created_at)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      const result = await connection.query(insertQuery, [
        projectData.id,
        projectData.title,
        projectData.description,
        JSON.stringify(projectData.metadata),
        new Date()
      ]);
      
      await connection.close();
      
      return {
        success: true,
        project_id: projectData.id,
        database_id: result.insertId
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async getConnection() {
    // Database-specific connection logic
    // Implementation depends on database type (MySQL, PostgreSQL, etc.)
    throw new Error('Database connection not implemented');
  }
}
```

![Custom Integration](images/reference/custom-integration.png)

## Webhook Integration API

### Webhook Server Setup

**Express.js Webhook Server**
```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

// Webhook signature verification
function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Generic webhook handler
app.post('/webhook/:integration', (req, res) => {
  const integration = req.params.integration;
  const signature = req.headers['x-signature'];
  const payload = JSON.stringify(req.body);
  
  // Verify signature if provided
  if (signature && !verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook based on integration type
  try {
    processWebhook(integration, req.body);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

function processWebhook(integration, data) {
  switch (integration) {
    case 'elabftw':
      handleElabFTWWebhook(data);
      break;
    case 'omero':
      handleOMEROWebhook(data);
      break;
    case 'custom':
      handleCustomWebhook(data);
      break;
    default:
      throw new Error(`Unknown integration: ${integration}`);
  }
}

function handleElabFTWWebhook(data) {
  if (data.event === 'experiment.updated') {
    // Update MetaFold project with elabFTW changes
    updateMetaFoldFromElabFTW(data.experiment_id, data.changes);
  }
}

function handleOMEROWebhook(data) {
  if (data.event === 'dataset.annotated') {
    // Sync OMERO annotations to MetaFold
    syncOMEROAnnotations(data.dataset_id, data.annotations);
  }
}

app.listen(3000, () => {
  console.log('Webhook server listening on port 3000');
});
```

### Bidirectional Synchronization

**Sync Manager**
```javascript
class SyncManager {
  constructor() {
    this.syncQueue = [];
    this.processing = false;
    this.conflictResolver = new ConflictResolver();
  }
  
  async queueSync(source, target, operation, data) {
    const syncTask = {
      id: this.generateSyncId(),
      source,
      target,
      operation,
      data,
      timestamp: new Date(),
      retries: 0
    };
    
    this.syncQueue.push(syncTask);
    this.processSyncQueue();
  }
  
  async processSyncQueue() {
    if (this.processing || this.syncQueue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    while (this.syncQueue.length > 0) {
      const task = this.syncQueue.shift();
      
      try {
        await this.executeSync(task);
      } catch (error) {
        await this.handleSyncError(task, error);
      }
    }
    
    this.processing = false;
  }
  
  async executeSync(task) {
    const { source, target, operation, data } = task;
    
    // Check for conflicts
    const conflict = await this.detectConflict(task);
    if (conflict) {
      const resolution = await this.conflictResolver.resolve(conflict);
      if (!resolution.proceed) {
        throw new Error('Sync cancelled due to conflict');
      }
      data = resolution.data;
    }
    
    // Execute sync operation
    switch (operation) {
      case 'create':
        await this.syncCreate(source, target, data);
        break;
      case 'update':
        await this.syncUpdate(source, target, data);
        break;
      case 'delete':
        await this.syncDelete(source, target, data);
        break;
      default:
        throw new Error(`Unknown sync operation: ${operation}`);
    }
  }
  
  async detectConflict(task) {
    // Implement conflict detection logic
    // Check timestamps, version numbers, checksums, etc.
    return null;
  }
  
  generateSyncId() {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

![Webhook Integration](images/reference/webhook-integration.png)

## MetaFold Internal API

### Project Management API

**Internal Project API**
```javascript
class MetaFoldProjectAPI {
  constructor() {
    this.projects = new Map();
    this.templates = new Map();
  }
  
  async createProject(templateId, metadata, options = {}) {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    // Validate metadata against template schema
    const validation = this.validateMetadata(metadata, template);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Generate project structure
    const project = {
      id: this.generateProjectId(),
      template_id: templateId,
      metadata: metadata,
      folder_structure: template.folderStructure,
      created_at: new Date(),
      status: 'created'
    };
    
    // Create folder structure
    if (options.create_folders !== false) {
      await this.createFolderStructure(project);
    }
    
    // Save metadata file
    await this.saveMetadataFile(project);
    
    // Execute integrations
    if (options.enable_integrations !== false) {
      await this.executeIntegrations(project, template);
    }
    
    this.projects.set(project.id, project);
    return project;
  }
  
  async updateProject(projectId, updates) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    
    // Update metadata
    if (updates.metadata) {
      project.metadata = { ...project.metadata, ...updates.metadata };
      await this.saveMetadataFile(project);
    }
    
    // Update integrations
    if (updates.sync_integrations) {
      await this.syncIntegrations(project);
    }
    
    project.updated_at = new Date();
    return project;
  }
  
  async getProject(projectId) {
    return this.projects.get(projectId);
  }
  
  async deleteProject(projectId, options = {}) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    
    // Clean up integrations
    if (options.cleanup_integrations !== false) {
      await this.cleanupIntegrations(project);
    }
    
    // Remove folder structure
    if (options.remove_folders !== false) {
      await this.removeFolderStructure(project);
    }
    
    this.projects.delete(projectId);
    return true;
  }
  
  validateMetadata(metadata, template) {
    const errors = [];
    const schema = template.metadata || {};
    
    // Check required fields
    for (const [fieldName, fieldDef] of Object.entries(schema)) {
      if (fieldDef.required && !metadata[fieldName]) {
        errors.push(`Required field missing: ${fieldName}`);
      }
    }
    
    // Validate field types and constraints
    for (const [fieldName, value] of Object.entries(metadata)) {
      const fieldDef = schema[fieldName];
      if (fieldDef) {
        const fieldValidation = this.validateField(value, fieldDef);
        if (!fieldValidation.valid) {
          errors.push(`Field ${fieldName}: ${fieldValidation.error}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  validateField(value, fieldDef) {
    // Implement field-specific validation
    switch (fieldDef.type) {
      case 'text':
        return this.validateTextField(value, fieldDef);
      case 'number':
        return this.validateNumberField(value, fieldDef);
      case 'date':
        return this.validateDateField(value, fieldDef);
      default:
        return { valid: true };
    }
  }
  
  generateProjectId() {
    return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### Template Management API

**Template API**
```javascript
class MetaFoldTemplateAPI {
  constructor() {
    this.templates = new Map();
    this.templateValidator = new TemplateValidator();
  }
  
  async createTemplate(templateData) {
    // Validate template schema
    const validation = this.templateValidator.validate(templateData);
    if (!validation.valid) {
      throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
    }
    
    const template = {
      ...templateData,
      id: templateData.id || this.generateTemplateId(),
      created_at: new Date(),
      version: templateData.version || '1.0.0'
    };
    
    this.templates.set(template.id, template);
    await this.saveTemplate(template);
    
    return template;
  }
  
  async updateTemplate(templateId, updates) {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    const updatedTemplate = { ...template, ...updates, updated_at: new Date() };
    
    // Validate updated template
    const validation = this.templateValidator.validate(updatedTemplate);
    if (!validation.valid) {
      throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
    }
    
    this.templates.set(templateId, updatedTemplate);
    await this.saveTemplate(updatedTemplate);
    
    return updatedTemplate;
  }
  
  async getTemplate(templateId) {
    return this.templates.get(templateId);
  }
  
  async listTemplates(filters = {}) {
    let templates = Array.from(this.templates.values());
    
    // Apply filters
    if (filters.type) {
      templates = templates.filter(t => t.type === filters.type);
    }
    
    if (filters.author) {
      templates = templates.filter(t => t.author === filters.author);
    }
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search)
      );
    }
    
    return templates;
  }
  
  async deleteTemplate(templateId) {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    // Check if template is in use
    const projectsUsingTemplate = await this.getProjectsUsingTemplate(templateId);
    if (projectsUsingTemplate.length > 0) {
      throw new Error(`Cannot delete template: ${projectsUsingTemplate.length} projects are using it`);
    }
    
    this.templates.delete(templateId);
    await this.removeTemplateFile(templateId);
    
    return true;
  }
  
  generateTemplateId() {
    return `tmpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### Event System API

**Event Manager**
```javascript
class MetaFoldEventManager {
  constructor() {
    this.listeners = new Map();
    this.eventHistory = [];
    this.maxHistorySize = 1000;
  }
  
  on(eventType, listener) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    
    this.listeners.get(eventType).push(listener);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType);
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }
  
  emit(eventType, eventData) {
    const event = {
      type: eventType,
      data: eventData,
      timestamp: new Date(),
      id: this.generateEventId()
    };
    
    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
    
    // Notify listeners
    const listeners = this.listeners.get(eventType) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in event listener for ${eventType}:`, error);
      }
    });
    
    return event;
  }
  
  getEventHistory(filters = {}) {
    let events = [...this.eventHistory];
    
    if (filters.type) {
      events = events.filter(e => e.type === filters.type);
    }
    
    if (filters.since) {
      events = events.filter(e => e.timestamp >= filters.since);
    }
    
    if (filters.limit) {
      events = events.slice(-filters.limit);
    }
    
    return events;
  }
  
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Event types
const METAFOLD_EVENTS = {
  PROJECT_CREATED: 'project:created',
  PROJECT_UPDATED: 'project:updated',
  PROJECT_DELETED: 'project:deleted',
  TEMPLATE_CREATED: 'template:created',
  TEMPLATE_UPDATED: 'template:updated',
  TEMPLATE_DELETED: 'template:deleted',
  INTEGRATION_SUCCESS: 'integration:success',
  INTEGRATION_FAILED: 'integration:failed',
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout'
};
```

![MetaFold Internal API](images/reference/metafold-internal-api.png)

## Error Handling and Best Practices

### Error Response Format

**Standardized Error Response**
```javascript
class APIError extends Error {
  constructor(message, code, statusCode = 500, details = {}) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
  
  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        details: this.details,
        timestamp: this.timestamp
      }
    };
  }
}

// Common error types
const ERROR_CODES = {
  AUTHENTICATION_FAILED: 'AUTH_001',
  INVALID_CREDENTIALS: 'AUTH_002',
  INSUFFICIENT_PERMISSIONS: 'AUTH_003',
  RESOURCE_NOT_FOUND: 'RES_001',
  VALIDATION_FAILED: 'VAL_001',
  INTEGRATION_FAILED: 'INT_001',
  NETWORK_ERROR: 'NET_001',
  INTERNAL_ERROR: 'INT_999'
};
```

### Retry Logic and Circuit Breaker

**Retry Mechanism**
```javascript
class RetryManager {
  constructor(config = {}) {
    this.maxRetries = config.maxRetries || 3;
    this.baseDelay = config.baseDelay || 1000;
    this.maxDelay = config.maxDelay || 30000;
    this.backoffMultiplier = config.backoffMultiplier || 2;
  }
  
  async executeWithRetry(operation, retryConfig = {}) {
    const maxRetries = retryConfig.maxRetries || this.maxRetries;
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries || !this.shouldRetry(error)) {
          break;
        }
        
        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }
  
  shouldRetry(error) {
    // Don't retry authentication or validation errors
    if (error.statusCode && error.statusCode < 500) {
      return false;
    }
    
    // Retry network errors and server errors
    return true;
  }
  
  calculateDelay(attempt) {
    const delay = this.baseDelay * Math.pow(this.backoffMultiplier, attempt);
    return Math.min(delay, this.maxDelay);
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Rate Limiting

**Rate Limiter**
```javascript
class RateLimiter {
  constructor(config = {}) {
    this.requests = new Map();
    this.maxRequests = config.maxRequests || 100;
    this.windowMs = config.windowMs || 60000; // 1 minute
    this.cleanupInterval = setInterval(() => this.cleanup(), this.windowMs);
  }
  
  async checkLimit(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const requests = this.requests.get(key);
    
    // Remove old requests
    while (requests.length > 0 && requests[0] < windowStart) {
      requests.shift();
    }
    
    if (requests.length >= this.maxRequests) {
      throw new APIError(
        'Rate limit exceeded',
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        429,
        {
          limit: this.maxRequests,
          window: this.windowMs,
          retryAfter: this.windowMs - (now - requests[0])
        }
      );
    }
    
    requests.push(now);
  }
  
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [key, requests] of this.requests.entries()) {
      while (requests.length > 0 && requests[0] < windowStart) {
        requests.shift();
      }
      
      if (requests.length === 0) {
        this.requests.delete(key);
      }
    }
  }
  
  destroy() {
    clearInterval(this.cleanupInterval);
  }
}
```

## Security Considerations

### Authentication and Authorization

**API Key Management**
```javascript
class APIKeyManager {
  constructor() {
    this.keys = new Map();
  }
  
  generateAPIKey(userId, permissions = []) {
    const key = `mf_${this.generateRandomString(32)}`;
    const keyData = {
      key,
      userId,
      permissions,
      created: new Date(),
      lastUsed: null,
      usage: 0
    };
    
    this.keys.set(key, keyData);
    return key;
  }
  
  validateAPIKey(key) {
    const keyData = this.keys.get(key);
    if (!keyData) {
      throw new APIError('Invalid API key', ERROR_CODES.INVALID_CREDENTIALS, 401);
    }
    
    keyData.lastUsed = new Date();
    keyData.usage++;
    
    return keyData;
  }
  
  checkPermission(keyData, requiredPermission) {
    if (!keyData.permissions.includes(requiredPermission) && 
        !keyData.permissions.includes('admin')) {
      throw new APIError(
        'Insufficient permissions',
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        403
      );
    }
  }
  
  generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
```

### Input Validation and Sanitization

**Request Validator**
```javascript
class RequestValidator {
  static validateProjectData(data) {
    const schema = {
      title: { type: 'string', required: true, maxLength: 200 },
      description: { type: 'string', required: false, maxLength: 2000 },
      template_id: { type: 'string', required: true, pattern: /^[a-zA-Z0-9_-]+$/ },
      metadata: { type: 'object', required: true }
    };
    
    return this.validate(data, schema);
  }
  
  static validate(data, schema) {
    const errors = [];
    
    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      
      if (rules.required && (value === undefined || value === null)) {
        errors.push(`${field} is required`);
        continue;
      }
      
      if (value !== undefined && value !== null) {
        if (rules.type && typeof value !== rules.type) {
          errors.push(`${field} must be of type ${rules.type}`);
        }
        
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field} exceeds maximum length of ${rules.maxLength}`);
        }
        
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(`${field} does not match required pattern`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  static sanitizeHTML(input) {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}
```

This comprehensive reference provides detailed technical information for all integration APIs available in MetaFold. Use it as a guide for developing custom integrations, understanding existing integrations, and implementing advanced API features.

---

*For the latest API updates and additional examples, visit the MetaFold developer documentation and community forums.*