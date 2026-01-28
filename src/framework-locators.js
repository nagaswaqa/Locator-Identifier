// Framework-Specific Locator Strategies
// Supports Angular DevExpress, React AG-Grid, and Nexus components

/**
 * Detects framework-specific component attributes and returns appropriate locators
 * @param {HTMLElement} element - The element to inspect
 * @returns {Object} Framework-specific locators
 */
function detectFrameworkLocators(element) {
    const locators = {
        devExpress: detectDevExpressLocators(element),
        agGrid: detectAGGridLocators(element),
        nexus: detectNexusLocators(element),
        framework: detectFramework(element)
    };
    return locators;
}

/**
 * Detects the frontend framework in use
 * @param {HTMLElement} element - Element to check
 * @returns {string} Framework name or 'unknown'
 */
function detectFramework(element) {
    const doc = element.ownerDocument || document;

    // Check for Angular
    if (doc.documentElement.hasAttribute('ng-app') ||
        doc.documentElement.hasAttribute('ng-version') ||
        window.angular ||
        doc.querySelector('[ng-app]') ||
        Array.from(doc.querySelectorAll('*')).some(el => {
            const attrs = el.attributes;
            for (let attr of attrs) {
                if (attr.name.startsWith('ng-') || attr.name.startsWith('_ng')) return true;
            }
            return false;
        })) {
        return 'angular';
    }

    // Check for React
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__ ||
        doc.querySelector('[data-reactroot], [data-react-root]') ||
        Object.keys(element).some(k => k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$'))) {
        return 'react';
    }

    // Check for Vue
    if (window.__VUE__ ||
        window.__VUE_DEVTOOLS_GLOBAL_HOOK__ ||
        element.__vue__) {
        return 'vue';
    }

    return 'unknown';
}

/**
 * Detects DevExpress-specific locators (Angular components)
 * @param {HTMLElement} element - Element to inspect
 * @returns {Object} DevExpress locators
 */
function detectDevExpressLocators(element) {
    const locators = {};

    // Check for dx-button
    if (element.classList.contains('dx-button') || element.matches('.dx-button, .dx-button-content, [role="button"].dx-button')) {
        locators.type = 'button';
        locators.dx_text = element.textContent?.trim();
        locators.selector = `.dx-button:contains("${element.textContent?.trim()}")`;
    }

    // Check for dx-textbox
    if (element.classList.contains('dx-textbox') || element.matches('[class*="dx-textbox"]')) {
        locators.type = 'textbox';
        const input = element.querySelector('input') || element;
        locators.dx_placeholder = input.getAttribute('placeholder');
        locators.dx_id = input.getAttribute('data-component-id') || input.id;
        locators.selector = `input[data-component-id="${locators.dx_id}"]`;
    }

    // Check for dx-selectbox
    if (element.classList.contains('dx-selectbox') || element.matches('[class*="dx-selectbox"]')) {
        locators.type = 'selectbox';
        locators.dx_id = element.getAttribute('data-component-id') || element.id;
        locators.selector = `[data-component-id="${locators.dx_id}"]`;
    }

    // Check for dx-datagrid
    if (element.classList.contains('dx-datagrid') || element.matches('[class*="dx-datagrid"]')) {
        locators.type = 'datagrid';
        locators.dx_id = element.getAttribute('data-component-id') || element.id;
        locators.selector = `.dx-datagrid[data-component-id="${locators.dx_id}"]`;

        // Try to find grid row/cell locators
        const row = element.closest('.dx-row, [class*="dx-row"]');
        if (row) {
            const rowIndex = Array.from(row.parentElement.children).indexOf(row);
            locators.row_index = rowIndex;
            locators.row_selector = `.dx-datagrid[data-component-id="${locators.dx_id}"] .dx-row:nth-child(${rowIndex + 1})`;
        }

        const cell = element.closest('.dx-cell, [class*="dx-cell"]');
        if (cell) {
            const cellIndex = Array.from(cell.parentElement.children).indexOf(cell);
            locators.cell_index = cellIndex;
            if (row) {
                const rowIndex = Array.from(row.parentElement.children).indexOf(row);
                locators.cell_selector = `.dx-datagrid[data-component-id="${locators.dx_id}"] .dx-row:nth-child(${rowIndex + 1}) .dx-cell:nth-child(${cellIndex + 1})`;
            }
        }
    }

    // Check for dx-form
    if (element.classList.contains('dx-form') || element.matches('[class*="dx-form"]')) {
        locators.type = 'form';
        locators.dx_id = element.getAttribute('data-component-id') || element.id;
        locators.selector = `[class*="dx-form"][data-component-id="${locators.dx_id}"]`;
    }

    return Object.keys(locators).length > 0 ? locators : null;
}

/**
 * Detects AG-Grid-specific locators (React/Angular)
 * @param {HTMLElement} element - Element to inspect
 * @returns {Object} AG-Grid locators
 */
