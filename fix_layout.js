const fs = require('fs');
const path = 'src/index.html';

try {
    let data = fs.readFileSync(path, 'utf8');
    const lines = data.split(/\r?\n/);

    // 1. Remove "Template Actions" header from main-tabs
    // Look for lines 934-940 roughly
    let headerStartIndex = -1;
    let headerEndIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('<h3>') && lines[i + 1] && lines[i + 1].includes('Template Actions')) {
            // Found the header start (approx)
            // Check if it's inside main-tabs (lines 927-941)
            if (i > 920 && i < 950) {
                headerStartIndex = i;
                // Find the closing button
                for (let j = i; j < i + 10; j++) {
                    if (lines[j].includes('</button>')) {
                        headerEndIndex = j;
                        break;
                    }
                }
                break;
            }
        }
    }

    let headerContent = '';
    if (headerStartIndex !== -1 && headerEndIndex !== -1) {
        console.log(`Found header at lines ${headerStartIndex}-${headerEndIndex}`);
        headerContent = lines.slice(headerStartIndex, headerEndIndex + 1).join('\n');
        // Remove lines
        lines.splice(headerStartIndex, headerEndIndex - headerStartIndex + 1);
    } else {
        console.warn('Could not find Template Actions header in main-tabs');
    }

    // 2. Extract moreMenu
    let moreMenuStartIndex = -1;
    let moreMenuEndIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('id="moreMenu"')) {
            moreMenuStartIndex = i;
            // Find the end of moreMenu
            // It ends with </div> <!-- End moreMenu -->
            for (let j = i; j < lines.length; j++) {
                if (lines[j].includes('<!-- End moreMenu -->')) {
                    moreMenuEndIndex = j;
                    break;
                }
            }
            break;
        }
    }

    let moreMenuContent = '';
    if (moreMenuStartIndex !== -1 && moreMenuEndIndex !== -1) {
        console.log(`Found moreMenu at lines ${moreMenuStartIndex}-${moreMenuEndIndex}`);
        moreMenuContent = lines.slice(moreMenuStartIndex, moreMenuEndIndex + 1).join('\n');
        // Remove lines
        lines.splice(moreMenuStartIndex, moreMenuEndIndex - moreMenuStartIndex + 1);
    } else {
        console.error('Could not find moreMenu div');
        process.exit(1);
    }

    // 3. Modify moreMenu content
    // Add class "right-sidebar"
    moreMenuContent = moreMenuContent.replace('class="more-menu-panel"', 'class="right-sidebar more-menu-panel"');

    // Insert header at the top of panel-content
    if (headerContent) {
        moreMenuContent = moreMenuContent.replace('<div class="panel-content">', '<div class="panel-content">\n' + headerContent);
    }

    // Remove display: none if we want it visible by default, but user said "still up", implying it's visible.
    // However, right-sidebar usually is visible.
    // Let's remove style="display: none;" if it exists, or change it.
    // Actually, if it's a sidebar, it might be toggleable. But usually sidebars are visible.
    // Let's keep the logic as is for now, but ensure it's structurally correct.
    // If the user says "still up", maybe they mean "still visible at the top".

    // 4. Insert moreMenu after main-content
    // Find closing of main-content
    let mainContentEndIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('<!--Ende: main-content(enthält alle Tabs + Footer)-->') ||
            lines[i].includes('<!--Ende: main - content(enthält alle Tabs + Footer)-->') ||
            lines[i].includes('<!--Ende: main - content(enth├ñlt alle Tabs + Footer)-- >')) {
            mainContentEndIndex = i;
            break;
        }
    }

    if (mainContentEndIndex === -1) {
        // Fallback: search for class="main-content" and find matching closing div?
        // Or look for <!--RIGHT SIDEBAR - Integrations & Info--> which usually follows
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('<!--RIGHT SIDEBAR - Integrations & Info-->')) {
                mainContentEndIndex = i - 1;
                break;
            }
        }
    }

    if (mainContentEndIndex !== -1) {
        console.log(`Found insertion point at line ${mainContentEndIndex}`);
        lines.splice(mainContentEndIndex + 1, 0, moreMenuContent);
    } else {
        console.error('Could not find end of main-content');
        // Try to insert before </body> as a fallback, but inside container
        // Find </body>
        // ...
    }

    fs.writeFileSync(path, lines.join('\n'), 'utf8');
    console.log('Successfully restructured index.html');

} catch (err) {
    console.error('Error:', err);
}
