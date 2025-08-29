// MetaFold OMERO Integration v3.0 - SCHNELLE VERSION
// Basiert auf funktionierender Version, optimiert für Geschwindigkeit

const metaFoldOMEROIntegration = {
    
    // =================== SCHLANKE HYBRID AUTHENTIFIZIERUNG ===================
    
    hybridAuth: {
        session: null,
        proxyUrl: 'http://localhost:3000/omero-api',
        
        // Vereinfachte, schnelle Authentifizierung
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
                
                // Schritt 2: Login (nur JSON Format - das funktioniert)
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
        
        // OPTIMIERTE Dataset-Erstellung mit Projekt-Support
        async createDatasetInGroup(name, description, groupId, projectId = null) {
            console.log('🔬 === OPTIMIERTE DATASET-ERSTELLUNG ===');
            console.log('🔬 Name:', name);
            console.log('🔬 Gruppen-ID:', groupId);
            console.log('🔬 Projekt-ID:', projectId || 'standalone');
            
            if (!this.session) {
                throw new Error('Keine aktive Session - bitte zuerst einloggen');
            }
            
            // Gruppenzugriff validieren
            this.validateGroupAccess(groupId);
            
            try {
                // SCHRITT 1: Dataset standalone erstellen (bewährte Methode)
                const datasetData = {
                    "Name": name,
                    "Description": description || 'Erstellt von MetaFold über schnelle Hybrid Auth',
                    "@type": "http://www.openmicroscopy.org/Schemas/OME/2016-06#Dataset"
                };
                
                const saveUrl = `${this.proxyUrl}/api/v0/m/save/?group=${groupId}`;
                
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
                
                // SCHRITT 2: Projekt-Verknüpfung falls gewünscht (bewährte Webclient-Methode)
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
                    method: 'Optimierte Erstellung',
                    linkedToProject: projectLinkResult.success,
                    omeroWebUrl: `https://omero-imaging.uni-muenster.de/webclient/?show=dataset-${datasetId}`,
                    response: result.data
                };
                
            } catch (error) {
                console.error('❌ Optimierte Dataset-Erstellung fehlgeschlagen:', error);
                throw error;
            }
        },
        
        // SCHNELLE Projekt-Verknüpfung (bewährte Webclient-Methode)
        async linkDatasetToProject(datasetId, projectId) {
            console.log('🔗 Verknüpfe Dataset', datasetId, 'mit Projekt', projectId);
            
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
                    return { success: true, method: 'webclient_link' };
                } else {
                    console.warn('⚠️ Projekt-Verknüpfung fehlgeschlagen, Dataset wurde aber erstellt');
                    return { success: false, method: 'webclient_link_failed' };
                }
                
            } catch (error) {
                console.error('❌ Projekt-Verknüpfung fehlgeschlagen:', error);
                return { success: false, error: error.message };
            }
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
        console.log("🚀 === SCHNELLE METAFOLD OMERO INTEGRATION ===");
        console.log(`📝 Project: ${projectName}`);
        console.log(`🔬 Metadata fields: ${metadata ? Object.keys(metadata).length : 0}`);
        console.log(`🎯 Target group: ${options.groupId || 'default'}`);
        console.log(`📁 Target project: ${options.projectId || 'none'}`);
        
        try {
            // Schritt 1: Schnelle Authentifizierung
            await this.ensureAuthentication();
            
            // Schritt 2: Dataset erstellen
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
            
            // Schritt 3: Map Annotations hinzufügen
            let annotationResult = null;
            if (metadata && Object.keys(metadata).length > 0) {
                console.log("🔬 Adding experiment metadata as Map Annotations...");
                
                annotationResult = await this.addMapAnnotations(
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
            
            // Schritt 4: Ergebnis zusammenstellen
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
                    creationMethod: 'Schnelle Integration'
                },
                annotations: annotationResult || { success: false, message: 'No metadata provided' },
                integration: {
                    timestamp: new Date().toISOString(),
                    metafoldVersion: 'v3.0',
                    apiMethod: 'Schnelle Hybrid Auth',
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
                stage: 'schnelle_integration',
                recommendations: this.generateErrorRecommendations(error)
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
            
            // Schnelle Authentifizierung durchführen
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
    
    async addMapAnnotations(datasetId, metadata, namespace) {
        console.log('🔬 Adding Map Annotations...');
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
    
    // Zusätzliche Map Annotations Funktion (für projectManager Kompatibilität)
    async addWorkingMapAnnotations(datasetId, metadata, namespace) {
        console.log('🔬 Adding working Map Annotations (projectManager compatibility)...');
        console.log('🔬 Dataset ID:', datasetId);
        console.log('🔬 Namespace:', namespace);
        
        return await this.addMapAnnotations(datasetId, metadata, namespace);
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
        mapPairs.push(['metafold_version', 'v3.0']);
        mapPairs.push(['metafold_export_method', 'SCHNELLE_INTEGRATION']);
        
        return mapPairs;
    },
    
    // Dataset-Beschreibung generieren
    generateDatasetDescription(projectName, metadata, options) {
        const lines = [
            `Dataset created by MetaFold for project: ${projectName}`,
            `Creation date: ${new Date().toISOString()}`,
            `Export method: Schnelle Integration`,
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
    
    // Fehler-Empfehlungen generieren
    generateErrorRecommendations(error) {
        const recommendations = [];
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('authentication') || errorMessage.includes('login')) {
            recommendations.push('Check OMERO credentials in settings');
            recommendations.push('Verify OMERO server URL is correct');
            recommendations.push('Start proxy server: python omero_proxy.py');
        } else if (errorMessage.includes('group') || errorMessage.includes('permission')) {
            recommendations.push('Verify user has access to the selected group');
            recommendations.push('Check group permissions in OMERO.web');
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            recommendations.push('Check internet connection');
            recommendations.push('Verify OMERO server is running');
            recommendations.push('Start proxy server: python omero_proxy.py');
        } else {
            recommendations.push('Check browser console for detailed error information');
            recommendations.push('Try refreshing the page and retrying');
        }
        
        return recommendations;
    },
    
    // =================== TESTING ===================
    
    // Schneller Test der Integration
    async testQuickIntegration() {
        console.log('🧪 === SCHNELLER INTEGRATIONS-TEST ===');
        
        const testResults = {
            authentication: false,
            groupAccess: false,
            datasetCreation: false,
            mapAnnotations: false,
            overall: false
        };
        
        try {
            // Test 1: Authentifizierung
            console.log('🧪 Test 1: Authentication...');
            try {
                await this.ensureAuthentication();
                testResults.authentication = true;
                console.log('✅ Authentication: Successful');
            } catch (authError) {
                console.log('❌ Authentication:', authError.message);
            }
            
            if (testResults.authentication) {
                // Test 2: Gruppenzugriff
                console.log('🧪 Test 2: Group Access...');
                const groupInfo = this.hybridAuth.getGroupInfo();
                if (groupInfo && groupInfo.memberOfGroups.length > 0) {
                    testResults.groupAccess = true;
                    console.log('✅ Group Access: Available groups:', groupInfo.memberOfGroups);
                } else {
                    console.log('❌ Group Access: No groups accessible');
                }
                
                // Test 3: Dataset-Erstellung
                if (testResults.groupAccess) {
                    console.log('🧪 Test 3: Dataset Creation...');
                    const testMetadata = {
                        test_field: {
                            type: 'text',
                            label: 'Test Field',
                            value: 'Schneller Test v3.0',
                            description: 'Test metadata for fast integration'
                        }
                    };
                    
                    const testGroupId = groupInfo.memberOfGroups[0];
                    
                    try {
                        const integrationResult = await this.createDatasetForMetaFoldProject(
                            `MetaFold_SchnellTest_${Date.now()}`,
                            testMetadata,
                            {
                                groupId: testGroupId,
                                namespace: 'NFDI4BioImage.MetaFold.SchnellTest'
                            }
                        );
                        
                        if (integrationResult.success) {
                            testResults.datasetCreation = true;
                            testResults.mapAnnotations = integrationResult.annotations.success;
                            console.log('✅ Dataset Creation: Success, ID:', integrationResult.dataset.id);
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
            
            console.log('🧪 === SCHNELLE TEST RESULTS ===');
            console.log('Authentication:', testResults.authentication ? '✅' : '❌');
            console.log('Group Access:', testResults.groupAccess ? '✅' : '❌');
            console.log('Dataset Creation:', testResults.datasetCreation ? '✅' : '❌');
            console.log('Map Annotations:', testResults.mapAnnotations ? '✅' : '❌');
            console.log('Overall:', testResults.overall ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
            
            if (testResults.overall) {
                console.log('🎉 SCHNELLE INTEGRATION IS READY FOR PRODUCTION!');
            }
            
            return testResults;
            
        } catch (error) {
            console.error('❌ Schneller Test fehlgeschlagen:', error);
            return { ...testResults, error: error.message };
        }
    }
};

// Global verfügbar machen
window.metaFoldOMEROIntegration = metaFoldOMEROIntegration;

// Schneller Test-Befehl
window.testSchnelleOMEROIntegration = async function() {
    try {
        console.log('🚀 Starte schnelle OMERO Integration Test...');
        
        const testResult = await metaFoldOMEROIntegration.testQuickIntegration();
        
        if (testResult.overall) {
            console.log('✅ Schnelle Integration Test erfolgreich!');
        } else {
            console.log('❌ Schnelle Integration Test fehlgeschlagen:', testResult);
        }
        
        return testResult;
        
    } catch (error) {
        console.error('❌ Schnelle Integration Test fehlgeschlagen:', error);
        return { success: false, error: error.message };
    }
};

console.log("✅ MetaFold OMERO Integration v3.0 - SCHNELLE VERSION geladen!");
console.log("");
console.log("🎯 MAIN FUNCTION:");
console.log("  await metaFoldOMEROIntegration.createDatasetForMetaFoldProject(name, metadata, options)");
console.log("");
console.log("🧪 TESTING:");
console.log("  await testSchnelleOMEROIntegration()                          // Schnelltest");
console.log("");
console.log("💡 VERSION v3.0 OPTIMIERUNGEN:");
console.log("  ✅ Nur eine Login-Methode (JSON - funktioniert zuverlässig)");
console.log("  ✅ Keine komplexen Fallback-Szenarien");
console.log("  ✅ Bewährte Dataset-Erstellung + Webclient-Verknüpfung");
console.log("  ✅ Minimale Debug-Ausgaben für bessere Performance");
console.log("  ✅ Fokus auf Geschwindigkeit und Zuverlässigkeit");
console.log("");
console.log("🚀 SCHNELLER & ZUVERLÄSSIGER!");