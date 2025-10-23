// ONLY THE NEW generateAndSaveReadme FUNCTION - TO BE COPIED INTO metadataLoader.js

    /**
     * Generate and save README.html with integration links
     * ✅ FIXED: Uses the SAME two-step method as Create Project:
     *   1. Generate README HTML (without links)
     *   2. Insert links with insertLinksIntoReadme (like projectManager does)
     * 
     * @param {Object|null} elabftwResult - elabFTW upload result with URL
     * @param {Object|null} omeroResult - OMERO upload result with URL  
     * @returns {Promise<Object>} Result object with success status
     */
    async generateAndSaveReadme(elabftwResult = null, omeroResult = null) {
        try {
            console.log('📄 metadataLoader: Starting README generation (two-step method)...');
            
            // Get project name and metadata
            const projectName = this.getProjectName();
            console.log('📄 metadataLoader: Project name:', projectName);
            
            const metadataFields = this.loadedMetadata.metadata || this.loadedMetadata;
            
            // ✅ STEP 1: Generate README HTML content (WITHOUT integration links)
            console.log('📄 metadataLoader: STEP 1 - Generating README HTML (without links)...');
            
            const generateResult = await window.electronAPI.generateReadmeHtmlContent(
                metadataFields,
                projectName,
                null,  // No elabFTW link yet
                null   // No OMERO link yet
            );
            
            if (!generateResult.success) {
                throw new Error(generateResult.message || 'Failed to generate README content');
            }
            
            console.log('✅ metadataLoader: README HTML generated');
            console.log('  Content length:', generateResult.html.length, 'characters');
            
            // Suggest filename based on project name
            const sanitizedProjectName = projectName 
                ? projectName.replace(/[<>:"/\\|?*]/g, '_').trim()
                : 'Project';
            const suggestedFilename = `${sanitizedProjectName}-README.html`;
            
            console.log('📄 metadataLoader: Opening save dialog...');
            console.log('  Suggested filename:', suggestedFilename);
            
            // Save the README file (without links)
            const saveResult = await window.electronAPI.saveHtmlFile(
                generateResult.html,
                suggestedFilename
            );
            
            if (!saveResult.success) {
                if (saveResult.cancelled) {
                    console.log('ℹ️ metadataLoader: User cancelled README save');
                    return {
                        success: false,
                        message: 'README save cancelled by user',
                        cancelled: true
                    };
                } else {
                    throw new Error(saveResult.message || 'Failed to save README');
                }
            }
            
            console.log('✅ metadataLoader: STEP 1 complete - README saved');
            console.log('  Saved to:', saveResult.filePath);
            
            // ✅ STEP 2: Insert integration links (if available)
            // Extract URLs from results
            let elabftwUrl = null;
            let omeroUrl = null;
            
            if (elabftwResult && elabftwResult.success) {
                elabftwUrl = elabftwResult.experimentUrl || elabftwResult.url || null;
            }
            
            if (omeroResult && omeroResult.success) {
                omeroUrl = omeroResult.datasetUrl || omeroResult.url || null;
                if (!omeroUrl && omeroResult.dataset) {
                    omeroUrl = omeroResult.dataset.omeroWebUrl || null;
                }
            }
            
            // Only proceed with link insertion if we have at least one link
            if (elabftwUrl || omeroUrl) {
                console.log('📄 metadataLoader: STEP 2 - Inserting integration links...');
                console.log('  elabFTW URL:', elabftwUrl || 'none');
                console.log('  OMERO URL:', omeroUrl || 'none');
                
                // Extract directory path from saved file path
                const pathParts = saveResult.filePath.split(/[/\\]/);
                pathParts.pop(); // Remove filename
                const directoryPath = pathParts.join(window.electronAPI?.platform === 'win32' ? '\\' : '/');
                
                console.log('📄 metadataLoader: Directory path:', directoryPath);
                
                // Use the SAME function as projectManager (insertLinksIntoReadme)
                if (window.electronAPI && window.electronAPI.insertLinksIntoReadme) {
                    try {
                        const insertResult = await window.electronAPI.insertLinksIntoReadme(
                            directoryPath,  // Folder where README is saved
                            elabftwUrl,
                            omeroUrl,
                            projectName
                        );
                        
                        if (insertResult.success) {
                            console.log('✅ metadataLoader: STEP 2 complete - Integration links inserted!');
                        } else {
                            console.warn('⚠️ metadataLoader: Failed to insert links:', insertResult.message);
                            // Don't fail the whole operation - README is still usable
                        }
                    } catch (insertError) {
                        console.error('❌ metadataLoader: Error inserting links:', insertError);
                        // Don't fail the whole operation - README is still usable
                    }
                } else {
                    console.warn('⚠️ metadataLoader: insertLinksIntoReadme not available');
                }
            } else {
                console.log('📄 metadataLoader: STEP 2 skipped - No integration links to insert');
            }
            
            // Show success message to user
            this.showSuccess(`README.html saved successfully to: ${saveResult.filename}`);
            
            return {
                success: true,
                message: 'README saved successfully with integration links',
                path: saveResult.filePath,
                filename: saveResult.filename
            };
            
        } catch (error) {
            console.error('❌ metadataLoader: Error generating/saving README:', error);
            this.showError('Error saving README: ' + error.message);
            return {
                success: false,
                message: error.message,
                error: error.toString()
            };
        }
    }
