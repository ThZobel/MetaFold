const fs = require('fs');
const pathIndex = 'src/index.html';
const pathBroken = 'src/index_broken.html';

try {
    // 1. Get moreMenu content from broken file
    const brokenData = fs.readFileSync(pathBroken, 'utf8');
    const brokenLines = brokenData.split(/\r?\n/);

    let start = -1;
    let end = -1;

    for (let i = 0; i < brokenLines.length; i++) {
        if (brokenLines[i].includes('id="moreMenu"')) {
            start = i;
        }
        if (start !== -1 && brokenLines[i].includes('<!-- End moreMenu -->')) {
            end = i;
            break;
        }
    }

    // Fallback if comment not found, use line number approx or search for closing div
    if (end === -1 && start !== -1) {
        // Look for next major section
        for (let i = start; i < brokenLines.length; i++) {
            if (brokenLines[i].includes('<!-- DISCOVER PROJECTS TAB -->')) {
                end = i - 1;
                break;
            }
        }
    }

    if (start === -1 || end === -1) {
        console.error('Could not find moreMenu in index_broken.html');
        process.exit(1);
    }

    let moreMenuContent = brokenLines.slice(start, end + 1).join('\n');
    console.log(`Extracted moreMenu (${moreMenuContent.length} chars)`);

    // Modify moreMenu class
    moreMenuContent = moreMenuContent.replace('class="more-menu-panel"', 'class="right-sidebar more-menu-panel"');

    // Add the "Template Actions" header with close button if not present
    // The user had a header in main-tabs:
    // <h3><span>⚙️</span> Template Actions</h3> <button ...>
    // We should add this to the top of panel-content
    const headerHtml = `
                    <div class="sidebar-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0;">⚙️ Template Actions</h3>
                        <button class="panel-close" onclick="closeMoreMenu()" aria-label="Close" style="background: none; border: none; color: #9ca3af; font-size: 1.2rem; cursor: pointer;">✕</button>
                    </div>`;

    moreMenuContent = moreMenuContent.replace('<div class="panel-content">', '<div class="panel-content">\n' + headerHtml);


    // 2. Modify index.html
    let indexData = fs.readFileSync(pathIndex, 'utf8');
    let indexLines = indexData.split(/\r?\n/);

    // Remove Template Actions header from main-tabs
    // Look for lines 934-940 approx
    // We look for the h3 with Template Actions
    let headerStart = -1;
    let headerEnd = -1;

    for (let i = 0; i < indexLines.length; i++) {
        if (indexLines[i].includes('Template Actions') && indexLines[i - 2] && indexLines[i - 2].includes('<h3>')) {
            // Found the text, header start is likely i-2
            headerStart = i - 2;
            // Find closing button
            for (let j = i; j < i + 10; j++) {
                if (indexLines[j].includes('</button>')) {
                    headerEnd = j;
                    break;
                }
            }
            break;
        }
    }

    if (headerStart !== -1 && headerEnd !== -1) {
        console.log(`Removing header at lines ${headerStart}-${headerEnd}`);
        indexLines.splice(headerStart, headerEnd - headerStart + 1);
    } else {
        console.warn('Could not find Template Actions header to remove');
    }

    // Insert moreMenu after right-sidebar
    // Find <!--Settings Modal -->
    let insertIndex = -1;
    for (let i = 0; i < indexLines.length; i++) {
        if (indexLines[i].includes('<!--Settings Modal')) {
            insertIndex = i;
            break;
        }
    }

    if (insertIndex !== -1) {
        // We want to insert before the Settings Modal, but inside container.
        // The line before Settings Modal is likely </div> (closing container) or </div> (closing right-sidebar).
        // Let's check the line before
        let lineBefore = indexLines[insertIndex - 1];
        if (lineBefore.trim() === '</div>') {
            // This might be closing container.
            // We want to insert BEFORE closing container.
            // So insert at insertIndex - 1?
            // Let's verify indentation or count divs?
            // Assuming structure:
            // ...
            // <div class="right-sidebar">...</div>
            // </div> <!-- container -->
            // <!-- Settings Modal -->

            // So we should insert before the LAST closing div before Settings Modal.
            // Let's insert at insertIndex - 1.
            console.log(`Inserting moreMenu at line ${insertIndex - 1}`);
            indexLines.splice(insertIndex - 1, 0, moreMenuContent);
        } else {
            console.warn('Unexpected structure before Settings Modal');
            // Just insert before Settings Modal and hope for the best?
            indexLines.splice(insertIndex, 0, moreMenuContent);
        }
    } else {
        console.error('Could not find Settings Modal marker');
    }

    fs.writeFileSync(pathIndex, indexLines.join('\n'), 'utf8');
    console.log('Successfully patched index.html');

} catch (err) {
    console.error('Error:', err);
}
