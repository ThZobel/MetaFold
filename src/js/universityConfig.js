// Uni-spezifische Konfiguration - Neue Datei: universityConfig.js

const universityConfigs = {
    // Münster (als Beispiel)
    'omero-imaging.uni-muenster.de': {
        name: 'Universität Münster',
        country: 'Germany',
        omeroVersion: '5.25.0',
        // Spezielle API-Endpunkte falls nötig
        customEndpoints: {
            projects: 'api/v0/m/projects/',
            groups: 'api/v0/m/experimentergroups/'
        },
        // Bekannte Test-Projekte (nur für Development/Debug)
        testProjects: {
            '1353': ['1_MetaFold', 'Basics of Image Analysis'] // Nur für Debugging
        },
        // Spezielle Gruppen-Filter falls nötig
        groupFilterStrategy: 'standard' // 'standard', 'owner-based', 'details-only'
    },
    
    // Template für andere Unis
    'example.university.edu': {
        name: 'Example University',
        country: 'USA',
        omeroVersion: '5.24.0',
        customEndpoints: {
            projects: 'api/v0/m/projects/',
            groups: 'api/v0/m/groups/' // Andere API-Struktur
        },
        groupFilterStrategy: 'owner-based'
    },
    
    // Default/Universal Config
    'default': {
        name: 'Unknown OMERO Server',
        country: 'Unknown',
        omeroVersion: 'Unknown',
        customEndpoints: {
            projects: 'api/v0/m/projects/',
            groups: ['api/v0/m/experimentergroups/', 'api/v0/m/groups/']
        },
        groupFilterStrategy: 'standard'
    }
};

// Konfigurations-Manager
const universityConfigManager = {
    // Aktuelle Konfiguration ermitteln
    getCurrentConfig() {
        const settings = window.settingsManager?.getSettings();
        const serverUrl = settings?.serverUrl || '';
        
        // Extrahiere Domain aus Server-URL
        let domain = 'default';
        try {
            const url = new URL(serverUrl);
            domain = url.hostname;
        } catch (error) {
            console.warn('Could not parse server URL for config:', serverUrl);
        }
        
        // Finde passende Konfiguration
        const config = universityConfigs[domain] || universityConfigs['default'];
        console.log(`🌍 Using config for: ${domain} (${config.name})`);
        
        return {
            ...config,
            domain: domain,
            serverUrl: serverUrl
        };
    },
    
    // Konfiguration für OMERO Client anwenden
    applyToClient(omeroClient) {
        const config = this.getCurrentConfig();
        
        // Setze konfigurationsspezifische Parameter
        if (omeroClient && config.customEndpoints) {
            omeroClient.universityConfig = config;
            console.log(`🌍 Applied ${config.name} config to OMERO client`);
        }
        
        return config;
    },
    
    // Debug-Funktion: Zeige aktuelle Uni-Info
    debugCurrentUniversity() {
        const config = this.getCurrentConfig();
        
        console.log('🌍 === UNIVERSITY CONFIG DEBUG ===');
        console.log('University:', config.name);
        console.log('Domain:', config.domain);
        console.log('Country:', config.country);
        console.log('OMERO Version:', config.omeroVersion);
        console.log('Server URL:', config.serverUrl);
        console.log('Group Strategy:', config.groupFilterStrategy);
        console.log('Custom Endpoints:', config.customEndpoints);
        
        if (config.testProjects) {
            console.log('Test Projects Available:', Object.keys(config.testProjects));
        }
        
        console.log('=====================================');
        
        return config;
    },
    
    // Neue Uni hinzufügen (für Installation)
    addUniversityConfig(domain, config) {
        universityConfigs[domain] = {
            ...universityConfigs['default'],
            ...config,
            dateAdded: new Date().toISOString()
        };
        
        console.log(`🌍 Added config for: ${domain} (${config.name})`);
        
        // Optional: In localStorage speichern für Persistenz
        try {
            const customConfigs = JSON.parse(localStorage.getItem('metafold_university_configs') || '{}');
            customConfigs[domain] = universityConfigs[domain];
            localStorage.setItem('metafold_university_configs', JSON.stringify(customConfigs));
        } catch (error) {
            console.warn('Could not save university config:', error);
        }
    },
    
    // Lade gespeicherte Uni-Configs
    loadCustomConfigs() {
        try {
            const customConfigs = JSON.parse(localStorage.getItem('metafold_university_configs') || '{}');
            Object.assign(universityConfigs, customConfigs);
            console.log('🌍 Loaded custom university configs:', Object.keys(customConfigs));
        } catch (error) {
            console.warn('Could not load custom university configs:', error);
        }
    }
};

// Bei App-Start laden
document.addEventListener('DOMContentLoaded', () => {
    universityConfigManager.loadCustomConfigs();
});

// Global verfügbar machen
window.universityConfigs = universityConfigs;
window.universityConfigManager = universityConfigManager;

console.log('🌍 University Configuration System loaded');

// Beispiel für neue Uni-Registrierung:
/*
// Neue Uni hinzufügen:
universityConfigManager.addUniversityConfig('omero.example-university.de', {
    name: 'Example University',
    country: 'Germany',
    omeroVersion: '5.24.0',
    customEndpoints: {
        projects: 'api/v0/m/projects/',
        groups: 'webgateway/groups/'  // Andere API
    },
    groupFilterStrategy: 'owner-based'
});
*/