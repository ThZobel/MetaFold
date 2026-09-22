/**
 * RO-Crate Validator Module
 * In-memory, lightweight validation of RO-Crate 1.1 payloads.
 */

window.roCrateValidator = {
    /**
     * Validates an RO-Crate JSON-LD object.
     * @param {Object} crateData - The parsed RO-Crate JSON-LD object
     * @returns {Object} - Validation result { isValid, errors: [], warnings: [], stats: {} }
     */
    validateCrate(crateData) {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            stats: {
                entities: 0,
                files: 0,
                actions: 0
            }
        };

        if (!crateData) {
            result.isValid = false;
            result.errors.push({ field: "Root", message: "No crate data provided." });
            return result;
        }

        // 1. Structural Checks
        if (crateData['@context'] !== "https://w3id.org/ro/crate/1.1/context") {
            result.errors.push({ field: "@context", message: "Invalid or missing @context. Must be RO-Crate 1.1." });
            result.isValid = false;
        }

        if (!Array.isArray(crateData['@graph'])) {
            result.errors.push({ field: "@graph", message: "@graph array is missing." });
            result.isValid = false;
            return result; // Cannot proceed without @graph
        }

        const graph = crateData['@graph'];
        result.stats.entities = graph.length;

        // Lookup maps for fast entity checking
        const entityMap = new Map();
        graph.forEach(entity => {
            if (entity['@id']) {
                entityMap.set(entity['@id'], entity);
            }
        });

        // 2. Descriptor Check (ro-crate-metadata.json)
        const descriptor = entityMap.get("ro-crate-metadata.json");
        if (!descriptor) {
            result.errors.push({ field: "Descriptor", message: "Missing ro-crate-metadata.json descriptor entity." });
            result.isValid = false;
        } else {
            if (descriptor['@type'] !== "CreativeWork") {
                result.errors.push({ field: "Descriptor", message: "Descriptor @type must be 'CreativeWork'." });
                result.isValid = false;
            }
            if (!descriptor.about || descriptor.about['@id'] !== "./") {
                result.errors.push({ field: "Descriptor", message: "Descriptor must be about the root dataset ('./')." });
                result.isValid = false;
            }
        }

        // 3. Root Dataset Check (./)
        const rootDataset = entityMap.get("./");
        if (!rootDataset) {
            result.errors.push({ field: "Root Dataset", message: "Missing root dataset entity ('./')." });
            result.isValid = false;
            return result;
        }

        const type = Array.isArray(rootDataset['@type']) ? rootDataset['@type'] : [rootDataset['@type']];
        if (!type.includes("Dataset")) {
            result.errors.push({ field: "Root Dataset", message: "Root dataset @type must be 'Dataset'." });
            result.isValid = false;
        }

        // Root Dataset Mandatory Properties
        if (!rootDataset.name || rootDataset.name.trim() === "") {
            result.errors.push({ field: "name", message: "Root dataset must have a name." });
            result.isValid = false;
        }

        if (!rootDataset.description || rootDataset.description.trim() === "") {
            result.warnings.push({ field: "description", message: "Root dataset should have a description." });
        }

        if (!rootDataset.datePublished) {
            result.errors.push({ field: "datePublished", message: "Root dataset must have a datePublished." });
            result.isValid = false;
        } else if (isNaN(Date.parse(rootDataset.datePublished))) {
            result.errors.push({ field: "datePublished", message: "Invalid datePublished format." });
            result.isValid = false;
        }

        if (!rootDataset.license) {
            result.errors.push({ field: "license", message: "Root dataset must have a license." });
            result.isValid = false;
        }

        // Author Check
        if (!rootDataset.author) {
            result.errors.push({ field: "author", message: "Root dataset must have at least one author." });
            result.isValid = false;
        } else {
            const authors = Array.isArray(rootDataset.author) ? rootDataset.author : [rootDataset.author];
            authors.forEach(authRef => {
                if (authRef['@id']) {
                    const authorEntity = entityMap.get(authRef['@id']);
                    if (!authorEntity) {
                        // Check if it's an external URI
                        if (!authRef['@id'].startsWith("http")) {
                            result.errors.push({ field: "author", message: `Author reference ${authRef['@id']} not found in @graph.` });
                            result.isValid = false;
                        }
                    } else {
                        // Validate author entity
                        const authorId = authorEntity['@id'];
                        const isOrcid = authorId && authorId.match(/https?:\/\/orcid\.org\/\d{4}-\d{4}-\d{4}-\d{3}[\dX]/);
                        if (!isOrcid && authorEntity['@type'] === "Person") {
                            result.warnings.push({ field: "author", message: `Author ${authorEntity.name || authorId} has no ORCID.` });
                        }
                        if (authorEntity['@type'] === "Person" && authorEntity.name === "Unknown") {
                            result.errors.push({ field: "author", message: `Author name cannot be 'Unknown'. Please fill out your user profile.` });
                            result.isValid = false;
                        }
                    }
                }
            });
        }

        // 4. Content and Lineage Checks
        graph.forEach(entity => {
            const eType = Array.isArray(entity['@type']) ? entity['@type'] : [entity['@type']];
            
            if (eType.includes("File")) {
                result.stats.files++;
            }
            
            if (eType.includes("CreateAction")) {
                result.stats.actions++;
                
                // Lineage Checks
                if (!entity.object) result.warnings.push({ field: "CreateAction", message: `Action ${entity['@id']} has no input object.` });
                if (!entity.result) result.warnings.push({ field: "CreateAction", message: `Action ${entity['@id']} has no output result.` });
                
                // Check referential integrity for object and result
                ['object', 'result'].forEach(prop => {
                    if (entity[prop]) {
                        const items = Array.isArray(entity[prop]) ? entity[prop] : [entity[prop]];
                        items.forEach(item => {
                            if (item['@id'] && !entityMap.has(item['@id']) && !item['@id'].startsWith("http")) {
                                result.errors.push({ field: "CreateAction", message: `Action ${entity['@id']} references missing ${prop}: ${item['@id']}` });
                                result.isValid = false;
                            }
                        });
                    }
                });
            }
        });

        return result;
    }
};
