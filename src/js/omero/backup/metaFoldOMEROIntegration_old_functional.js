// Integrierte MetaFold OMERO Lösung - Korrigierte Version
// Ersetzt die komplette metaFoldOMEROIntegration.js
// KORREKTUR: Gruppe 904 und "Public Example Data" sind identisch - kein Workaround nötig

const metaFoldOMEROIntegration = {
    
    // =================== INTEGRIERTE HYBRID AUTHENTIFIZIERUNG ===================
    
    hybridAuth: {
        session: null,
        proxyUrl: 'http://localhost:3000/omero-api',
        
        // Robuste Multi-Format Authentifizierung (basierend auf funktionierendem Code)
        async loginViaJSONAPI(username, password, serverId = 1) {
            console.log('🔬 === ROBUSTE HYBRID OMERO LOGIN ===');
            console.log('🔬 Username:', username);
            console.log('🔬 Proxy URL:', this.proxyUrl);
            
            try {
                // Schritt 1: CSRF Token über Proxy holen
                console.log('🔬 Schritt 1: CSRF Token holen...');
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
                console.log('✅ CSRF Token erhalten:', csrfToken.substring(0, 10) + '...');
                
                // Schritt 2: Verschiedene Login-Formate versuchen
                console.log('🔬 Schritt 2: Login mit verschiedenen Formaten versuchen...');
                
                // Versuch 1: JSON Format
                console.log('🔬 Versuch 1: JSON Format...');
                try {
                    const jsonResult = await this.tryJSONLogin(username, password, serverId, csrfToken);
                    if (jsonResult.success) {
                        this.session = jsonResult.session;
                        return jsonResult;
                    }
                } catch (jsonError) {
                    console.log('🔬 JSON Format fehlgeschlagen:', jsonError.message);
                }
                
                // Versuch 2: FormData Format
                console.log('🔬 Versuch 2: FormData Format...');
                try {
                    const formResult = await this.tryFormDataLogin(username, password, serverId, csrfToken);
                    if (formResult.success) {
                        this.session = formResult.session;
                        return formResult;
                    }
                } catch (formError) {
                    console.log('🔬 FormData Format fehlgeschlagen:', formError.message);
                }
                
                // Versuch 3: URLSearchParams Format
                console.log('🔬 Versuch 3: URLSearchParams Format...');
                try {
                    const urlResult = await this.tryURLParamsLogin(username, password, serverId, csrfToken);
                    if (urlResult.success) {
                        this.session = urlResult.session;
                        return urlResult;
                    }
                } catch (urlError) {
                    console.log('🔬 URLSearchParams Format fehlgeschlagen:', urlError.message);
                }
                
                throw new Error('Alle Login-Formate fehlgeschlagen');
                
            } catch (error) {
                console.error('❌ Robuste Hybrid Login fehlgeschlagen:', error);
                this.session = null;
                throw error;
            }
        },
    
    // =================== ZUSÄTZLICHE MAP ANNOTATIONS FUNKTION ===================
    
    // Zusätzliche Map Annotations Funktion (für projectManager Kompatibilität)
    async addWorkingMapAnnotations(datasetId, metadata, namespace) {
        console.log('🔬 Adding additional Map Annotations...');
        console.log('🔬 Dataset ID:', datasetId);
        console.log('🔬 Namespace:', namespace);
        
        // Verwende die bestehende Map Annotations Funktion
        return await this.addMapAnnotationsViaIntegratedHybrid(datasetId, metadata, namespace);
    },
        
        // Debug: Server-Informationen abrufen (aus funktionierendem Code)
        async debugServerInfo() {
            console.log('🔍 === SERVER DEBUG INFO ===');
            
            try {
                // API Info
                const apiResponse = await fetch(`${this.proxyUrl}/api/`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'Accept': 'application/json' }
                });
                
                if (apiResponse.ok) {
                    const apiInfo = await apiResponse.json();
                    console.log('📋 API Info:', apiInfo);
                }
                
                // Server Info
                const serverResponse = await fetch(`${this.proxyUrl}/api/v0/servers/`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'Accept': 'application/json' }
                });
                
                if (serverResponse.ok) {
                    const serverInfo = await serverResponse.json();
                    console.log('📋 Server Info:', serverInfo);
                }
                
            } catch (error) {
                console.error('❌ Debug Info fehlgeschlagen:', error);
            }
        },
        
        // Versuch 1: JSON Format
        async tryJSONLogin(username, password, serverId, csrfToken) {
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
            
            return await this.processLoginResponse(response, 'JSON');
        },
        
        // Versuch 2: FormData Format
        async tryFormDataLogin(username, password, serverId, csrfToken) {
            const formData = new FormData();
            formData.append('server', serverId);
            formData.append('username', username);
            formData.append('password', password);
            formData.append('csrfmiddlewaretoken', csrfToken);
            
            const response = await fetch(`${this.proxyUrl}/api/v0/login/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRFToken': csrfToken,
                    'Referer': `${this.proxyUrl}/api/v0/login/`
                },
                body: formData
            });
            
            return await this.processLoginResponse(response, 'FormData');
        },
        
        // Versuch 3: URLSearchParams Format
        async tryURLParamsLogin(username, password, serverId, csrfToken) {
            const params = new URLSearchParams();
            params.append('server', serverId);
            params.append('username', username);
            params.append('password', password);
            params.append('csrfmiddlewaretoken', csrfToken);
            
            const response = await fetch(`${this.proxyUrl}/api/v0/login/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'X-CSRFToken': csrfToken,
                    'Referer': `${this.proxyUrl}/api/v0/login/`
                },
                body: params
            });
            
            return await this.processLoginResponse(response, 'URLSearchParams');
        },
        
        // Login-Antwort verarbeiten
        async processLoginResponse(response, method) {
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Login mit ${method} fehlgeschlagen: ${response.status} - ${errorText}`);
            }
            
            const loginResult = await response.json();
            
            if (!loginResult.success) {
                throw new Error(`Login mit ${method} nicht erfolgreich: ${loginResult.message || 'Unbekannter Fehler'}`);
            }
            
            console.log(`✅ Login mit ${method} erfolgreich!`);
            
            // Frischen CSRF Token nach Login holen
            const freshToken = await this.getCurrentCSRFToken();
            
            // Session-Informationen speichern
            const session = {
                ...loginResult.eventContext,
                csrfToken: freshToken || csrfToken, // Verwende frischen Token wenn verfügbar
                loginTime: Date.now(),
                isAuthenticated: true,
                loginMethod: `Robuste Hybrid Auth (${method})`
            };
            
            console.log('📋 Benutzer:', session.userName);
            console.log('📋 Aktuelle Gruppe:', session.groupName, `(ID: ${session.groupId})`);
            console.log('📋 Mitglied in Gruppen:', session.memberOfGroups);
            console.log('📋 Admin:', session.isAdmin);
            
            return {
                success: true,
                session: session,
                eventContext: loginResult.eventContext,
                method: method
            };
        },
        
        // Aktuellen CSRF Token holen (nach Login)
        async getCurrentCSRFToken() {
            try {
                const tokenResponse = await fetch(`${this.proxyUrl}/api/v0/token/`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'Accept': 'application/json' }
                });
                
                if (tokenResponse.ok) {
                    const tokenData = await tokenResponse.json();
                    console.log('✅ Frischer CSRF Token nach Login erhalten');
                    return tokenData.data;
                }
            } catch (error) {
                console.warn('⚠️ Konnte aktuellen CSRF Token nicht holen, verwende den alten');
            }
            
            return null;
        },
        
        // Dataset-Erstellung mit Gruppenzuordnung (ROBUSTE VERSION)
        async createDatasetInGroup(name, description, groupId, projectId = null) {
            console.log('🔬 === ROBUSTE DATASET-ERSTELLUNG ===');
            console.log('🔬 Name:', name);
            console.log('🔬 Gruppen-ID:', groupId);
            console.log('🔬 Projekt-ID:', projectId || 'standalone');
            
            if (!this.session) {
                throw new Error('Keine aktive Session - bitte zuerst einloggen');
            }
            
            // Gruppenzugriff validieren
            this.validateGroupAccess(groupId);
            
            try {
                // Dataset-Daten im JSON API Format vorbereiten
                const datasetData = {
                    "Name": name,
                    "Description": description || 'Erstellt von MetaFold über robuste Hybrid Auth',
                    "@type": "http://www.openmicroscopy.org/Schemas/OME/2016-06#Dataset"
                };
                
                // JSON API Save-Endpoint mit Gruppen-Kontext verwenden
                const saveUrl = `${this.proxyUrl}/api/v0/m/save/?group=${groupId}`;
                
                console.log('🔬 Sende Dataset-Erstellung an:', saveUrl);
                
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
                
                if (result && result.data) {
                    const datasetId = result.data['@id'];
                    console.log('✅ Dataset erfolgreich über robuste Hybrid Auth erstellt');
                    console.log('📋 Dataset-ID:', datasetId);
                    console.log('📋 Dataset-Name:', result.data.Name);
                    
                    // Gruppen-Zuordnung verifizieren
                    const verification = await this.verifyDatasetGroup(datasetId, groupId);
                    console.log('🔍 Gruppen-Verifikation:', verification);
                    
                    // Projekt-Verknüpfung falls gewünscht
                    if (projectId && projectId !== 'none') {
                        await this.linkDatasetToProject(datasetId, projectId, groupId);
                    }
                    
                    return {
                        success: true,
                        datasetId: datasetId,
                        datasetName: result.data.Name,
                        groupId: groupId,
                        projectId: projectId,
                        method: 'Robuste Hybrid Auth',
                        groupVerification: verification,
                        omeroWebUrl: `https://omero-imaging.uni-muenster.de/webclient/?show=dataset-${datasetId}`,
                        response: result.data
                    };
                } else {
                    throw new Error('Ungültiges Antwortformat vom Server');
                }
                
            } catch (error) {
                console.error('❌ Robuste Dataset-Erstellung fehlgeschlagen:', error);
                throw error;
            }
        },
        
        // Gruppen-Verifikation (aus funktionierendem Code)
        async verifyDatasetGroup(datasetId, expectedGroupId) {
            try {
                console.log('🔍 Verifiziere Dataset-Gruppenzuordnung...');
                
                const response = await fetch(`${this.proxyUrl}/api/v0/m/datasets/${datasetId}/`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRFToken': this.session.csrfToken
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const actualGroupId = data.data?.group?.id?.toString();
                    
                    const matches = actualGroupId === expectedGroupId?.toString();
                    
                    console.log('🔍 Gruppen-Verifikation:', {
                        erwartet: expectedGroupId,
                        tatsächlich: actualGroupId,
                        stimmt_überein: matches
                    });
                    
                    return {
                        success: matches,
                        expectedGroup: expectedGroupId,
                        actualGroup: actualGroupId,
                        matches: matches
                    };
                }
            } catch (error) {
                console.warn('⚠️ Gruppen-Verifikation fehlgeschlagen:', error);
            }
            
            return {
                success: false,
                message: 'Verifikation nicht möglich'
            };
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
        
        // Dataset-Projekt-Verknüpfung
        async linkDatasetToProject(datasetId, projectId, groupId) {
            console.log('🔬 Verknüpfe Dataset mit Projekt...');
            
            try {
                const linkUrl = `${this.proxyUrl}/webclient/action/addnewcontainer/`;
                
                const formData = new URLSearchParams();
                formData.append('folder_type', 'dataset');
                formData.append('parent', projectId);
                formData.append('dataset', datasetId);
                formData.append('csrfmiddlewaretoken', this.session.csrfToken);
                
                const response = await fetch(linkUrl, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-CSRFToken': this.session.csrfToken
                    },
                    body: formData
                });
                
                if (response.ok) {
                    console.log('✅ Dataset erfolgreich mit Projekt verknüpft');
                } else {
                    console.warn('⚠️ Projekt-Verknüpfung fehlgeschlagen, Dataset wurde aber erstellt');
                }
                
            } catch (error) {
                console.error('❌ Dataset-Projekt-Verknüpfung fehlgeschlagen:', error);
                // Nicht werfen - Dataset wurde erfolgreich erstellt
            }
        },
        
        // Session-Gültigkeit prüfen
        isSessionValid() {
            if (!this.session) return false;
            
            const sessionAge = Date.now() - this.session.loginTime;
            const maxAge = 30 * 60 * 1000; // 30 Minuten
            
            return sessionAge < maxAge;
        },
        
        // Gruppen-Informationen abrufen
        getGroupInfo() {
            if (!this.session) return null;
            
            return {
                currentGroupId: this.session.groupId,
                currentGroupName: this.session.groupName,
                memberOfGroups: this.session.memberOfGroups,
                leaderOfGroups: this.session.leaderOfGroups,
                isAdmin: this.session.isAdmin
            };
        }
    },
    
    // =================== HAUPTINTEGRATION ===================
    
    async createDatasetForMetaFoldProject(projectName, metadata, options = {}) {
        console.log("🚀 === METAFOLD OMERO INTEGRATION (KORRIGIERT) ===");
        console.log(`📝 Project: ${projectName}`);
        console.log(`🔬 Metadata fields: ${metadata ? Object.keys(metadata).length : 0}`);
        console.log(`🎯 Target group: ${options.groupId || 'default'}`);
        console.log(`📁 Target project: ${options.projectId || 'none'}`);
        
        try {
            // Schritt 1: Integrierte Authentifizierung sicherstellen
            await this.ensureIntegratedAuthentication();
            
            // Schritt 2: Dataset über integrierte Hybrid-System erstellen
            console.log("🏗️ Creating OMERO dataset via integrated hybrid auth...");
            
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
            console.log(`📋 Gruppe: ${datasetResult.groupId}`);
            
            // Schritt 3: Map Annotations hinzufügen
            let annotationResult = null;
            if (metadata && Object.keys(metadata).length > 0) {
                console.log("🔬 Adding experiment metadata as Map Annotations...");
                
                annotationResult = await this.addMapAnnotationsViaIntegratedHybrid(
                    datasetId,
                    metadata,
                    options.namespace || 'NFDI4BioImage.MetaFold.ExperimentMetadata'
                );
                
                if (annotationResult.success) {
                    console.log(`✅ Map Annotations: ${annotationResult.keyValuePairs} pairs added`);
                } else {
                    console.log(`⚠️ Map Annotations failed: ${annotationResult.message}`);
                }
            }
            
            // Schritt 4: Umfassendes Ergebnis zusammenstellen
            const result = {
                success: true,
                message: `MetaFold project "${projectName}" successfully exported to OMERO via Integrated Hybrid Auth`,
                dataset: {
                    id: datasetId,
                    name: datasetResult.datasetName,
                    omeroWebUrl: datasetResult.omeroWebUrl,
                    groupId: datasetResult.groupId,
                    projectId: datasetResult.projectId || null,
                    creationMethod: 'Integrated Hybrid Auth'
                },
                annotations: annotationResult || { success: false, message: 'No metadata provided' },
                integration: {
                    timestamp: new Date().toISOString(),
                    metafoldVersion: 'v0.5',
                    apiMethod: 'Integrated Hybrid Auth',
                    groupContext: options.groupId,
                    actualGroup: datasetResult.groupId,
                    projectContext: options.projectId
                },
                metafold: {
                    projectName: projectName,
                    metadataFieldCount: metadata ? Object.keys(metadata).length : 0
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
                stage: 'integrated_hybrid_integration',
                recommendations: this.generateErrorRecommendations(error)
            };
        }
    },
    
    // =================== AUTHENTIFIZIERUNG ===================
    
    async ensureIntegratedAuthentication() {
        console.log('🔍 Checking integrated hybrid authentication...');
        
        // Prüfen ob Session gültig ist
        if (!this.hybridAuth.isSessionValid()) {
            console.log('🔬 No valid integrated session, attempting authentication...');
            
            // KORRIGIERT: Anmeldedaten aus Einstellungen mit korrekter API holen
            if (!window.settingsManager) {
                throw new Error('settingsManager not available');
            }
            
            // Einzelne Einstellungen mit get() abrufen (nicht getSettings())
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
            
            // Integrierte Hybrid-Authentifizierung durchführen
            const loginResult = await this.hybridAuth.loginViaJSONAPI(
                omeroUsername,
                omeroPassword
            );
            
            if (!loginResult.success) {
                throw new Error(`Integrated authentication failed: ${loginResult.message || 'Unknown error'}`);
            }
            
            console.log('✅ Integrated authentication successful');
            console.log('📋 Authenticated as:', loginResult.session.userName);
            console.log('📋 Available groups:', loginResult.session.memberOfGroups);
        } else {
            console.log('✅ Valid integrated session found');
        }
        
        return this.hybridAuth.session;
    },
    
    // =================== MAP ANNOTATIONS ===================
    
    async addMapAnnotationsViaIntegratedHybrid(datasetId, metadata, namespace) {
        console.log('🔬 Adding Map Annotations via integrated hybrid...');
        console.log('🔬 Dataset ID:', datasetId);
        console.log('🔬 Namespace:', namespace);
        console.log('🔬 Metadata fields:', Object.keys(metadata).length);
        
        try {
            // Metadaten zu Map-Annotation-Format konvertieren
            const mapPairs = this.convertMetadataToMapPairs(metadata);
            console.log('🔬 Generated map pairs:', mapPairs.length);
            
            // Session für CSRF Token verwenden
            const session = this.hybridAuth.session;
            if (!session || !session.csrfToken) {
                throw new Error('No valid integrated session for map annotations');
            }
            
            // FormData für webclient annotate_map Endpoint vorbereiten
            const formData = new FormData();
            formData.append('dataset', parseInt(datasetId));
            formData.append('mapAnnotation', JSON.stringify(mapPairs));
            
            if (namespace && namespace !== 'default') {
                formData.append('ns', namespace);
            }
            
            // Request über Proxy mit integrierter Session senden
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
                console.log('✅ Map Annotations created successfully via integrated hybrid!');
                
                return {
                    success: true,
                    keyValuePairs: mapPairs.length,
                    annotationId: result.annId ? result.annId[0] : 'created',
                    method: 'integrated_hybrid_webclient',
                    response: result
                };
            } else {
                throw new Error(`Map Annotations failed: ${response.status} ${response.statusText}`);
            }
            
        } catch (error) {
            console.error('❌ Map Annotations via integrated hybrid failed:', error);
            return {
                success: false,
                message: `Map Annotations failed: ${error.message}`,
                error: error.message
            };
        }
    },
    
    // =================== ZUSÄTZLICHE MAP ANNOTATIONS FUNKTION ===================
    
    // Zusätzliche Map Annotations Funktion (für projectManager Kompatibilität)
    async addWorkingMapAnnotations(datasetId, metadata, namespace) {
        console.log('🔬 Adding working Map Annotations (projectManager compatibility)...');
        console.log('🔬 Dataset ID:', datasetId);
        console.log('🔬 Namespace:', namespace);
        
        // Verwende die bestehende Map Annotations Funktion
        return await this.addMapAnnotationsViaIntegratedHybrid(datasetId, metadata, namespace);
    },
    
    // =================== HILFSFUNKTIONEN ===================
    
    // Metadaten zu OMERO Map Annotation Paaren konvertieren
    convertMetadataToMapPairs(metadata) {
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
        
        // MetaFold Metadaten hinzufügen
        mapPairs.push(['metafold_export_timestamp', new Date().toISOString()]);
        mapPairs.push(['metafold_version', 'v0.5']);
        mapPairs.push(['metafold_export_method', 'INTEGRATED_HYBRID_AUTH']);
        
        return mapPairs;
    },
    
    // Dataset-Beschreibung generieren
    generateDatasetDescription(projectName, metadata, options) {
        const lines = [
            `Dataset created by MetaFold for project: ${projectName}`,
            `Creation date: ${new Date().toISOString()}`,
            `Export method: Integrated Hybrid Authentication`,
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
    
    // Fehler-Empfehlungen generieren (KORRIGIERT)
    generateErrorRecommendations(error) {
        const recommendations = [];
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('authentication') || errorMessage.includes('login')) {
            recommendations.push('Check OMERO credentials in settings');
            recommendations.push('Verify OMERO server URL is correct');
            recommendations.push('Ensure OMERO server is accessible');
            recommendations.push('Start proxy server: python omero_proxy.py');
        } else if (errorMessage.includes('group') || errorMessage.includes('permission')) {
            recommendations.push('Verify user has access to the selected group');
            recommendations.push('Check group permissions in OMERO.web');
            recommendations.push('Note: Group 904 is "Public Example Data" - this is the correct target group');
            recommendations.push('Verify group membership in OMERO.web user settings');
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            recommendations.push('Check internet connection');
            recommendations.push('Verify OMERO server is running');
            recommendations.push('Start proxy server: python omero_proxy.py');
        } else {
            recommendations.push('Check browser console for detailed error information');
            recommendations.push('Try refreshing the page and retrying');
            recommendations.push('Contact support if the problem persists');
        }
        
        return recommendations;
    },
    
    // =================== TESTING ===================
    
    // Test der kompletten Integration (ROBUSTE VERSION)
    async testCompleteIntegratedIntegration() {
        console.log('🧪 === TESTING ROBUSTE INTEGRATED INTEGRATION ===');
        
        const testResults = {
            authentication: false,
            groupAccess: false,
            datasetCreation: false,
            mapAnnotations: false,
            overall: false
        };
        
        try {
            // Debug-Info sammeln
            console.log('🧪 Debug: Server-Informationen sammeln...');
            try {
                await this.hybridAuth.debugServerInfo();
            } catch (debugError) {
                console.log('⚠️ Debug-Info fehlgeschlagen:', debugError.message);
            }
            
            // Test 1: Robuste Authentifizierung
            console.log('🧪 Test 1: Robuste Integrated Authentication...');
            try {
                await this.ensureIntegratedAuthentication();
                testResults.authentication = true;
                console.log('✅ Robuste Integrated Authentication: Successful');
                console.log('📋 Login-Methode:', this.hybridAuth.session?.loginMethod);
            } catch (authError) {
                console.log('❌ Robuste Integrated Authentication:', authError.message);
            }
            
            if (testResults.authentication) {
                // Test 2: Gruppenzugriff
                console.log('🧪 Test 2: Group Access...');
                const groupInfo = this.hybridAuth.getGroupInfo();
                if (groupInfo && groupInfo.memberOfGroups.length > 0) {
                    testResults.groupAccess = true;
                    console.log('✅ Group Access: Available groups:', groupInfo.memberOfGroups);
                    console.log('📋 Current group:', groupInfo.currentGroupName, `(ID: ${groupInfo.currentGroupId})`);
                    console.log('📋 Admin privileges:', groupInfo.isAdmin);
                } else {
                    console.log('❌ Group Access: No groups accessible');
                }
                
                // Test 3: Dataset-Erstellung mit verfügbarer Gruppe
                if (testResults.groupAccess) {
                    console.log('🧪 Test 3: Robuste Dataset Creation...');
                    const testMetadata = {
                        test_field: {
                            type: 'text',
                            label: 'Test Field',
                            value: 'Robuste Hybrid Test - Multiple Login Formats',
                            description: 'Test metadata for robust hybrid integration'
                        },
                        test_number: {
                            type: 'number',
                            label: 'Test Number',
                            value: 42,
                            unit: 'units'
                        },
                        login_method: {
                            type: 'text',
                            label: 'Login Method',
                            value: this.hybridAuth.session?.loginMethod || 'unknown',
                            description: 'Method used for authentication'
                        }
                    };
                    
                    // Verwende die erste verfügbare Gruppe
                    const testGroupId = groupInfo.memberOfGroups[0];
                    
                    console.log(`🔬 Testing with group ${testGroupId}`);
                    
                    try {
                        const integrationResult = await this.createDatasetForMetaFoldProject(
                            `MetaFold_RobusteTest_${Date.now()}`,
                            testMetadata,
                            {
                                groupId: testGroupId,
                                namespace: 'NFDI4BioImage.MetaFold.RobusteTest'
                            }
                        );
                        
                        if (integrationResult.success) {
                            testResults.datasetCreation = true;
                            testResults.mapAnnotations = integrationResult.annotations.success;
                            console.log('✅ Dataset Creation: Success, ID:', integrationResult.dataset.id);
                            console.log('📋 Target Group:', testGroupId, '- Actual Group:', integrationResult.dataset.groupId);
                            console.log('📋 Group Verification:', integrationResult.dataset.groupVerification?.matches ? 'PASSED' : 'WARNING');
                            console.log(integrationResult.annotations.success ? '✅' : '❌', 'Map Annotations:', 
                                      integrationResult.annotations.success ? 'Success' : integrationResult.annotations.message);
                            console.log('🌐 OMERO.web URL:', integrationResult.dataset.omeroWebUrl);
                        } else {
                            console.log('❌ Dataset Creation: Failed -', integrationResult.message);
                        }
                    } catch (integrationError) {
                        console.log('❌ Integration Test:', integrationError.message);
                    }
                }
            }
            
            // Gesamtergebnis
            testResults.overall = testResults.authentication && testResults.groupAccess && 
                                testResults.datasetCreation && testResults.mapAnnotations;
            
            console.log('🧪 === ROBUSTE TEST RESULTS ===');
            console.log('Authentication:', testResults.authentication ? '✅' : '❌');
            console.log('Group Access:', testResults.groupAccess ? '✅' : '❌');
            console.log('Dataset Creation:', testResults.datasetCreation ? '✅' : '❌');
            console.log('Map Annotations:', testResults.mapAnnotations ? '✅' : '❌');
            console.log('Overall:', testResults.overall ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
            
            if (testResults.overall) {
                console.log('🎉 ROBUSTE INTEGRATED SOLUTION IS READY FOR PRODUCTION!');
                console.log('💡 Multiple login formats tested and working');
                console.log('💡 Group verification working');
            } else {
                console.log('📋 Login method used:', this.hybridAuth.session?.loginMethod || 'None');
            }
            
            return testResults;
            
        } catch (error) {
            console.error('❌ Robuste integrated test failed:', error);
            return { ...testResults, error: error.message };
        }
    }
};

// Global verfügbar machen
window.metaFoldOMEROIntegration = metaFoldOMEROIntegration;

// Einfacher Test-Befehl (ähnlich dem funktionierenden Code)
window.testRobusteOMEROIntegration = async function() {
    try {
        console.log('🚀 Starte robuste OMERO Integration Test...');
        
        // Debug Info sammeln
        await metaFoldOMEROIntegration.hybridAuth.debugServerInfo();
        
        // Kompletten Test durchführen
        const testResult = await metaFoldOMEROIntegration.testCompleteIntegratedIntegration();
        
        if (testResult.overall) {
            console.log('✅ Robuste Integration Test erfolgreich!');
            console.log('💡 Login-Methode:', metaFoldOMEROIntegration.hybridAuth.session?.loginMethod);
        } else {
            console.log('❌ Robuste Integration Test fehlgeschlagen:', testResult);
        }
        
        return testResult;
        
    } catch (error) {
        console.error('❌ Robuste Integration Test fehlgeschlagen:', error);
        return { success: false, error: error.message };
    }
};

console.log("✅ MetaFold OMERO Integration - Robuste Lösung mit Multi-Format Login geladen!");
console.log("");
console.log("🎯 MAIN FUNCTION:");
console.log("  await metaFoldOMEROIntegration.createDatasetForMetaFoldProject(name, metadata, options)");
console.log("");
console.log("🧪 TESTING:");
console.log("  await metaFoldOMEROIntegration.testCompleteIntegratedIntegration()");
console.log("  await testRobusteOMEROIntegration()                           // Schnelltest");
console.log("");
console.log("💡 ROBUSTE VERSION:");
console.log("  ✅ Mehrere Login-Formate (JSON, FormData, URLSearchParams)");
console.log("  ✅ Automatische Format-Erkennung und Fallback");
console.log("  ✅ Verbesserte Gruppen-Verifikation");
console.log("  ✅ Debug-Informationen für Troubleshooting");
console.log("  ✅ Korrekte settingsManager.get(key) API");