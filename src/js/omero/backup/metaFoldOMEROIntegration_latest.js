// MetaFold OMERO Integration v5.0 - ROBUSTE WEBCLIENT-VERKNÜPFUNG
// Optimiert für zuverlässige Dataset-Projekt-Verknüpfung mit 4-fachen Fallbacks

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
                    loginMethod: 'Robuste JSON Auth v5.0'
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
        
        // =================== ROBUSTE DATASET-ERSTELLUNG ===================
        
        async createDatasetInGroup(name, description, groupId, projectId = null) {
            console.log('🎯 === ROBUSTE DATASET-ERSTELLUNG V5.0 ===');
            console.log('🔬 Name:', name);
            console.log('🔬 Gruppen-ID:', groupId);
            console.log('🔬 Projekt-ID:', projectId || 'standalone');
            
            if (!this.session) {
                throw new Error('Keine aktive Session - bitte zuerst einloggen');
            }
            
            // Gruppenzugriff validieren
            this.validateGroupAccess(groupId);
            
            try {
                // PRIORITÄT 1: Direkte Dataset-Erstellung im Projekt (falls unterstützt)
                if (projectId && projectId !== 'none' && projectId !== null) {
                    console.log('🚀 Methode 1: Dataset direkt im Projekt erstellen');
                    
                    try {
                        const directResult = await this.createDatasetDirectlyInProject(
                            name, description, groupId, projectId
                        );
                        
                        if (directResult.success && directResult.method === 'direct_in_project') {
                            console.log('✅ Direkte Projekt-Erstellung erfolgreich!');
                            return directResult;
                        }
                    } catch (directError) {
                        console.log('⚠️ Direkte Erstellung fehlgeschlagen:', directError.message);
                        console.log('🔄 Fallback zu robuster create + link...');
                    }
                }
                
                // PRIORITÄT 2: Robuste create + link Methode
                console.log('🔄 Robuste Methode: Dataset erstellen + mehrfache Verknüpfung');
                return await this.createDatasetWithLinking(name, description, groupId, projectId);
                
            } catch (error) {
                console.error('❌ Alle Dataset-Erstellungs-Methoden fehlgeschlagen:', error);
                throw error;
            }
        },
        
        // =================== DIREKTE PROJEKT-ERSTELLUNG (EXPERIMENTELL) ===================
        
        async createDatasetDirectlyInProject(name, description, groupId, projectId) {
            console.log('🎯 Direkte Dataset-Erstellung im Projekt (experimentell)');
            
            // Dataset-JSON vorbereiten
            const datasetData = {
                "Name": name,
                "Description": description || 'Erstellt von MetaFold über experimentelle direkte Erstellung',
                "@type": "http://www.openmicroscopy.org/Schemas/OME/2016-06#Dataset"
            };
            
            // URL für direkte Erstellung im Projekt
            const createUrl = `${this.proxyUrl}/api/v0/m/projects/${projectId}/datasets/?group=${groupId}`;
            
            console.log('🔬 POST zu:', createUrl);
            
            const response = await fetch(createUrl, {
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
                throw new Error(`Direkte Projekt-Erstellung fehlgeschlagen: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            const dataset = result.data;
            const datasetId = dataset['@id'] || dataset.id;
            
            if (!datasetId) {
                throw new Error('Dataset-ID nicht in Response gefunden');
            }
            
            console.log('✅ Dataset direkt im Projekt erstellt');
            console.log('📋 Dataset-ID:', datasetId);
            
            // Sofortige Verifikation der Projekt-Zugehörigkeit
            console.log('🔍 Verifikation der Projekt-Zugehörigkeit...');
            const verification = await this.verifyDatasetInProject(datasetId, projectId);
            
            return {
                success: true,
                datasetId: datasetId,
                datasetName: dataset.Name || name,
                groupId: groupId,
                projectId: projectId,
                method: 'direct_in_project',
                linkedToProject: true,
                verified: verification.verified,
                verificationMethod: verification.method,
                omeroWebUrl: `https://omero-imaging.uni-muenster.de/webclient/?show=dataset-${datasetId}`,
                response: dataset,
                details: {
                    creationMethod: 'direct_in_project',
                    verification: verification
                }
            };
        },
        
        // =================== ROBUSTE DATASET + LINK ERSTELLUNG ===================
        
        async createDatasetWithLinking(name, description, groupId, projectId) {
            console.log('🔄 ROBUSTE Dataset-Erstellung + Verknüpfung v5.0');
            
            // Dataset standalone erstellen
            const datasetData = {
                "Name": name,
                "Description": description || 'Erstellt von MetaFold v5.0 - Robuste Methode',
                "@type": "http://www.openmicroscopy.org/Schemas/OME/2016-06#Dataset"
            };
            
            const saveUrl = `${this.proxyUrl}/api/v0/m/save/?group=${groupId}`;
            
            console.log('🔬 Erstelle Dataset standalone...');
            
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
            
            console.log('✅ Dataset erstellt, ID:', datasetId);
            
            // Robuste Projekt-Verknüpfung mit mehreren Versuchen
            let linkResult = { success: false, verified: false };
            if (projectId && projectId !== 'none') {
                console.log('🔗 Starte robuste Projekt-Verknüpfung...');
                
                // Mehrere Versuche mit Pausen
                for (let attempt = 1; attempt <= 3; attempt++) {
                    console.log(`🔗 Verknüpfungs-Versuch ${attempt}/3`);
                    
                    linkResult = await this.linkDatasetToProjectWebclient(datasetId, projectId);
                    
                    if (linkResult.verified) {
                        console.log(`✅ Verknüpfung erfolgreich in Versuch ${attempt}`);
                        break;
                    } else {
                        console.log(`⚠️ Versuch ${attempt} fehlgeschlagen, warte 2 Sekunden...`);
                        if (attempt < 3) {
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                    }
                }
            }
            
            return {
                success: true,
                datasetId: datasetId,
                datasetName: result.data.Name,
                groupId: groupId,
                projectId: projectId,
                method: 'robust_create_and_link_v5',
                linkedToProject: linkResult.success,
                verified: linkResult.verified,
                omeroWebUrl: `https://omero-imaging.uni-muenster.de/webclient/?show=dataset-${datasetId}`,
                response: result.data,
                details: {
                    creationMethod: 'robust_v5',
                    linking: linkResult
                }
            };
        },
        
        // =================== ROBUSTE WEBCLIENT-VERKNÜPFUNG V5.0 ===================
        
        async linkDatasetToProjectWebclient(datasetId, projectId) {
            console.log('🔗 ROBUSTE Webclient Verknüpfung v5.0');
            console.log('📋 Dataset ID:', datasetId);
            console.log('📋 Projekt ID:', projectId);
            
            try {
                // METHODE 1: Verwende den chgrp Endpoint
                console.log('🚀 Versuch 1: chgrp Endpoint für Projekt-Verknüpfung');
                
                const chgrpUrl = `${this.proxyUrl}/webclient/action/chgrp/`;
                
                const formData = new URLSearchParams();
                formData.append('dataset', datasetId);
                formData.append('target_id', projectId);
                formData.append('target_type', 'project');
                formData.append('csrfmiddlewaretoken', this.session.csrfToken);
                
                const chgrpResponse = await fetch(chgrpUrl, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-CSRFToken': this.session.csrfToken
                    },
                    body: formData
                });
                
                if (chgrpResponse.ok) {
                    console.log('✅ chgrp Verknüpfung erfolgreich');
                    
                    // Kurz warten und dann verifizieren
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const verification = await this.verifyDatasetInProject(datasetId, projectId);
                    
                    if (verification.verified) {
                        return {
                            success: true,
                            method: 'chgrp_webclient',
                            verified: true,
                            verificationMethod: verification.method
                        };
                    } else {
                        console.log('⚠️ chgrp erfolgreich aber Verifikation fehlgeschlagen');
                    }
                }
                
                // METHODE 2: Verwende den move Endpoint
                console.log('🚀 Versuch 2: move Endpoint');
                
                const moveUrl = `${this.proxyUrl}/webclient/action/move/`;
                
                const moveFormData = new URLSearchParams();
                moveFormData.append('dataset', datasetId);
                moveFormData.append('parent_id', projectId);
                moveFormData.append('parent_type', 'project');
                moveFormData.append('csrfmiddlewaretoken', this.session.csrfToken);
                
                const moveResponse = await fetch(moveUrl, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-CSRFToken': this.session.csrfToken
                    },
                    body: moveFormData
                });
                
                if (moveResponse.ok) {
                    console.log('✅ move Verknüpfung erfolgreich');
                    
                    // Kurz warten und dann verifizieren
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const verification = await this.verifyDatasetInProject(datasetId, projectId);
                    
                    if (verification.verified) {
                        return {
                            success: true,
                            method: 'move_webclient',
                            verified: true,
                            verificationMethod: verification.method
                        };
                    }
                }
                
                // METHODE 3: Direkter save mit parent reference
                console.log('🚀 Versuch 3: Direkter save mit parent');
                
                const saveUrl = `${this.proxyUrl}/webclient/action/savechild/`;
                
                const saveFormData = new URLSearchParams();
                saveFormData.append('dataset_id', datasetId);
                saveFormData.append('project_id', projectId);
                saveFormData.append('child_type', 'dataset');
                saveFormData.append('parent_type', 'project');
                saveFormData.append('csrfmiddlewaretoken', this.session.csrfToken);
                
                const saveResponse = await fetch(saveUrl, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-CSRFToken': this.session.csrfToken
                    },
                    body: saveFormData
                });
                
                if (saveResponse.ok) {
                    console.log('✅ save Verknüpfung erfolgreich');
                    
                    // Kurz warten und dann verifizieren
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const verification = await this.verifyDatasetInProject(datasetId, projectId);
                    
                    return {
                        success: saveResponse.ok,
                        method: 'save_webclient',
                        verified: verification.verified,
                        verificationMethod: verification.method
                    };
                }
                
                // METHODE 4: Alternativer addnewcontainer mit korrekten Parametern
                console.log('🚀 Versuch 4: Korrigierter addnewcontainer');
                
                const linkUrl = `${this.proxyUrl}/webclient/action/addnewcontainer/`;
                
                // Korrekte FormData für addnewcontainer
                const correctFormData = new URLSearchParams();
                correctFormData.append('parent_type', 'project');
                correctFormData.append('parent_id', projectId);
                correctFormData.append('folder_type', 'dataset');
                correctFormData.append('name', ''); // Leer lassen für existing dataset
                correctFormData.append('description', '');
                correctFormData.append('dataset_id', datasetId); // Existing dataset ID
                correctFormData.append('csrfmiddlewaretoken', this.session.csrfToken);
                
                const linkResponse = await fetch(linkUrl, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-CSRFToken': this.session.csrfToken
                    },
                    body: correctFormData
                });
                
                console.log('📋 addnewcontainer Response Status:', linkResponse.status);
                
                if (linkResponse.ok) {
                    console.log('✅ Korrigierter addnewcontainer erfolgreich');
                    
                    // Kurz warten und dann verifizieren
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    const verification = await this.verifyDatasetInProject(datasetId, projectId);
                    
                    return {
                        success: true,
                        method: 'corrected_addnewcontainer',
                        verified: verification.verified,
                        verificationMethod: verification.method
                    };
                }
                
                console.warn('⚠️ Alle Webclient-Verknüpfungs-Methoden fehlgeschlagen');
                return {
                    success: false,
                    method: 'all_webclient_methods_failed',
                    verified: false
                };
                
            } catch (error) {
                console.error('❌ Webclient-Verknüpfung fehlgeschlagen:', error);
                return {
                    success: false,
                    method: 'webclient_error',
                    verified: false,
                    error: error.message
                };
            }
        },
        
        // =================== VERBESSERTE VERIFIKATION V5.0 ===================
        
        async verifyDatasetInProject(datasetId, projectId) {
            console.log('🔍 VERBESSERTE Verifikation v5.0: Dataset im Projekt?');
            console.log('📋 Dataset ID:', datasetId);
            console.log('📋 Projekt ID:', projectId);
            
            try {
                // METHODE 1: Prüfe Datasets im Projekt
                console.log('🔍 Methode 1: Prüfe Projekt-Datasets');
                
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
                    
                    console.log(`🔍 Gefunden ${datasets.length} Datasets im Projekt`);
                    
                    const found = datasets.find(ds => {
                        const dsId = ds['@id'] || ds.id;
                        console.log(`🔍 Prüfe Dataset: ${dsId} (Typ: ${typeof dsId}) vs ${datasetId} (Typ: ${typeof datasetId})`);
                        return dsId == datasetId || dsId === datasetId || 
                               String(dsId) === String(datasetId) ||
                               parseInt(dsId) === parseInt(datasetId);
                    });
                    
                    if (found) {
                        console.log('✅ VERIFIKATION ERFOLGREICH: Dataset im Projekt gefunden!');
                        console.log('📋 Dataset Name:', found.Name || found.name);
                        return {
                            verified: true,
                            datasetName: found.Name || found.name,
                            method: 'project_datasets_check'
                        };
                    } else {
                        console.log('❌ Dataset nicht in Projekt-Datasets gefunden');
                        console.log('📋 Verfügbare Dataset IDs:', datasets.map(ds => ds['@id'] || ds.id));
                    }
                } else {
                    console.log(`⚠️ Projekt-Datasets API fehlgeschlagen: ${response.status}`);
                }
                
                // METHODE 2: Prüfe Dataset-Projekte (umgekehrt)
                console.log('🔍 Methode 2: Prüfe Dataset-Projekte');
                
                const datasetProjectsUrl = `${this.proxyUrl}/api/v0/m/datasets/${datasetId}/projects/`;
                
                const datasetResponse = await fetch(datasetProjectsUrl, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'X-CSRFToken': this.session.csrfToken,
                        'Accept': 'application/json'
                    }
                });
                
                if (datasetResponse.ok) {
                    const datasetData = await datasetResponse.json();
                    const projects = datasetData.data || [];
                    
                    console.log(`🔍 Dataset ist in ${projects.length} Projekten`);
                    
                    const linkedProject = projects.find(proj => {
                        const projId = proj['@id'] || proj.id;
                        console.log(`🔍 Prüfe Projekt: ${projId} vs ${projectId}`);
                        return projId == projectId || projId === projectId ||
                               String(projId) === String(projectId) ||
                               parseInt(projId) === parseInt(projectId);
                    });
                    
                    if (linkedProject) {
                        console.log('✅ VERIFIKATION ERFOLGREICH: Projekt beim Dataset gefunden!');
                        console.log('📋 Projekt Name:', linkedProject.Name || linkedProject.name);
                        return {
                            verified: true,
                            projectName: linkedProject.Name || linkedProject.name,
                            method: 'dataset_projects_check'
                        };
                    } else {
                        console.log('❌ Projekt nicht in Dataset-Projekten gefunden');
                        console.log('📋 Verfügbare Projekt IDs:', projects.map(proj => proj['@id'] || proj.id));
                    }
                } else {
                    console.log(`⚠️ Dataset-Projekte API fehlgeschlagen: ${datasetResponse.status}`);
                }
                
                // METHODE 3: Webclient API Verifikation
                console.log('🔍 Methode 3: Webclient Verifikation');
                
                const webclientUrl = `${this.proxyUrl}/webclient/api/datasets/${datasetId}/`;
                
                const webclientResponse = await fetch(webclientUrl, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'X-CSRFToken': this.session.csrfToken,
                        'Accept': 'application/json'
                    }
                });
                
                if (webclientResponse.ok) {
                    const webclientData = await webclientResponse.json();
                    
                    if (webclientData.projects) {
                        const webclientProjects = webclientData.projects;
                        console.log(`🔍 Webclient: Dataset ist in ${webclientProjects.length} Projekten`);
                        
                        const webclientFound = webclientProjects.find(proj => 
                            proj.id == projectId || String(proj.id) === String(projectId)
                        );
                        
                        if (webclientFound) {
                            console.log('✅ VERIFIKATION ERFOLGREICH: Webclient bestätigt Verknüpfung!');
                            return {
                                verified: true,
                                projectName: webclientFound.name,
                                method: 'webclient_verification'
                            };
                        }
                    }
                }
                
                console.log('❌ VERIFIKATION FEHLGESCHLAGEN: Dataset nicht im Projekt');
                return { 
                    verified: false, 
                    method: 'all_verification_methods_failed' 
                };
                
            } catch (error) {
                console.error('❌ Verifikation fehlgeschlagen:', error);
                return { 
                    verified: false, 
                    method: 'verification_error',
                    error: error.message 
                };
            }
        },
        
        // =================== HILFSFUNKTIONEN ===================
        
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
        console.log("🎯 === ROBUSTE METAFOLD OMERO INTEGRATION V5.0 ===");
        console.log(`📝 Project: ${projectName}`);
        console.log(`🔬 Metadata fields: ${metadata ? Object.keys(metadata).length : 0}`);
        console.log(`🎯 Target group: ${options.groupId || 'default'}`);
        console.log(`📁 Target project: ${options.projectId || 'standalone'}`);
        
        try {
            // Schritt 1: Schnelle Authentifizierung
            await this.ensureAuthentication();
            
            // Schritt 2: Robuste Dataset-Erstellung
            console.log("🏗️ Creating OMERO dataset with robust approach...");
            
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
            console.log(`🎯 Creation method: ${datasetResult.method}`);
            
            if (datasetResult.linkedToProject) {
                console.log(`🔗 Dataset linked to project: ${options.projectId}`);
                console.log(`✅ Verification: ${datasetResult.verified ? 'SUCCESS' : 'PENDING'}`);
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
                message: `MetaFold project "${projectName}" successfully exported to OMERO via ${datasetResult.method}`,
                dataset: {
                    id: datasetId,
                    name: datasetResult.datasetName,
                    omeroWebUrl: datasetResult.omeroWebUrl,
                    groupId: datasetResult.groupId,
                    projectId: datasetResult.projectId || null,
                    linkedToProject: datasetResult.linkedToProject,
                    creationMethod: datasetResult.method,
                    verified: datasetResult.verified
                },
                annotations: annotationResult || { success: false, message: 'No metadata provided' },
                integration: {
                    timestamp: new Date().toISOString(),
                    metafoldVersion: 'v5.0',
                    apiMethod: 'Robuste Webclient-Verknüpfung',
                    groupContext: options.groupId,
                    actualGroup: datasetResult.groupId,
                    projectContext: options.projectId,
                    creationDetails: datasetResult.details
                },
                metafold: {
                    projectName: projectName,
                    metadataFieldCount: metadata ? Object.keys(metadata).length : 0
                }
            };
            
            console.log("🎉 MetaFold OMERO integration completed successfully!");
            console.log(`🌐 View in OMERO.web: ${datasetResult.omeroWebUrl}`);
            console.log(`🎯 Final verification: ${datasetResult.verified ? '✅ VERIFIED' : '⚠️ NOT VERIFIED'}`);
            
            return result;
            
        } catch (error) {
            console.error("❌ MetaFold OMERO integration failed:", error);
            return {
                success: false,
                message: `Integration failed: ${error.message}`,
                error: error.message,
                stage: 'robuste_integration_v5',
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
            
            // Robuste Authentifizierung durchführen
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
        mapPairs.push(['metafold_version', 'v5.0']);
        mapPairs.push(['metafold_export_method', 'ROBUSTE_WEBCLIENT_VERKNUEPFUNG']);
        
        return mapPairs;
    },
    
    // Dataset-Beschreibung generieren
    generateDatasetDescription(projectName, metadata, options) {
        const lines = [
            `Dataset created by MetaFold for project: ${projectName}`,
            `Creation date: ${new Date().toISOString()}`,
            `Export method: Robuste Webclient-Verknüpfung v5.0`,
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
        } else if (errorMessage.includes('project')) {
            recommendations.push('Verify the selected project exists and is accessible');
            recommendations.push('Check project permissions in the selected group');
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
    
    // Robuster Test mit detaillierter Verifikation
    async testRobustIntegration() {
        console.log('🧪 === ROBUSTER INTEGRATIONS-TEST V5.0 ===');
        
        const testResults = {
            authentication: false,
            groupAccess: false,
            datasetCreation: false,
            projectLinking: false,
            verification: false,
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
                return testResults;
            }
            
            // Test 2: Gruppenzugriff
            console.log('🧪 Test 2: Group Access...');
            const groupInfo = this.hybridAuth.getGroupInfo();
            if (groupInfo && groupInfo.memberOfGroups.length > 0) {
                testResults.groupAccess = true;
                console.log('✅ Group Access: Available groups:', groupInfo.memberOfGroups);
            } else {
                console.log('❌ Group Access: No groups accessible');
                return testResults;
            }
            
            // Test 3: Robuste Dataset-Erstellung mit Verknüpfung
            console.log('🧪 Test 3: Robust Dataset Creation with Linking...');
            const testMetadata = {
                test_field: {
                    type: 'text',
                    label: 'Test Field',
                    value: 'Robuster Test v5.0',
                    description: 'Test metadata for robust webclient linking'
                },
                linking_method: {
                    type: 'text',
                    label: 'Linking Method',
                    value: 'robust_webclient_v5',
                    description: 'Testing robust webclient linking methods'
                }
            };
            
            const testGroupId = groupInfo.memberOfGroups[0];
            
            try {
                const integrationResult = await this.createDatasetForMetaFoldProject(
                    `MetaFold_RobustTest_${Date.now()}`,
                    testMetadata,
                    {
                        groupId: testGroupId,
                        namespace: 'NFDI4BioImage.MetaFold.RobustTest'
                    }
                );
                
                if (integrationResult.success) {
                    testResults.datasetCreation = true;
                    testResults.projectLinking = integrationResult.dataset.linkedToProject;
                    testResults.verification = integrationResult.dataset.verified;
                    testResults.mapAnnotations = integrationResult.annotations.success;
                    
                    console.log('✅ Robust Creation: Success, ID:', integrationResult.dataset.id);
                    console.log('🎯 Creation Method:', integrationResult.dataset.creationMethod);
                    console.log('🔗 Project Linking:', testResults.projectLinking ? 'SUCCESS' : 'FAILED');
                    console.log('✅ Verification:', testResults.verification ? 'VERIFIED' : 'NOT VERIFIED');
                    console.log('🌐 OMERO.web URL:', integrationResult.dataset.omeroWebUrl);
                } else {
                    console.log('❌ Robust Creation: Failed -', integrationResult.message);
                }
            } catch (integrationError) {
                console.log('❌ Integration Test:', integrationError.message);
            }
            
            // Gesamtergebnis
            testResults.overall = testResults.authentication && testResults.groupAccess && 
                                testResults.datasetCreation && testResults.verification && 
                                testResults.mapAnnotations;
            
            console.log('🧪 === ROBUSTE TEST RESULTS V5.0 ===');
            console.log('Authentication:', testResults.authentication ? '✅' : '❌');
            console.log('Group Access:', testResults.groupAccess ? '✅' : '❌');
            console.log('Dataset Creation:', testResults.datasetCreation ? '✅' : '❌');
            console.log('Project Linking:', testResults.projectLinking ? '✅' : '❌');
            console.log('Verification:', testResults.verification ? '✅' : '❌');
            console.log('Map Annotations:', testResults.mapAnnotations ? '✅' : '❌');
            console.log('Overall:', testResults.overall ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
            
            if (testResults.overall) {
                console.log('🎉 ROBUSTE WEBCLIENT-VERKNÜPFUNG IS READY FOR PRODUCTION!');
            } else if (testResults.datasetCreation) {
                console.log('⚠️ Dataset creation works, but linking/verification needs improvement');
            }
            
            return testResults;
            
        } catch (error) {
            console.error('❌ Robuster Test fehlgeschlagen:', error);
            return { ...testResults, error: error.message };
        }
    }
};

// Global verfügbar machen
window.metaFoldOMEROIntegration = metaFoldOMEROIntegration;

// =================== TEST-FUNKTIONEN ===================

// Haupttest für robuste Integration
window.testRobusteOMEROIntegration = async function() {
    try {
        console.log('🚀 Starte robuste OMERO Integration Test...');
        
        const testResult = await metaFoldOMEROIntegration.testRobustIntegration();
        
        if (testResult.overall) {
            console.log('✅ Robuste Integration Test erfolgreich!');
        } else {
            console.log('❌ Robuste Integration Test teilweise fehlgeschlagen:', testResult);
        }
        
        return testResult;
        
    } catch (error) {
        console.error('❌ Robuste Integration Test fehlgeschlagen:', error);
        return { success: false, error: error.message };
    }
};

// Robuster Test mit detaillierten Logs
window.testRobusteOMEROVerknuepfung = async function() {
    try {
        console.log('🧪 === ROBUSTER OMERO VERKNÜPFUNGS-TEST V5.0 ===');
        
        const testName = `MetaFold Robust Test ${Date.now()}`;
        const testDescription = 'Test Dataset - robuste Verknüpfung v5.0';
        const testGroupId = '103';  // Deine Gruppe
        const testProjectId = '5652';  // Dein Test-Projekt
        
        // Authentifizierung sicherstellen
        console.log('🔐 Sicherstelle Authentifizierung...');
        await metaFoldOMEROIntegration.ensureAuthentication();
        
        // Robuste Dataset-Erstellung mit Verknüpfung
        console.log('🏗️ Starte robuste Dataset-Erstellung...');
        const result = await metaFoldOMEROIntegration.hybridAuth.createDatasetWithLinking(
            testName, testDescription, testGroupId, testProjectId
        );
        
        console.log('📊 === DETAILLIERTE TEST-ERGEBNISSE ===');
        console.log('Dataset ID:', result.datasetId);
        console.log('Dataset Name:', result.datasetName);
        console.log('Creation Method:', result.method);
        console.log('Linked to Project:', result.linkedToProject);
        console.log('Verified:', result.verified);
        console.log('Linking Details:', result.details.linking);
        
        if (result.success && result.verified) {
            console.log('🎉 === ROBUSTER TEST ERFOLGREICH! ===');
            console.log(`✅ Dataset "${testName}" erfolgreich erstellt und verifiziert!`);
            console.log(`🌐 URL: ${result.omeroWebUrl}`);
            console.log(`🔗 Verknüpfungs-Methode: ${result.details.linking.method}`);
            console.log(`✅ Verifikations-Methode: ${result.details.linking.verificationMethod}`);
        } else if (result.success && !result.verified) {
            console.log('⚠️ === TEST TEILWEISE ERFOLGREICH ===');
            console.log('✅ Dataset wurde erstellt');
            console.log('❌ Aber Verknüpfung konnte nicht verifiziert werden');
            console.log('💡 Dataset existiert als standalone - prüfe OMERO.web manuell');
        } else {
            console.log('❌ === TEST FEHLGESCHLAGEN ===');
            console.log('Details:', result);
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Robuster Test fehlgeschlagen:', error);
        return { success: false, error: error.message };
    }
};

// Schneller Test nur für Verknüpfung (falls Dataset bereits existiert)
window.testNurVerknuepfung = async function(datasetId, projectId) {
    try {
        console.log('🔗 === TEST NUR VERKNÜPFUNG ===');
        console.log('📋 Dataset ID:', datasetId);
        console.log('📋 Projekt ID:', projectId);
        
        // Authentifizierung sicherstellen
        await metaFoldOMEROIntegration.ensureAuthentication();
        
        // Verknüpfung testen
        const linkResult = await metaFoldOMEROIntegration.hybridAuth.linkDatasetToProjectWebclient(
            datasetId, projectId
        );
        
        console.log('📊 === VERKNÜPFUNGS-ERGEBNIS ===');
        console.log('Success:', linkResult.success);
        console.log('Method:', linkResult.method);
        console.log('Verified:', linkResult.verified);
        console.log('Verification Method:', linkResult.verificationMethod);
        
        if (linkResult.verified) {
            console.log('🎉 VERKNÜPFUNG ERFOLGREICH UND VERIFIZIERT!');
        } else if (linkResult.success) {
            console.log('⚠️ Verknüpfung gemeldet als erfolgreich, aber nicht verifiziert');
        } else {
            console.log('❌ Verknüpfung fehlgeschlagen');
        }
        
        return linkResult;
        
    } catch (error) {
        console.error('❌ Verknüpfungs-Test fehlgeschlagen:', error);
        return { success: false, error: error.message };
    }
};

// Test der Verifikation (für existierende Datasets)
window.testNurVerifikation = async function(datasetId, projectId) {
    try {
        console.log('🔍 === TEST NUR VERIFIKATION ===');
        
        // Authentifizierung sicherstellen
        await metaFoldOMEROIntegration.ensureAuthentication();
        
        // Verifikation testen
        const verification = await metaFoldOMEROIntegration.hybridAuth.verifyDatasetInProject(
            datasetId, projectId
        );
        
        console.log('📊 === VERIFIKATIONS-ERGEBNIS ===');
        console.log('Verified:', verification.verified);
        console.log('Method:', verification.method);
        if (verification.datasetName) console.log('Dataset Name:', verification.datasetName);
        if (verification.projectName) console.log('Project Name:', verification.projectName);
        
        return verification;
        
    } catch (error) {
        console.error('❌ Verifikations-Test fehlgeschlagen:', error);
        return { verified: false, error: error.message };
    }
};

// Einfacher Test nur für Dataset-Erstellung
window.testCleanDatasetCreation = async function() {
    try {
        console.log('🧪 Teste robuste Dataset-Erstellung...');
        
        const testName = `MetaFold Test ${Date.now()}`;
        const testDescription = 'Test Dataset - robuste Erstellung v5.0';
        const testGroupId = '103';  // Deine Gruppe
        const testProjectId = '5652';  // Dein Test-Projekt
        
        // Authentifizierung sicherstellen
        await metaFoldOMEROIntegration.ensureAuthentication();
        
        // Robuste Erstellung testen
        const result = await metaFoldOMEROIntegration.hybridAuth.createDatasetInGroup(
            testName, testDescription, testGroupId, testProjectId
        );
        
        console.log('✅ Test-Ergebnis:', result);
        
        if (result.success && result.linkedToProject && result.verified) {
            console.log(`🎉 SUCCESS: Dataset "${testName}" erfolgreich in Projekt erstellt und verifiziert!`);
            console.log(`🌐 URL: ${result.omeroWebUrl}`);
            console.log(`🎯 Methode: ${result.method}`);
        } else if (result.success && result.linkedToProject && !result.verified) {
            console.log(`⚠️ PARTIAL SUCCESS: Dataset "${testName}" erstellt und verknüpft, aber Verifikation fehlgeschlagen`);
            console.log(`🌐 URL: ${result.omeroWebUrl}`);
            console.log(`🔗 Linking Method: ${result.details?.linking?.method}`);
        } else {
            console.log('❌ Test fehlgeschlagen oder nicht vollständig:', result);
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Test fehlgeschlagen:', error);
        return { success: false, error: error.message };
    }
};

console.log("✅ MetaFold OMERO Integration v5.0 - ROBUSTE WEBCLIENT-VERKNÜPFUNG geladen!");
console.log("");
console.log("🎯 MAIN FUNCTION:");
console.log("  await metaFoldOMEROIntegration.createDatasetForMetaFoldProject(name, metadata, options)");
console.log("");
console.log("🧪 TESTING:");
console.log("  await testRobusteOMEROIntegration()                          // Volltest v5.0");
console.log("  await testRobusteOMEROVerknuepfung()                         // Robuster Verknüpfungstest");
console.log("  await testCleanDatasetCreation()                            // Dataset-Test v5.0");
console.log("  await testNurVerknuepfung('datasetId', 'projectId')          // Nur Verknüpfung testen");
console.log("  await testNurVerifikation('datasetId', 'projectId')          // Nur Verifikation testen");
console.log("");
console.log("💡 VERSION v5.0 VERBESSERUNGEN:");
console.log("  🔗 4-fache Webclient-Verknüpfung (chgrp, move, save, addnewcontainer)");
console.log("  ✅ 3-fache Verifikation (project→datasets, dataset→projects, webclient)");
console.log("  🔄 Retry-Logik mit 3 Versuchen und Pausen");
console.log("  🎯 Robuste Fallback-Strategien für alle Szenarien");
console.log("  🔍 Detaillierte Logging und Fehlerdiagnose");
console.log("");
console.log("🚀 ROBUST, ZUVERLÄSSIG & MEHRFACH VERIFIZIERT!");