import sys
import os
import re

filepath = r'c:\Users\Thomas Zobel\Documents\MetaFold\latest_dev\src\js\omero\metaFoldOMEROIntegration.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add createProjectInGroup
createProjectInGroupStr = '''        },

        // Erstellt ein Projekt anstelle eines Datasets
        async createProjectInGroup(name, description, groupId) {
            console.log('🔬 === OPTIMIERTE PROJEKT-ERSTELLUNG ===');
            console.log('🔬 Name:', name);
            console.log('🔬 Gruppen-ID:', groupId || 'none');

            if (!this.session) {
                throw new Error('Keine aktive Session - bitte zuerst einloggen');
            }

            // Gruppenzugriff validieren (nur wenn groupId angegeben)
            if (groupId) {
                this.validateGroupAccess(groupId);
            }

            try {
                // Projekt erstellen
                const projectData = {
                    "Name": name,
                    "Description": description || 'Erstellt von MetaFold',
                    "@type": "http://www.openmicroscopy.org/Schemas/OME/2016-06#Project"
                };

                // URL mit oder ohne Gruppe
                const saveUrl = groupId ?
                    `${this.proxyUrl}/api/v0/m/save/?group=${groupId}` :
                    `${this.proxyUrl}/api/v0/save/`;

                console.log('🔬 Erstelle Projekt...');

                const response = await fetch(saveUrl, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRFToken': this.session.csrfToken
                    },
                    body: JSON.stringify(projectData)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Projekt-Erstellung fehlgeschlagen: ${response.status} - ${errorText}`);
                }

                const result = await response.json();
                const projectId = result.data['@id'];

                if (!projectId) {
                    throw new Error('Projekt-ID nicht in Response gefunden');
                }

                console.log('✅ Projekt erfolgreich erstellt');
                console.log('📋 Projekt-ID:', projectId);

                return {
                    success: true,
                    datasetId: projectId, // Behalte den key "datasetId" für bestehenden code, der diesen key erwartet
                    projectId: projectId,
                    datasetName: result.data.Name,
                    projectName: result.data.Name,
                    groupId: groupId,
                    method: 'Bewährte Erstellung',
                    omeroWebUrl: this.generateOMEROURL(projectId, groupId, 'project'),
                    response: result.data
                };

            } catch (error) {
                console.error('❌ Projekt-Erstellung fehlgeschlagen:', error);
                throw error;
            }
        },'''

content = content.replace(
    '        },\n\n        // SAUBERE Projekt-Verknüpfung (ohne problematischen DELETE)',
    createProjectInGroupStr + '\n\n        // SAUBERE Projekt-Verknüpfung (ohne problematischen DELETE)'
)

# 2. Update generateOMEROURL
content = content.replace(
    '        generateOMEROURL(datasetId, groupId = null) {',
    '        generateOMEROURL(objectId, groupId = null, objectType = \'dataset\') {'
)
content = content.replace(
    '            let url = `${baseUrl}webclient/?show=dataset-${datasetId}`;',
    '            let url = `${baseUrl}webclient/?show=${objectType}-${objectId}`;'
)

# 3. Update testCreateMultipleKeyValues calls
content = content.replace(
    'window.omeroAnnotations.testCreateMultipleKeyValues(datasetId, keyValuePairs);',
    'window.omeroAnnotations.testCreateMultipleKeyValues(datasetId, keyValuePairs, options.objectType || \'dataset\');'
)

# 4. Update addMapAnnotationsJsonTripletFallback calls inside addMapAnnotationsNew
content = content.replace(
    'return await this.addMapAnnotationsJsonTripletFallback(datasetId, metadata, namespace);',
    'return await this.addMapAnnotationsJsonTripletFallback(datasetId, metadata, namespace, options.objectType || \'dataset\');'
)

# 5. Update addMapAnnotationsJsonTripletFallback definition
content = content.replace(
    'async addMapAnnotationsJsonTripletFallback(datasetId, metadata, namespace) {\n        console.log(\'🔧 Using JSON triplet fallback method...\');\n        return await this.addMapAnnotations(datasetId, metadata, namespace);',
    'async addMapAnnotationsJsonTripletFallback(datasetId, metadata, namespace, objectType = \'dataset\') {\n        console.log(\'🔧 Using JSON triplet fallback method...\');\n        return await this.addMapAnnotations(datasetId, metadata, namespace, objectType);'
)

# 6. Update addMapAnnotations definition
content = content.replace(
    'async addMapAnnotations(datasetId, metadata, namespace, excludeIntegrationLinks = false) {',
    'async addMapAnnotations(datasetId, metadata, namespace, objectType = \'dataset\', excludeIntegrationLinks = false) {'
)

# 7. Update addMapAnnotations formData append
content = content.replace(
    '            formData.append(\'dataset\', parseInt(datasetId));\n            formData.append(\'mapAnnotation\', JSON.stringify(mapPairs));',
    '            formData.append(objectType, parseInt(datasetId));\n            formData.append(\'mapAnnotation\', JSON.stringify(mapPairs));'
)

# 8. Update addWorkingMapAnnotations
content = content.replace(
    '    async addWorkingMapAnnotations(datasetId, metadata, namespace) {\n        console.log(\'🔬 Adding working Map Annotations (projectManager compatibility)...\');\n        return await this.addMapAnnotations(datasetId, metadata, namespace);\n    },',
    '    async addWorkingMapAnnotations(datasetId, metadata, namespace, objectType = \'dataset\') {\n        console.log(\'🔬 Adding working Map Annotations (projectManager compatibility)...\');\n        return await this.addMapAnnotations(datasetId, metadata, namespace, objectType);\n    },'
)