/**
 * Detects AG-Grid-specific locators (React/Angular)
 * @param {HTMLElement} element - Element to inspect
 * @returns {Object} AG-Grid locators
 */
function detectAGGridLocators(element) {
    const locators = {};

    // Check for ag-grid container
    const gridContainer = element.closest('[class*="ag-root"], .ag-theme-alpine, .ag-theme-quartz, .ag-root-wrapper');
    if (!gridContainer) return null;

    locators.grid_id = gridContainer.getAttribute('id') || 'ag-grid';

    // Check for grid row
    const row = element.closest('[role="row"], .ag-row, [class*="ag-row"]');
    if (row) {
        locators.type = 'row';
        locators.row_id = row.getAttribute('row-id') || row.getAttribute('id');

        // Try to find a unique anchor within the row (resilience against virtualization)
        const rowId = locators.row_id;
        if (rowId && !isDynamic(rowId)) {
            locators.row_selector = `[row-id="${rowId}"]`;
        } else {
            // Fallback to text anchoring if row-id is dynamic or missing
            const uniqueCell = Array.from(row.querySelectorAll('[role="gridcell"]')).find(c => {
                const txt = c.textContent?.trim();
                return txt && txt.length > 2 && txt.length < 50;
            });
            if (uniqueCell) {
                locators.row_anchor_text = uniqueCell.textContent.trim();
                locators.row_selector = `[role="row"]:has([role="gridcell"]:has-text("${locators.row_anchor_text}"))`;
            } else {
                const rowIndex = Array.from(row.parentElement.children).indexOf(row);
                locators.row_index = rowIndex;
                locators.row_selector = `[role="row"]:nth-child(${rowIndex + 1})`;
            }
        }
    }

    // Check for grid cell
    const cell = element.closest('[role="gridcell"], .ag-cell, [class*="ag-cell"]');
    if (cell && row) {
        locators.type = 'cell';
        locators.cell_column = cell.getAttribute('col-id') || cell.getAttribute('aria-colindex');
        locators.cell_text = cell.textContent?.trim();

        if (locators.row_selector && locators.cell_column) {
            locators.selector = `#${locators.grid_id} ${locators.row_selector} [col-id="${locators.cell_column}"]`;
        }
    }

    // Check for AG-Grid header
    const header = element.closest('[role="columnheader"], .ag-header-cell, [class*="ag-header"]');
    if (header) {
        locators.type = 'header';
        locators.column_id = header.getAttribute('col-id');
        locators.header_text = header.textContent?.trim();
        locators.selector = `#${locators.grid_id} [role="columnheader"][col-id="${locators.column_id}"]`;
    }

    return Object.keys(locators).length > 0 ? locators : null;
}

/**
 * Detects Nexus-specific locators
 * @param {HTMLElement} element - Element to inspect
 * @returns {Object} Nexus locators
 */
function detectNexusLocators(element) {
    const locators = {};

    // Check for Nexus button (prioritizing data-nexus-id)
    if (element.matches('[class*="n-button"], .nxs-button, [data-component="button"], [data-nexus-id*="btn"]')) {
        locators.type = 'button';
        locators.nexus_id = element.getAttribute('data-nexus-id');
        locators.nexus_text = element.textContent?.trim();

        if (locators.nexus_id && !isDynamic(locators.nexus_id)) {
            locators.selector = `[data-nexus-id="${locators.nexus_id}"]`;
        } else {
            locators.selector = `[data-component="button"]:has-text("${locators.nexus_text}")`;
        }
    }

    // Check for Nexus input
    const inputWrapper = element.closest('[class*="n-input"], .nxs-input, [data-component="input"]');
    if (element.matches('input') || inputWrapper) {
        locators.type = 'input';
        const input = element.matches('input') ? element : inputWrapper.querySelector('input');
        locators.nexus_id = input?.getAttribute('data-nexus-id') || inputWrapper?.getAttribute('data-nexus-id');
        locators.nexus_label = inputWrapper?.getAttribute('data-label') || input?.getAttribute('aria-label');

        if (locators.nexus_id && !isDynamic(locators.nexus_id)) {
            locators.selector = `input[data-nexus-id="${locators.nexus_id}"]`;
        } else if (locators.nexus_label) {
            locators.selector = `[data-label="${locators.nexus_label}"] input`;
        }
    }

    // Check for Nexus modal (handling popups)
    const modal = element.closest('[class*="n-modal"], .nxs-modal, [data-component="modal"], .nexus-popup, .n-popup');
    if (modal) {
        locators.in_modal = true;
        locators.modal_title = modal.querySelector('[class*="title"], .nxs-modal-title, .n-popup-header')?.textContent?.trim();
        locators.modal_id = modal.getAttribute('data-nexus-id') || modal.id;

        if (element === modal) {
            locators.type = 'modal';
            locators.selector = locators.modal_id ? `[data-nexus-id="${locators.modal_id}"]` : `[data-component="modal"]:has-text("${locators.modal_title}")`;
        }
    }

    // Check for Nexus table/grid
    const table = element.closest('[class*="n-table"], .nxs-table, [data-component="table"]');
    if (table) {
        locators.type = 'table';
        locators.nexus_id = table.getAttribute('data-nexus-id') || table.id;

        const row = element.closest('tr, [role="row"], [data-row-id]');
        if (row) {
            locators.row_id = row.getAttribute('data-row-id') || row.getAttribute('id');
            if (locators.row_id && !isDynamic(locators.row_id)) {
                locators.row_selector = `[data-row-id="${locators.row_id}"]`;
            } else {
                const rowIndex = Array.from(row.parentElement.children).indexOf(row);
                locators.row_selector = `tr:nth-child(${rowIndex + 1})`;
            }
            locators.selector = `[data-nexus-id="${locators.nexus_id}"] ${locators.row_selector}`;
        }
    }

    return Object.keys(locators).length > 0 ? locators : null;
}

