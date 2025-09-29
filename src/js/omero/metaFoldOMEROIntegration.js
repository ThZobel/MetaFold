/**
 * MetaFold OMERO Integration - Saubere funktionierende Version
 * 
 * Basiert auf funktionierenden Logs:
 * - Neue Dataset IDs (15613, 15614) ✅
 * - Project Linking funktioniert ✅
 * - Map Annotations funktionieren ✅
 * - DELETE-Schritt entfernt (verursacht 501 Fehler)
 * - Nur funktionierende APIs beibehalten
 * 
 * @version 3.1 - Clean & Working
 * @author NFDI4BioImage MetaFold Team
 */

const metaFoldOMEROIntegration = {

    // =================== TEMPLATE GROUPS AUTO-DETECTION ===================

    // Helper function: Automatically detect if template has groups
    detectTemplateGroups(templateMetadata) {
        console.log('🔍 Auto-detecting template groups...');
        console.log('🔍 Template metadata:', templateMetadata);
        
        if (!templateMetadata) {
            console.log('🔍 No template metadata found');
            return false;
        }
        
        // *** FIX: Look in the correct location ***
        let fieldsObject = null;
        
        // Method 1: New format with metadata.fields
        if (templateMetadata.metadata && templateMetadata.metadata.fields) {
            fieldsObject = templateMetadata.metadata.fields;
            console.log('🔍 Using new format: metadata.fields');
        }
        // Method 2: Old format with direct metadata
        else if (templateMetadata.metadata) {
            fieldsObject = templateMetadata.metadata;
            console.log('🔍 Using old format: metadata');
        }
        else {
            console.log('🔍 No fields object found');
            return false;
        }
        
        // Look for group type fields
        const groupFields = Object.entries(fieldsObject)
            .filter(([key, field]) => field && field.type === 'group');
        
        if (groupFields.length > 0) {
            console.log(`🔍 ✅ Template groups detected: ${groupFields.length} groups found`);
            
            // Log group details
            groupFields.forEach(([key, field]) => {
                const groupName = field.label || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                console.log(`🔍    - Group: "${groupName}" (key: ${key})`);
            });
            
            return true;
        } else {
            console.log('🔍 ❌ No template groups found');
            return false;
        }
    },

    // =================== NEW FIXED MAP ANNOTATIONS METHOD ===================

    async addMapAnnotationsNew(datasetId, metadata, namespace, options = {}) {
        try {
            console.log('🚀 === ULTRA-SIMPLE MAP ANNOTATIONS (2 MODES ONLY) ===');
            console.log('🚀 Dataset ID:', datasetId);
            console.log('🚀 Namespace:', namespace);
            console.log('🚀 Metadata fields:', Object.keys(metadata || {}).length);
            
            // Check JSON Triplets checkbox from UI
            const jsonTripletsCheckbox = document.getElementById('omeroUseJsonTriplets');
            let useJsonTriplets = false;
            
            if (jsonTripletsCheckbox) {
                useJsonTriplets = jsonTripletsCheckbox.checked;
                console.log('📋 JSON Triplets checkbox:', useJsonTriplets ? 'CHECKED' : 'UNCHECKED');
            } else {
                console.log('📋 JSON Triplets checkbox not found in UI');
                useJsonTriplets = options.useJsonTriplets || false;
            }
            
            console.log('📋 Final mode decision: JSON Triplets =', useJsonTriplets);
            
            if (useJsonTriplets) {
                console.log('🔄 MODE 1: Using JSON TRIPLETS (legacy compatibility)...');
                return await this.addMapAnnotationsJsonTripletFallback(datasetId, metadata, namespace);
            } else {
                console.log('🔄 MODE 2: Using ENHANCED KEY-VALUE (with groups)...');
                
                // Get template metadata for groups support
                let templateMetadata = null;
                if (window.templateManager && window.templateManager.currentTemplate) {
                    templateMetadata = window.templateManager.currentTemplate;
                    console.log('📋 Template from templateManager:', templateMetadata.name);
                } else if (options.templateMetadata) {
                    templateMetadata = options.templateMetadata;
                    console.log('📋 Template from options:', templateMetadata.name || 'unnamed');
                } else {
                    console.log('📋 No template metadata available');
                }
                
                // Check if template has groups
                let hasGroups = false;
                if (templateMetadata) {
                    console.log('🔍 Template metadata structure:', {
                        hasFields: !!templateMetadata.metadata?.fields,
                        hasFieldOrder: !!templateMetadata.metadata?.fieldOrder,
                        fieldOrderLength: templateMetadata.metadata?.fieldOrder?.length || 0,
                        totalFields: templateMetadata.metadata?.fields ? Object.keys(templateMetadata.metadata.fields).length : 0
                    });
                    
                    hasGroups = this.detectTemplateGroups(templateMetadata);
                    console.log('📋 Template has groups:', hasGroups);
                }
                
                if (hasGroups && templateMetadata) {
                    console.log('🔄 Using ENHANCED conversion (with groups and correct fieldOrder)...');
                    
                    const keyValuePairs = window.omeroAnnotations.convertMetadataToSimpleKeyValuesWithGroups(
                        metadata, 
                        templateMetadata
                    );
                    
                    if (keyValuePairs.length > 0) {
                        console.log(`🔄 Generated ${keyValuePairs.length} total key-value pairs`);
                        
                        const result = await window.omeroAnnotations.testCreateMultipleKeyValues(datasetId, keyValuePairs);
                        
                        if (result.success) {
                            console.log('✅ Enhanced method with groups successful!');
                            return {
                                success: true,
                                method: 'enhanced_key_value_with_groups',
                                annotationId: result.annotationId,
                                keyValuePairs: keyValuePairs.length,
                                templateGroupsUsed: true
                            };
                        } else {
                            console.error('❌ Enhanced method failed:', result.error);
                            throw new Error(result.error);
                        }
                    } else {
                        throw new Error('No key-value pairs generated from metadata');
                    }
                } else {
                    console.log('🔄 Using SIMPLE conversion (no groups)...');
                    
                    const keyValuePairs = window.omeroAnnotations.convertMetadataToSimpleKeyValues(metadata);
                    
                    if (keyValuePairs.length > 0) {
                        console.log(`🔄 Generated ${keyValuePairs.length} simple key-value pairs`);
                        
                        const result = await window.omeroAnnotations.testCreateMultipleKeyValues(datasetId, keyValuePairs);
                        
                        if (result.success) {
                            console.log('✅ Simple method successful!');
                            return {
                                success: true,
                                method: 'simple_key_value',
                                annotationId: result.annotationId,
                                keyValuePairs: keyValuePairs.length,
                                templateGroupsUsed: false
                            };
                        } else {
                            console.error('❌ Simple method failed:', result.error);
                            throw new Error(result.error);
                        }
                    } else {
                        throw new Error('No key-value pairs generated from metadata');
                    }
                }
            }
        } catch (error) {
            console.error('❌ Enhanced method failed, trying JSON triplet fallback');
            console.error('❌ Error details:', error);
            return await this.addMapAnnotationsJsonTripletFallback(datasetId, metadata, namespace);
        }
    },

    // JSON Triplet fallback method
    async addMapAnnotationsJsonTripletFallback(datasetId, metadata, namespace) {
        console.log('🔧 Using JSON triplet fallback method...');
        return await this.addMapAnnotations(datasetId, metadata, namespace);
    },
    // =================== SCHLANKE HYBRID AUTHENTIFIZIERUNG ===================
    
    hybridAuth: {
        session: null,
        proxyUrl: 'http://localhost:3000/omero-api',
        
        // Bewährte schnelle Authentifizierung
        async loginViaJSONAPI(username, password, serverId = 1) {
            console.log('🔬 === SCHNELLE OMERO LOGIN ===');
            console.log('🔬 Username:', username);
            
            try {
                // Schritt 1: CSRF Token holen
                const tokenResponse = await fetch(`${this.proxyUrl}/api/v0/token/`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'Accept': 'application/json' }
                });
                
                if (!tokenResponse.ok) {
                    throw new Error(`CSRF Token fehlgeschlagen: ${tokenResponse.status}`);
                }
                
                const tokenData = await tokenResponse.json();
                const csrfToken = tokenData.data;
                console.log('✅ CSRF Token erhalten');
                
                // Schritt 2: Login
                const loginData = {
                    server: serverId,
                    username: username,
                    password: password,
                    csrfmiddlewaretoken: csrfToken
                };
                
                const response = await fetch(`${this.proxyUrl}/api/v0/login/`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRFToken': csrfToken,
                        'Referer': `${this.proxyUrl}/api/v0/login/`
                    },
                    body: JSON.stringify(loginData)
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Login fehlgeschlagen: ${response.status} - ${errorText}`);
                }
                
                const loginResult = await response.json();
                
                if (!loginResult.success) {
                    throw new Error(`Login nicht erfolgreich: ${loginResult.message || 'Unbekannter Fehler'}`);
                }
                
                console.log('✅ Login erfolgreich!');
                
                // Session-Informationen speichern
                this.session = {
                    ...loginResult.eventContext,
                    csrfToken: csrfToken,
                    loginTime: Date.now(),
                    isAuthenticated: true,
                    loginMethod: 'Schnelle JSON Auth'
                };
                
                console.log('📋 Benutzer:', this.session.userName);
                console.log('📋 Aktuelle Gruppe:', this.session.groupName, `(ID: ${this.session.groupId})`);
                console.log('📋 Mitglied in Gruppen:', this.session.memberOfGroups);
                
                return {
                    success: true,
                    session: this.session,
                    eventContext: loginResult.eventContext
                };
                
            } catch (error) {
                console.error('❌ Schnelle Login fehlgeschlagen:', error);
                this.session = null;
                throw error;
            }
        },
        
        // BEWÄHRTE Dataset-Erstellung (erstellt echte neue IDs)
        async createDatasetInGroup(name, description, groupId, projectId = null) {
            console.log('🔬 === OPTIMIERTE DATASET-ERSTELLUNG ===');
            console.log('🔬 Name:', name);
            console.log('🔬 Gruppen-ID:', groupId || 'none');
            console.log('🔬 Projekt-ID:', projectId || 'standalone');
            
            if (!this.session) {
                throw new Error('Keine aktive Session - bitte zuerst einloggen');
            }
            
            // Gruppenzugriff validieren (nur wenn groupId angegeben)
            if (groupId) {
                this.validateGroupAccess(groupId);
            }
            
            try {
                // Dataset standalone erstellen (bewährte Methode)
                const datasetData = {
                    "Name": name,
                    "Description": description || 'Erstellt von MetaFold',
                    "@type": "http://www.openmicroscopy.org/Schemas/OME/2016-06#Dataset"
                };
                
                // URL mit oder ohne Gruppe
                const saveUrl = groupId ? 
                    `${this.proxyUrl}/api/v0/m/save/?group=${groupId}` :
                    `${this.proxyUrl}/api/v0/save/`;
                
                console.log('🔬 Erstelle Dataset...');
                
                const response = await fetch(saveUrl, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRFToken': this.session.csrfToken
                    },
                    body: JSON.stringify(datasetData)
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Dataset-Erstellung fehlgeschlagen: ${response.status} - ${errorText}`);
                }
                
                const result = await response.json();
                const datasetId = result.data['@id'];
                
                if (!datasetId) {
                    throw new Error('Dataset-ID nicht in Response gefunden');
                }
                
                console.log('✅ Dataset erfolgreich erstellt');
                console.log('📋 Dataset-ID:', datasetId);
                
                // Projekt-Verknüpfung falls gewünscht
                let projectLinkResult = { success: false };
                if (projectId && projectId !== 'none') {
                    console.log('🔗 Verknüpfe Dataset mit Projekt...');
                    projectLinkResult = await this.linkDatasetToProject(datasetId, projectId);
                }
                
                return {
                    success: true,
                    datasetId: datasetId,
                    datasetName: result.data.Name,
                    groupId: groupId,
                    projectId: projectId,
                    method: 'Bewährte Erstellung',
                    linkedToProject: projectLinkResult.success,
                    verified: projectLinkResult.verified || false,
                    omeroWebUrl: this.generateOMEROURL(datasetId, groupId),
                    response: result.data
                };
                
            } catch (error) {
                console.error('❌ Dataset-Erstellung fehlgeschlagen:', error);
                throw error;
            }
        },
        
        // SAUBERE Projekt-Verknüpfung (ohne problematischen DELETE)
        async linkDatasetToProjectWebclient(datasetId, projectId) {
            console.log('🔗 === DATASET-PROJEKT-VERKNÜPFUNG (WEBCLIENT API) ===');
            console.log('📋 Dataset ID:', datasetId);
            console.log('📋 Project ID:', projectId);
            console.log('🎯 Using exact API structure from successful browser logs');
            
            try {
                if (!this.session || !this.session.csrfToken) {
                    throw new Error('No valid OMERO session found');
                }
                
                const linksUrl = `${this.proxyUrl}/webclient/api/links/`;
                
                // Link dataset to project (POST) - BEWÄHRTE METHODE
                console.log('🔗 Linking dataset to project (POST)');
                
                const linkBody = {
                    "project": {
                        [projectId]: {
                            "dataset": [parseInt(datasetId)]
                        }
                    }
                };
                
                console.log('📋 POST body:', JSON.stringify(linkBody));
                
                const linkResponse = await fetch(linksUrl, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'User-Agent': 'MetaFold/3.1',
                        'Accept': 'application/json, text/javascript, */*; q=0.01',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'X-CSRFToken': this.session.csrfToken,
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify(linkBody)
                });
                
                console.log('📋 POST response status:', linkResponse.status);
                
                if (!linkResponse.ok) {
                    const errorText = await linkResponse.text();
                    console.error('❌ POST link failed:', linkResponse.status, errorText);
                    throw new Error(`POST link failed: ${linkResponse.status} - ${errorText}`);
                }
                
                const linkResult = await linkResponse.json();
                console.log('✅ POST link successful:', linkResult);
                
                // DELETE-Schritt ENTFERNT (verursacht 501 Fehler und ist nicht notwendig)
                // Das Dataset ist bereits erfolgreich mit dem Project verknüpft
                
                // Verification der Verknüpfung
                console.log('🔍 Verifying dataset-project link');
                const verifyResult = await this.verifyDatasetProjectLink(datasetId, projectId);
                console.log('📋 Verification result:', verifyResult);
                
                return {
                    success: true,
                    method: 'webclient_api_links',
                    datasetId: parseInt(datasetId),
                    projectId: parseInt(projectId),
                    linkResponse: linkResult,
                    verified: verifyResult.success,
                    verificationMethod: verifyResult.method || 'unknown',
                    message: `Dataset ${datasetId} successfully linked to project ${projectId}`,
                    omeroWebUrl: this.generateOMEROURL(datasetId)
                };
                
            } catch (error) {
                console.error('❌ Dataset-Project linking failed:', error);
                return {
                    success: false,
                    method: 'webclient_api_links',
                    error: error.message,
                    datasetId: parseInt(datasetId),
                    projectId: parseInt(projectId),
                    message: `Failed to link dataset ${datasetId} to project ${projectId}: ${error.message}`
                };
            }
        },

        // Verification der Projekt-Verknüpfung
        async verifyDatasetProjectLink(datasetId, projectId) {
            console.log('🔍 Verifying dataset-project link...');
            console.log('📋 Dataset ID:', datasetId);
            console.log('📋 Project ID:', projectId);
            
            try {
                const projectDatasetsUrl = `${this.proxyUrl}/api/v0/m/projects/${projectId}/datasets/`;
                
                const response = await fetch(projectDatasetsUrl, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'X-CSRFToken': this.session.csrfToken,
                        'Accept': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const datasets = data.data || [];
                    
                    console.log(`🔍 Found ${datasets.length} datasets in project`);
                    
                    const found = datasets.find(ds => {
                        const dsId = ds['@id'] || ds.id;
                        return dsId == datasetId || String(dsId) === String(datasetId);
                    });
                    
                    if (found) {
                        console.log('✅ VERIFICATION SUCCESS: Dataset found in project!');
                        return {
                            success: true,
                            method: 'project_datasets_check',
                            isLinked: true,
                            foundDataset: found,
                            totalDatasetsInProject: datasets.length
                        };
                    } else {
                        console.log('❌ VERIFICATION FAILED: Dataset not found in project');
                        return {
                            success: false,
                            method: 'project_datasets_check',
                            isLinked: false,
                            totalDatasetsInProject: datasets.length,
                            message: 'Dataset not found in project datasets'
                        };
                    }
                } else {
                    console.warn('⚠️ Project datasets check failed:', response.status);
                    return {
                        success: false,
                        method: 'project_datasets_check',
                        message: `HTTP ${response.status}: Could not check project datasets`
                    };
                }
                
            } catch (error) {
                console.warn('⚠️ Link verification failed:', error);
                return {
                    success: false,
                    method: 'verification_exception',
                    message: error.message,
                    error: error
                };
            }
        },
        
        // Vereinfachte Projekt-Verknüpfung
        async linkDatasetToProject(datasetId, projectId) {
            console.log('🔗 === DATASET-PROJEKT-VERKNÜPFUNG (UPDATED) ===');
            console.log('📋 Dataset ID:', datasetId);
            console.log('📋 Project ID:', projectId);
            console.log('🎯 Using working webclient API method');
            
            const result = await this.linkDatasetToProjectWebclient(datasetId, projectId);
            
            if (result.success) {
                console.log('✅ Dataset successfully linked to project using webclient API');
                console.log('📋 Method:', result.method);
                console.log('📋 Verified:', result.verified);
                console.log('🌐 OMERO URL:', result.omeroWebUrl);
            } else {
                console.error('❌ Dataset linking failed:', result.message);
            }
            
            return result;
        },
        

    // OMERO URL Generator - FIX für Server-URL aus Settings
            generateOMEROURL(datasetId, groupId = null) {
                // FIX: Server-URL aus Session oder Settings lesen statt hart-kodiert
                let baseUrl = 'https://10.14.28.44/';  // Fallback
                
                // Method 1: Aus aktueller Session
                if (this.hybridAuth?.session?.serverUrl) {
                    baseUrl = this.hybridAuth.session.serverUrl;
                }
                // Method 2: Aus omeroAuth.baseUrl (aus Settings)  
                else if (window.omeroAuth?.baseUrl) {
                    baseUrl = window.omeroAuth.baseUrl;
                }
                // Method 3: Direkt aus Settings (async, aber als Fallback ok)
                else if (window.settingsManager) {
                    // Synchroner Fallback - Settings sollten bereits geladen sein
                    const settings = window.settingsManager.settings;
                    if (settings && settings['omero.server_url']) {
                        baseUrl = settings['omero.server_url'];
                    }
                }
                
                // URL generieren
                let url = `${baseUrl}webclient/?show=dataset-${datasetId}`;
                if (groupId) {
                    url += `&group=${groupId}`;
                }
                
                console.log('🔗 Generated OMERO URL:', url); // Debug log
                return url;
            },
        
        // Gruppenzugriff validieren
        validateGroupAccess(groupId) {
            if (!this.session) {
                throw new Error('Keine aktive Session');
            }
            
            const groupIdNum = parseInt(groupId);
            const hasAccess = this.session.memberOfGroups.includes(groupIdNum);
            
            if (!hasAccess) {
                throw new Error(`Benutzer ist nicht Mitglied der Gruppe ${groupId}. Verfügbare Gruppen: ${this.session.memberOfGroups.join(', ')}`);
            }
            
            console.log('✅ Gruppenzugriff validiert für Gruppe:', groupId);
            return true;
        },
        
        // Session-Gültigkeit prüfen
        isSessionValid() {
            if (!this.session) return false;
            
            const sessionAge = Date.now() - this.session.loginTime;
            const maxAge = 30 * 60 * 1000; // 30 Minuten
            
            return sessionAge < maxAge;
        }
    },
    
    // =================== HAUPTINTEGRATION ===================
    
    async createDatasetForMetaFoldProject(projectName, metadata, options = {}) {
        console.log("🚀 === SCHNELLE METAFOLD OMERO INTEGRATION ===");
        console.log(`📝 Project: ${projectName}`);
        console.log(`🔬 Metadata fields: ${metadata ? Object.keys(metadata).length : 0}`);
        console.log(`🎯 Target group: ${options.groupId || 'default'}`);
        console.log(`📁 Target project: ${options.projectId || 'standalone'}`);
        
        try {
            // Authentifizierung sicherstellen
            await this.ensureAuthentication();
            
            // Dataset erstellen
            console.log("🏗️ Creating OMERO dataset...");
            
            const datasetName = projectName;
            const datasetDescription = this.generateDatasetDescription(projectName, metadata, options);
            
            const datasetResult = await this.hybridAuth.createDatasetInGroup(
                datasetName,
                datasetDescription,
                options.groupId,
                options.projectId
            );
            
            if (!datasetResult.success) {
                throw new Error(`Dataset creation failed: ${datasetResult.message || 'Unknown error'}`);
            }
            
            const datasetId = datasetResult.datasetId;
            console.log(`✅ Dataset created: ID ${datasetId}`);
            
            if (datasetResult.linkedToProject) {
                console.log(`🔗 Dataset linked to project: ${options.projectId}`);
            }
            
            // Map Annotations hinzufügen - NEW SIMPLE METHOD
            let annotationResult = null;
            if (metadata && Object.keys(metadata).length > 0) {
                console.log("� Adding experiment metadata as Map Annotations (NEW SIMPLE METHOD)...");
                
                // Use new method with simple key-value pairs (falls back to old method if needed)
                annotationResult = await this.addMapAnnotationsNew(
                    datasetId,
                    metadata,
                    options.namespace || 'MetaFold Integration',
                    true  // useSimpleMethod = true
                );
                
                if (annotationResult.success) {
                    console.log(`✅ Map Annotations (${annotationResult.method || 'simple'}): ${annotationResult.keyValuePairs} pairs added`);
                } else {
                    console.log(`⚠️ Map Annotations failed: ${annotationResult.message}`);
                }
            }
            
            // Ergebnis zusammenstellen
            const result = {
                success: true,
                message: `MetaFold project "${projectName}" successfully exported to OMERO`,
                dataset: {
                    id: datasetId,
                    name: datasetResult.datasetName,
                    omeroWebUrl: datasetResult.omeroWebUrl,
                    groupId: datasetResult.groupId,
                    projectId: datasetResult.projectId || null,
                    linkedToProject: datasetResult.linkedToProject,
                    verified: datasetResult.verified
                },
                annotations: annotationResult || { success: false, message: 'No metadata provided' },
                integration: {
                    timestamp: new Date().toISOString(),
                    metafoldVersion: 'v3.1',
                    apiMethod: 'Schnelle Integration',
                    groupContext: options.groupId,
                    actualGroup: datasetResult.groupId,
                    projectContext: options.projectId
                }
            };
            
            console.log("🎉 MetaFold OMERO integration completed successfully!");
            console.log(`🌐 View in OMERO.web: ${datasetResult.omeroWebUrl}`);
            
            return result;
            
        } catch (error) {
            console.error("❌ MetaFold OMERO integration failed:", error);
            return {
                success: false,
                message: `Integration failed: ${error.message}`,
                error: error.message,
                stage: 'integration'
            };
        }
    },
    
    // =================== AUTHENTIFIZIERUNG ===================
    
    async ensureAuthentication() {
        console.log('🔍 Checking authentication...');
        
        if (!this.hybridAuth.isSessionValid()) {
            console.log('🔬 No valid session, attempting authentication...');
            
            if (!window.settingsManager) {
                throw new Error('settingsManager not available');
            }
            
            // Anmeldedaten aus Einstellungen holen
            const omeroEnabled = await window.settingsManager.get('omero.enabled');
            const omeroServerUrl = await window.settingsManager.get('omero.server_url');
            const omeroUsername = await window.settingsManager.get('omero.username');
            const omeroPassword = await window.settingsManager.get('omero.password');
            
            if (!omeroEnabled) {
                throw new Error('OMERO integration is disabled in settings');
            }
            
            if (!omeroServerUrl) {
                throw new Error('OMERO server URL not configured in settings');
            }
            
            if (!omeroUsername || !omeroPassword) {
                throw new Error('OMERO credentials not configured in settings');
            }
            
            console.log('✅ Settings loaded successfully');
            console.log('📋 Server URL:', omeroServerUrl);
            console.log('📋 Username:', omeroUsername);
            
            // Authentifizierung durchführen
            const loginResult = await this.hybridAuth.loginViaJSONAPI(
                omeroUsername,
                omeroPassword
            );
            
            if (!loginResult.success) {
                throw new Error(`Authentication failed: ${loginResult.message || 'Unknown error'}`);
            }
            
            console.log('✅ Authentication successful');
            console.log('📋 Authenticated as:', loginResult.session.userName);
            console.log('📋 Available groups:', loginResult.session.memberOfGroups);
        } else {
            console.log('✅ Valid session found');
        }
        
        return this.hybridAuth.session;
    },
    
    // =================== MAP ANNOTATIONS ===================

    async addMapAnnotations(datasetId, metadata, namespace, excludeIntegrationLinks = false) {
        console.log('🔬 Adding Map Annotations...');
        console.log('🔬 Dataset ID:', datasetId);
        console.log('🔬 Namespace:', namespace);
        console.log('🔬 Metadata fields:', Object.keys(metadata).length);
        
        try {
            // Metadaten zu Map-Annotation-Format konvertieren
            const mapPairs = this.convertMetadataToMapPairs(metadata, excludeIntegrationLinks);
            console.log('🔬 Generated map pairs:', mapPairs.length);
            
            // Session für CSRF Token verwenden
            const session = this.hybridAuth.session;
            if (!session || !session.csrfToken) {
                throw new Error('No valid session for map annotations');
            }
            
            // FormData für webclient annotate_map Endpoint vorbereiten
            const formData = new FormData();
            formData.append('dataset', parseInt(datasetId));
            formData.append('mapAnnotation', JSON.stringify(mapPairs));
            
            if (namespace && namespace !== 'default') {
                formData.append('ns', namespace);
            }
            
            // Request senden
            const response = await fetch(`${this.hybridAuth.proxyUrl}/webclient/annotate_map/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-CSRFToken': session.csrfToken,
                    'Accept': 'application/json'
                },
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Map Annotations created successfully!');
                
                return {
                    success: true,
                    keyValuePairs: mapPairs.length,
                    annotationId: result.annId ? result.annId[0] : 'created',
                    method: 'webclient_map_annotations',
                    response: result
                };
            } else {
                throw new Error(`Map Annotations failed: ${response.status} ${response.statusText}`);
            }
            
        } catch (error) {
            console.error('❌ Map Annotations failed:', error);
            return {
                success: false,
                message: `Map Annotations failed: ${error.message}`,
                error: error.message
            };
        }
    },
    
    // Map Annotations Funktion für projectManager Kompatibilität
    async addWorkingMapAnnotations(datasetId, metadata, namespace) {
        console.log('🔬 Adding working Map Annotations (projectManager compatibility)...');
        console.log('🔬 Dataset ID:', datasetId);
        console.log('🔬 Namespace:', namespace);
        
        return await this.addMapAnnotations(datasetId, metadata, namespace);
    },
    
    // =================== HILFSFUNKTIONEN ===================
    
    // Metadaten zu OMERO Map Annotation Paaren konvertieren
        convertMetadataToMapPairs(metadata, excludeIntegrationLinks = false) {
            const mapPairs = [];
        
        for (const [key, fieldData] of Object.entries(metadata)) {
            if (fieldData && typeof fieldData === 'object') {
                // Hauptwert hinzufügen
                if (fieldData.value !== undefined && fieldData.value !== null && fieldData.value !== '') {
                    mapPairs.push([key, String(fieldData.value)]);
                }
                
                // Typ-Information hinzufügen
                if (fieldData.type) {
                    mapPairs.push([`${key}_type`, fieldData.type]);
                }
                
                // Label hinzufügen wenn unterschiedlich vom Key
                if (fieldData.label && fieldData.label !== key) {
                    mapPairs.push([`${key}_label`, fieldData.label]);
                }
                
                // Beschreibung hinzufügen wenn verfügbar
                if (fieldData.description) {
                    mapPairs.push([`${key}_description`, fieldData.description]);
                }
                
                // Einheiten hinzufügen wenn verfügbar
                if (fieldData.unit) {
                    mapPairs.push([`${key}_unit`, fieldData.unit]);
                }
            } else {
                // Einfaches Schlüssel-Wert-Paar
                mapPairs.push([key, String(fieldData)]);
            }
        }
        
        if (!excludeIntegrationLinks) {
        // MetaFold Metadaten hinzufügen
        mapPairs.push(['metafold_export_timestamp', new Date().toISOString()]);
        mapPairs.push(['metafold_version', 'v3.1']);
        mapPairs.push(['metafold_export_method', 'CLEAN_INTEGRATION']);
        console.log('🔧 Added automatic MetaFold integration fields');
    } else {
        console.log('🔧 Excluded automatic MetaFold integration fields (will be added separately)');
    }
        
        return mapPairs;
    },
    
    // Dataset-Beschreibung generieren
    generateDatasetDescription(projectName, metadata, options) {
        const lines = [
            `Dataset created by MetaFold for project: ${projectName}`,
            `Creation date: ${new Date().toISOString()}`,
            `Export method: Clean Integration v3.1`,
            ''
        ];
        
        if (metadata && Object.keys(metadata).length > 0) {
            lines.push(`Metadata fields: ${Object.keys(metadata).length}`);
            lines.push('');
            
            // Wichtige Metadaten-Highlights hinzufügen
            const highlights = [];
            for (const [key, fieldData] of Object.entries(metadata)) {
                if (fieldData?.value && typeof fieldData.value === 'string' && fieldData.value.length < 50) {
                    highlights.push(`${fieldData.label || key}: ${fieldData.value}`);
                }
                if (highlights.length >= 5) break; // Auf erste 5 Felder begrenzen
            }
            
            if (highlights.length > 0) {
                lines.push('Key metadata:');
                highlights.forEach(highlight => lines.push(`- ${highlight}`));
            }
        }
        
        if (options.namespace) {
            lines.push('');
            lines.push(`Namespace: ${options.namespace}`);
        }
        
        return lines.join('\n');
    },

    // =================== PHASE 2: ENHANCED MAIN INTEGRATION ===================
    
    // Enhanced createDatasetForMetaFoldProject with Phase 2 features
    async createDatasetForMetaFoldProjectEnhanced(projectName, metadata = null, options = {}) {
        console.log("🚀 === ENHANCED MetaFold OMERO Integration (Phase 2) ===");
        console.log(`🚀 Project Name: "${projectName}"`);
        console.log('🚀 Options:', options);
        console.log('🚀 Metadata fields:', metadata ? Object.keys(metadata).length : 0);
        
        try {
            // Step 1: Create dataset (same as Phase 1)
            console.log("📊 Step 1: Creating OMERO dataset...");
            const datasetResult = await this.hybridAuth.createDatasetInGroup(
                projectName,
                this.generateDatasetDescription(projectName, metadata, options),
                options.groupId,
                options.projectId
            );
            
            if (!datasetResult.success) {
                throw new Error(`Dataset creation failed: ${datasetResult.error}`);
            }
            
            const datasetId = datasetResult.datasetId;
            console.log(`✅ Dataset created successfully: ID ${datasetId}`);
            
            // Step 2: Enhanced metadata annotations with Phase 2 features
            let annotationResult = null;
            if (metadata && Object.keys(metadata).length > 0) {
                console.log("📋 Step 2: Adding enhanced metadata annotations...");
                
                // Prepare integration data
                const integrationData = {
                    metafold_export_timestamp: new Date().toISOString(),
                    project_local_path: options.projectPath || 'Unknown',
                    omero_link: this.generateOMEROURL(datasetId, options.groupId),
                    template_used: options.templateName || 'Unknown Template',
                    created_by_user: options.username || 'Unknown User',
                    created_by_group: options.groupname || 'Unknown Group'
                };
                
                // Add elabFTW link if available
                if (options.elabftwLink) {
                    integrationData.elabftw_link = options.elabftwLink;
                }
                
                // Prepare enhanced options
                const enhancedOptions = {
                    ...options,
                    integrationData: integrationData,
                    templateMetadata: options.templateMetadata // Template structure for groups
                };
                
                // Use enhanced annotation method
                annotationResult = await this.addMapAnnotationsNew(
                    datasetId,
                    metadata,
                    'MetaFold Integration',
                    enhancedOptions
                );
                
                if (annotationResult.success) {
                    console.log(`✅ Enhanced annotations created: ${annotationResult.totalKeyValuePairs || annotationResult.keyValuePairs || 'Unknown'} total pairs`);
                    if (annotationResult.totalNamespaces) {
                        console.log(`📁 Namespaces created: ${annotationResult.totalNamespaces}`);
                    }
                } else {
                    console.warn("⚠️ Enhanced annotations failed:", annotationResult.error);
                }
            }
            
            // Step 3: Final result
            const result = {
                success: true,
                message: `Enhanced MetaFold project "${projectName}" successfully exported to OMERO`,
                dataset: {
                    id: datasetId,
                    name: projectName,
                    omeroWebUrl: this.generateOMEROURL(datasetId, options.groupId),
                    groupId: options.groupId,
                    projectId: options.projectId || null,
                    linkedToProject: datasetResult.linkedToProject,
                    verified: datasetResult.verified
                },
                annotations: annotationResult || { success: false, message: 'No metadata provided' },
                integration: {
                    timestamp: new Date().toISOString(),
                    metafoldVersion: 'v06 Phase 2',
                    apiMethod: 'Enhanced Integration with Phase 2 Features',
                    groupContext: options.groupId,
                    actualGroup: options.groupId,
                    projectContext: options.projectId,
                    featuresUsed: {
                        multiNamespace: annotationResult?.method?.includes('multi_namespace') || false,
                        simpleKeyValue: annotationResult?.method?.includes('simple') || false,
                        jsonTripletFallback: annotationResult?.method?.includes('triplet') || false,
                        integrationLinks: annotationResult?.integrationLinksAdded || false
                    }
                }
            };
            
            console.log("🎉 Enhanced MetaFold OMERO integration completed successfully!");
            console.log(`🌐 View in OMERO.web: ${result.dataset.omeroWebUrl}`);
            console.log(`📊 Integration method: ${annotationResult?.method || 'unknown'}`);
            
            return result;
            
        } catch (error) {
            console.error("❌ Enhanced MetaFold OMERO integration failed:", error);
            return {
                success: false,
                message: `Enhanced integration failed: ${error.message}`,
                error: error.message,
                stage: 'enhanced_integration'
            };
        }
    }
};

// Global verfügbar machen
window.metaFoldOMEROIntegration = metaFoldOMEROIntegration;

console.log("✅ MetaFold OMERO Integration v3.1 - SAUBER & FUNKTIONIEREND geladen!");
console.log("");
console.log("🎯 MAIN FUNCTION:");
console.log("  await metaFoldOMEROIntegration.createDatasetForMetaFoldProject(name, metadata, options)");
console.log("");
console.log("💡 VERSION v3.1 VERBESSERUNGEN:");
console.log("  ✅ Nur funktionierende APIs beibehalten");
console.log("  ✅ DELETE-Schritt entfernt (verursacht 501 Fehler)");
console.log("  ✅ Standalone Dataset-Erstellung unterstützt");
console.log("  ✅ Neue Dataset-IDs bei jedem Aufruf");
console.log("  ✅ Project-Linking funktioniert zuverlässig");
console.log("  ✅ Map Annotations funktionieren perfekt");
console.log("");
console.log("🚀 SAUBER, FUNKTIONIEREND & ZUVERLÄSSIG!");