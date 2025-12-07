const fs = require('fs');
const path = 'src/index.html';

try {
    const data = fs.readFileSync(path, 'utf8');
    let lines = data.split(/\r?\n/);

    // Fix projectPath (Line 962 -> Index 961)
    if (lines[961] && lines[961].includes('id="projectPath"')) {
        lines[961] = lines[961].replace('id="projectPath"', 'id="targetPath"');
        console.log('Fixed projectPath ID');
    }
    if (lines[962] && lines[962].includes('onclick="browsePath()"')) {
        lines[962] = lines[962].replace('onclick="browsePath()"', 'onclick="projectManager.browsePath()"');
        console.log('Fixed browsePath onclick');
    }

    // Fix handleApplyGroupStandard (Lines 2329-2338 -> Indices 2328-2337)
    // We are replacing the content inside the 'else' block and the 'catch' block

    // Check if we are at the right place
    if (lines[2328] && lines[2328].trim().startsWith('if (window.app?.showError)')) {
        lines[2328] = '                                                        if (window.app?.showError) {';
        lines[2329] = "                                                            window.app.showError('Failed to apply group standard settings.');";
        lines[2330] = '                                                        } else {';
        lines[2331] = "                                                            alert('❌ Failed to apply group standard settings.');";
        lines[2332] = '                                                        }';
        lines[2333] = '                                                    }';
        lines[2334] = '                                                } catch (error) {';
        lines[2335] = "                                                    console.error('Error in handleApplyGroupStandard:', error);";
        lines[2336] = '                                                }';
        lines[2337] = ''; // Clear the malformed closing brace line
        console.log('Fixed handleApplyGroupStandard');
    } else {
        console.warn('Could not find handleApplyGroupStandard block at expected lines');
        console.log('Line 2328 content:', lines[2328]);
    }

    fs.writeFileSync(path, lines.join('\n'), 'utf8');
    console.log('Successfully patched index.html');
} catch (err) {
    console.error('Error:', err);
}
