const fs = require('fs');
const path = 'src/index.html';

try {
    const data = fs.readFileSync(path, 'utf8');
    let lines = data.split(/\r?\n/);

    // Find insertion point: before window.resetSettings
    const insertIndex = lines.findIndex(line => line.includes('window.resetSettings = function'));

    if (insertIndex !== -1) {
        const newCode = [
            '',
            '                                                    // =================== TEMPLATE SAVING ===================',
            '',
            '                                                    window.saveExperimentTemplate = async function() {',
            "                                                        console.log('💾 Saving experiment template...');",
            '                                                        if (window.templateModal && window.templateModal.save) {',
            '                                                            window.templateModal.save();',
            '                                                        } else {',
            "                                                            console.warn('templateModal.save not available');",
            "                                                            alert('Save functionality not fully implemented yet.');",
            '                                                        }',
            '                                                    }',
            '',
            '                                                        ;'
        ];

        lines.splice(insertIndex, 0, ...newCode);
        fs.writeFileSync(path, lines.join('\n'), 'utf8');
        console.log('Successfully added saveExperimentTemplate');
    } else {
        console.error('Could not find insertion point for saveExperimentTemplate');
    }
} catch (err) {
    console.error('Error:', err);
}