/**
 * Handles frame detection and element inspection within frames
 * @returns {Object} Frame information and accessible elements
 */
function detectFramesAndElements() {
    const doc = document;
    const frames = [];

    // Detect all iframes
    const iframes = doc.querySelectorAll('iframe');
    for (let i = 0; i < iframes.length; i++) {
        const iframe = iframes[i];
        const frameInfo = {
            index: i,
            id: iframe.id || `iframe-${i}`,
            name: iframe.name || `frame-${i}`,
            src: iframe.src || iframe.getAttribute('src-doc') || 'data-uri',
            accessible: false,
            elements: []
        };

        try {
            // Try to access frame content
            if (iframe.contentDocument || iframe.contentWindow) {
                frameInfo.accessible = true;
                const frameDoc = iframe.contentDocument || iframe.contentWindow.document;

                // Check for framework components in frame
                const frameElements = frameDoc.querySelectorAll('[class*="dx-"], [class*="ag-"], [class*="n-"], [data-component]');
                frameElements.forEach(el => {
                    frameInfo.elements.push({
                        tag: el.tagName,
                        classes: el.className,
                        id: el.id,
                        text: el.textContent?.substring(0, 50)
                    });
                });
            }
        } catch (e) {
            frameInfo.error = 'Cross-origin frame: Cannot access content';
        }

        frames.push(frameInfo);
    }

    return frames;
}

/**
 * Gets element from within a frame using frame index or ID
 * @param {number|string} frameIdentifier - Frame index or ID
 * @param {string} selector - CSS selector for element within frame
 * @returns {HTMLElement|null} Element if found
 */
function getElementInFrame(frameIdentifier, selector) {
    try {
        let iframe;

        if (typeof frameIdentifier === 'number') {
            iframe = document.querySelectorAll('iframe')[frameIdentifier];
        } else {
            iframe = document.getElementById(frameIdentifier) || document.querySelector(`iframe[name="${frameIdentifier}"]`);
        }

        if (!iframe) return null;

        const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!frameDoc) return null;

        return frameDoc.querySelector(selector);
    } catch (e) {
        console.error('Frame access error:', e);
        return null;
    }
}

/**
 * Generates Playwright code for framework-specific locators
 * @param {Object} locators - Framework locators
 * @param {string} language - Programming language (python, javascript, java)
 * @returns {string} Generated code
 */
function generateFrameworkCode(locators, language = 'javascript') {
    if (!locators || (!locators.devExpress && !locators.agGrid && !locators.nexus)) {
        return null;
    }

    let code = '';

    if (locators.devExpress && locators.devExpress.selector) {
        code = generateDevExpressCode(locators.devExpress, language);
    } else if (locators.agGrid && locators.agGrid.selector) {
        code = generateAGGridCode(locators.agGrid, language);
    } else if (locators.nexus && locators.nexus.selector) {
        code = generateNexusCode(locators.nexus, language);
    }

    return code || null;
}

function generateDevExpressCode(locators, language) {
    const selector = locators.selector;

    if (language === 'python') {
        return `page.locator("${selector}").click()`;
    } else if (language === 'java') {
        return `page.locator("${selector}").click();`;
    } else {
        return `await page.locator('${selector}').click();`;
    }
}

function generateAGGridCode(locators, language) {
    let code = '';

    if (locators.type === 'cell' && locators.selector) {
        if (language === 'python') {
            code = `# AG-Grid Cell Locator\npage.locator("${locators.selector}").click()`;
        } else if (language === 'java') {
            code = `// AG-Grid Cell Locator\npage.locator("${locators.selector}").click();`;
        } else {
            code = `// AG-Grid Cell Locator\nawait page.locator('${locators.selector}').click();`;
        }
    }

    return code;
}

function generateNexusCode(locators, language) {
    const selector = locators.selector;

    if (language === 'python') {
        return `# Nexus Component\npage.locator("${selector}").click()`;
    } else if (language === 'java') {
        return `// Nexus Component\npage.locator("${selector}").click();`;
    } else {
        return `// Nexus Component\nawait page.locator('${selector}').click();`;
    }
}