# 9. Replace createDatasetForMetaFoldProject
content = re.sub(
    r'\/\/ Dataset erstellen\s*console\.log\("🏗️ Creating OMERO dataset\.\.\."\);\s*const datasetName = projectName;\s*const datasetDescription = this\.generateDatasetDescription\(projectName, metadata, options\);\s*const datasetResult = await this\.hybridAuth\.createDatasetInGroup\(\s*datasetName,\s*datasetDescription,\s*options\.groupId,\s*options\.projectId\s*\);\s*if \(\!datasetResult\.success\) \{\s*throw new Error\(`Dataset creation failed: \$\{datasetResult\.message \|\| \'Unknown error\'\}`\);\s*\}\s*const datasetId = datasetResult\.datasetId;\s*console\.log\(`✅ Dataset created: ID \$\{datasetId\}`\);\s*if \(datasetResult\.linkedToProject\) \{\s*console\.log\(`🔗 Dataset linked to project: \$\{options\.projectId\}`\);\s*\}',
    '''// Dataset oder Projekt erstellen
            const isProjectCreation = options.projectId === 'create_new_project';
            const datasetName = projectName;
            const datasetDescription = this.generateDatasetDescription(projectName, metadata, options);
            let datasetResult;

            if (isProjectCreation) {
                console.log("🏗️ Creating OMERO project...");
                datasetResult = await this.hybridAuth.createProjectInGroup(
                    datasetName,
                    datasetDescription,
                    options.groupId
                );
            } else {
                console.log("🏗️ Creating OMERO dataset...");
                datasetResult = await this.hybridAuth.createDatasetInGroup(
                    datasetName,
                    datasetDescription,
                    options.groupId,
                    options.projectId
                );
            }

            if (!datasetResult.success) {
                throw new Error(`${isProjectCreation ? 'Project' : 'Dataset'} creation failed: ${datasetResult.message || datasetResult.error || 'Unknown error'}`);
            }

            const datasetId = datasetResult.datasetId; // Both return datasetId
            const objectType = isProjectCreation ? 'project' : 'dataset';
            console.log(`✅ ${isProjectCreation ? 'Project' : 'Dataset'} created: ID ${datasetId}`);

            if (!isProjectCreation && datasetResult.linkedToProject) {
                console.log(`🔗 Dataset linked to project: ${options.projectId}`);
            }''',
    content
)

content = content.replace(
    '''                // Use new method with simple key-value pairs (falls back to old method if needed)
                annotationResult = await this.addMapAnnotationsNew(
                    datasetId,
                    metadata,
                    options.namespace || 'MetaFold Integration',
                    true  // useSimpleMethod = true
                );''',
    '''                // Use new method with simple key-value pairs (falls back to old method if needed)
                annotationResult = await this.addMapAnnotationsNew(
                    datasetId,
                    metadata,
                    options.namespace || 'MetaFold Integration',
                    { useJsonTriplets: false, objectType: objectType }
                );'''
)

# 10. Replace createDatasetForMetaFoldProjectEnhanced
content = re.sub(
    r'\/\/ Step 1: Create dataset \(same as Phase 1\)\s*console\.log\("📊 Step 1: Creating OMERO dataset\.\.\."\);\s*const datasetResult = await this\.hybridAuth\.createDatasetInGroup\(\s*projectName,\s*this\.generateDatasetDescription\(projectName, metadata, options\),\s*options\.groupId,\s*options\.projectId\s*\);\s*if \(\!datasetResult\.success\) \{\s*throw new Error\(`Dataset creation failed: \$\{datasetResult\.error\}`\);\s*\}\s*const datasetId = datasetResult\.datasetId;\s*console\.log\(`✅ Dataset created successfully: ID \$\{datasetId\}`\);',
    '''// Step 1: Create dataset or project
            console.log("📊 Step 1: Creating OMERO dataset or project...");
            const isProjectCreation = options.projectId === 'create_new_project';
            const datasetDescription = this.generateDatasetDescription(projectName, metadata, options);
            let datasetResult;
            
            if (isProjectCreation) {
                datasetResult = await this.hybridAuth.createProjectInGroup(
                    projectName,
                    datasetDescription,
                    options.groupId
                );
            } else {
                datasetResult = await this.hybridAuth.createDatasetInGroup(
                    projectName,
                    datasetDescription,
                    options.groupId,
                    options.projectId
                );
            }

            if (!datasetResult.success) {
                throw new Error(`${isProjectCreation ? 'Project' : 'Dataset'} creation failed: ${datasetResult.message || datasetResult.error || 'Unknown error'}`);
            }

            const datasetId = datasetResult.datasetId;
            const objectType = isProjectCreation ? 'project' : 'dataset';
            console.log(`✅ ${isProjectCreation ? 'Project' : 'Dataset'} created successfully: ID ${datasetId}`);''',
    content
)

content = content.replace(
    '''                // Execute annotation (handles simple/enhanced/legacy automatically based on settings)
                annotationResult = await this.addMapAnnotationsNew(
                    datasetId,
                    metadata,
                    options.namespace || 'MetaFold Integration',
                    { templateMetadata: options.templateMetadata }
                );''',
    '''                // Execute annotation (handles simple/enhanced/legacy automatically based on settings)
                annotationResult = await this.addMapAnnotationsNew(
                    datasetId,
                    metadata,
                    options.namespace || 'MetaFold Integration',
                    { templateMetadata: options.templateMetadata, objectType: objectType }
                );'''
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated metaFoldOMEROIntegration.js')
