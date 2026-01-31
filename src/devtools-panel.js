// Playwright PRO - DevTools Panel Script
// v3.0.0

let selectedElement = null;
let pollingInterval = null;
let overrideStrategy = null;


// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updateStatus('[v4.0] Ready to inspect elements...');

});



function setupEventListeners() {
    // Tab Switching
    document.getElementById('tabLive').addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.getElementById('tabLive').classList.add('active');
        document.getElementById('viewLive').classList.remove('hidden');
        document.getElementById('viewPaste').classList.add('hidden');
    });
    document.getElementById('tabPaste').addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.getElementById('tabPaste').classList.add('active');
        document.getElementById('viewLive').classList.add('hidden');
        document.getElementById('viewPaste').classList.remove('hidden');
    });

    // Inspect button
    document.getElementById('toggleInspect').addEventListener('click', startElementPicker);

    // Clear button
    document.getElementById('clearBtn').addEventListener('click', clearLocators);

    // Listen for element selection changes in Elements panel
    chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
        extractLocatorsFromSelectedElement();
    });

    // Copy buttons
    setupCopyButtons();

    // Language tabs
    const langBtns = document.querySelectorAll('.lang-btn');
    langBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            langBtns.forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            updateCodeBlock();
        });
    });

    // Wait for toggle
    document.getElementById('addWaitFor').addEventListener('change', updateCodeBlock);

    document.getElementById('processPasteBtn').addEventListener('click', processPastedDOM);

    // AI Listeners
    document.getElementById('generateAIHero').addEventListener('click', processAIRequest);

    document.getElementById('settingsBtn').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.remove('hidden');
        chrome.storage.local.get(['openaiApiKey'], (result) => {
            if (result.openaiApiKey) {
                document.getElementById('apiKeyInput').value = result.openaiApiKey;
            }
        });
    });
    document.getElementById('closeSettings').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.add('hidden');
    });
    document.getElementById('saveSettings').addEventListener('click', () => {
        const key = document.getElementById('apiKeyInput').value.trim();
        chrome.storage.local.set({ openaiApiKey: key }, () => {
            document.getElementById('settingsModal').classList.add('hidden');
            showToast('Settings saved!');
        });
    });

    // Escape key to cancel picker
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const btn = document.getElementById('toggleInspect');
            if (btn.innerHTML.includes('⏹')) {
                // Picker is active, cancel it
                chrome.devtools.inspectedWindow.eval('if(window.__pwPickerCleanup) window.__pwPickerCleanup();');
                btn.innerHTML = '<span>🎯</span> Inspect Page';
                btn.style.backgroundColor = '';
                updateStatus('Picker cancelled');
                stopPolling();
            }
        }
    });
}

function clearLocators() {
    selectedElement = null;
    document.getElementById('elementInfo').classList.add('hidden');
    document.getElementById('sandboxWrapper').classList.add('hidden');
    document.getElementById('sandboxContent').innerHTML = '';

    // Clear Paste DOM area too
    const pasteArea = document.getElementById('domPasteArea');
    if (pasteArea) pasteArea.value = '';

    // Cleanup picker if it was running
    stopPolling();
    chrome.devtools.inspectedWindow.eval('if(window.__pwPickerCleanup) window.__pwPickerCleanup();');
    document.getElementById('toggleInspect').innerHTML = '<span>🎯</span> Inspect Page';

    updateStatus('Cleared. Ready for new element.');
}

function getDepth(el, root) {
    let depth = 0;
    let curr = el;
    while (curr && curr !== root) {
        curr = curr.parentElement;
        depth++;
    }
    return depth;
}

function processPastedDOM() {
    const html = document.getElementById('domPasteArea').value;
    if (!html.trim()) {
        updateStatus('Please paste some HTML first');
        return;
    }

    const sandbox = document.getElementById('sandboxContent');
    const wrapper = document.getElementById('sandboxWrapper');

    // Clear and render
    sandbox.innerHTML = html;
    sandbox.classList.remove('ag-grid-detected'); // Reset
    wrapper.classList.remove('hidden');

    // ag-Grid Detection Logic
    const isAgGrid = (el) => {
        if (!el || el.nodeType !== 1) return false;
        const classes = el.className || "";
        const role = el.getAttribute('role');
        const gridId = el.getAttribute('grid-id');

        return (
            (typeof classes === 'string' && classes.includes('ag-root')) ||
            (role === 'presentation' && gridId) ||
            (role === 'grid')
        );
    };

    // Check top-level and all elements for ag-Grid signature
    const hasGrid = Array.from(sandbox.querySelectorAll('*')).some(isAgGrid) || isAgGrid(sandbox.firstElementChild);
    if (hasGrid) {
        sandbox.classList.add('ag-grid-detected');
        updateStatus('ag-Grid snippet detected! Applying grid layout.');
    } else {
        updateStatus('UI Rendered. Click any element in the preview to inspect.');
    }

    // Inject Interactivity
    const allElements = sandbox.querySelectorAll('*');
    allElements.forEach(el => {
        const tag = el.tagName.toLowerCase();
        if (tag === 'script' || tag === 'style') {
            el.remove();
            return;
        }

        // Prevent navigation/form submission
        if (tag === 'a' || tag === 'button' || tag === 'form') {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        }

        // Click to Inspect
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            inspectLocalElement(el);
        });

        // Hover feedback handled by CSS (.sandbox-preview *:hover)
    });
}

function inspectLocalElement(el) {
    const sandbox = document.getElementById('sandboxContent');

    // Visual Selection State
    sandbox.querySelectorAll('.selected-element').forEach(s => s.classList.remove('selected-element'));
    el.classList.add('selected-element');

    // Set context for the extractor
    window.__pwContext = sandbox;

    try {
        const data = extractElementData(el);
        selectedElement = data;
        updateUI(data);

        // Scroll results into view
        document.getElementById('elementInfo').scrollIntoView({ behavior: 'smooth', block: 'start' });
        updateStatus(`Inspected: <${data.tag}>`);
    } catch (e) {
        console.error('Local inspection failed:', e);
        updateStatus('Failed to inspect local element');
    } finally {
        delete window.__pwContext;
    }
}

function startElementPicker() {
    const btn = document.getElementById('toggleInspect');
    if (btn.disabled) return;
    btn.disabled = true;

    // Get simplified picker code from global helper and APPEND extraction functions
    // This allows the element to be stringified INSIDE its own frame (crucial for iframes)
    const baseCode = window.PickerScripts ? window.PickerScripts.getSimplifiedPickerCode() : getSimplifiedPickerCodeBackup();
    const pickerCode = getExtractionFunctions() + "\n" + baseCode;

    // Use background service worker to inject into ALL frames (essential for cross-origin iframes)
    const tabId = chrome.devtools.inspectedWindow.tabId;

    chrome.runtime.sendMessage({
        type: 'INJECT_PICKER',
        tabId: tabId,
        code: 'window.__pwIgnoreIframes = true;\n' + pickerCode
    }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
            console.error('Multi-frame injection failed, falling back to main frame only:', chrome.runtime.lastError || response?.error);
            // Fallback to traditional eval (main frame only)
            chrome.devtools.inspectedWindow.eval(pickerCode, (result, error) => {
                handlePickerResult(result, error, btn);
            });
        } else {
            // Background injection succeeded in all frames
            handlePickerResult('started', null, btn);
        }
    });
}

/**
 * Backup picker code only if external script fails to load
 */
function getSimplifiedPickerCodeBackup() {
    return window.PickerScripts && window.PickerScripts.getSimplifiedPickerCode ? window.PickerScripts.getSimplifiedPickerCode() : '';
}

/**
 * Handle picker result with detailed error reporting
 */
function handlePickerResult(result, error, btn) {
    btn.disabled = false;
    if (error) {
        console.error('Picker eval error:', error);
        updateStatus('⚠️ Picker init failed - trying fallback...');

        // Try fallback after a short delay
        setTimeout(() => startFallbackPicker(btn), 500);
        return;
    }

    if (result && result.error) {
        // Error occurred in injected code
        console.error('Picker error:', result.error, 'Type:', result.type);
        updateStatus('❌ Picker failed: ' + result.error);
        btn.innerHTML = '<span>🎯</span> Inspect Page';
        stopPolling();
        return;
    }

    if (result === 'started') {
        updateStatus('✓ Click element to inspect (Esc to cancel)');
        btn.innerHTML = '<span>⏹</span> Cancel';
        btn.style.backgroundColor = '#dc2626';
        startPolling();
    } else if (result === 'cancelled') {
        btn.innerHTML = '<span>🎯</span> Inspect Page';
        btn.style.backgroundColor = '';
        updateStatus('Picker cancelled');
        stopPolling();
    } else {
        console.warn('Unexpected picker result:', result);
        updateStatus('Picker returned unexpected state');
    }
}

/**
 * Fallback picker when main picker fails
 */
function startFallbackPicker(btn) {
    console.log('Starting fallback picker mechanism...');

    const fallbackCode = `
        (function() {
            try {
                // Try alternate initialization without eval context issues
                if (window.__pwPickerActive) return 'already-active';
                
                // Simple marker to indicate picker is attempting to run
                window.__pwFallbackMode = true;
                window.__pwPickerActive = true;
                
                // Return status
                return 'fallback-started';
            } catch(e) {
                return { error: 'Fallback init: ' + e.message };
            }
        })();
    `;

    chrome.devtools.inspectedWindow.eval(fallbackCode, (result, error) => {
        if (error || (result && result.error)) {
            console.error('Fallback failed:', error || result.error);
            updateStatus('Element picker unavailable on this page');
            showPickerUnavailableUI(btn);
            return;
        }

        if (result === 'fallback-started') {
            updateStatus('Fallback mode: Use DevTools Elements panel');
            btn.innerHTML = '<span>ℹ️</span> Use DevTools';
            btn.disabled = true;
            btn.style.opacity = '0.6';
        }
    });
}

/**
 * Show alternatives when picker unavailable
 */
function showPickerUnavailableUI(btn) {
    btn.innerHTML = '<span>⚠️</span> Picker Unavailable';
    btn.style.opacity = '0.6';
    btn.disabled = true;

    // Log help text to console
    console.group('%cPlaywright Locator Inspector', 'color: #6366f1; font-weight: bold; font-size: 12px');
    console.log('%cPicker unavailable on this page.', 'color: #dc2626');
    console.log('%cAlternatives:', 'color: #f59e0b; font-weight: bold');
    console.log('1. Use DevTools Elements panel (F12) → Right-click any element → "Inspect"');
    console.log('2. Paste HTML in "Paste DOM" tab → Click elements in preview');
    console.log('3. Generate locators manually using the panel');
    console.groupEnd();

    // Show help in panel status
    updateStatus('Use DevTools Elements panel to inspect elements');
}

function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(() => {
        const script = `
            (function() {
                try {
                    if (window.__pwSelectedElement) {
                        const el = window.__pwSelectedElement;
                        delete window.__pwSelectedElement;
                        
                        // If it's already an extracted data object (from an iframe selection)
                        if (el.tag && !el.tagName) return el;
                        
                        ` + getExtractionFunctions() + `
                        return extractElementData(el);
                    }
                    return window.__pwPickerActive ? 'active' : 'inactive';
                } catch (e) {
                    return { error: e.message };
                }
            })();
        `;
        chrome.devtools.inspectedWindow.eval(script, (result, error) => {
            if (error) {
                console.error('Eval error:', error);
                return;
            }
            if (result && result.error) {
                updateStatus('Inspection error: ' + result.error);
                stopPolling();
                // Remote cleanup ALL frames
                chrome.runtime.sendMessage({ type: 'CLEANUP_PICKER', tabId: chrome.devtools.inspectedWindow.tabId });
                document.getElementById('toggleInspect').innerHTML = '<span>🎯</span> Inspect Page';
                return;
            }
            if (result && typeof result === 'object' && result.tag) {
                stopPolling();
                document.getElementById('toggleInspect').innerHTML = '<span>🎯</span> Inspect Page';
                selectedElement = result;
                updateUI(result);
                updateStatus('Element captured: <' + result.tag + '>');
            } else if (result === 'inactive') {
                stopPolling();
                document.getElementById('toggleInspect').innerHTML = '<span>🎯</span> Inspect Page';
            }
        });
    }, 100);
}

function stopPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = null;
    // Perform multi-frame cleanup
    chrome.runtime.sendMessage({ type: 'CLEANUP_PICKER', tabId: chrome.devtools.inspectedWindow.tabId });
}

function extractLocatorsFromSelectedElement() {
    const script = `
        (function() {
            try {
                const el = $0;
                if (!el) return null;
                ` + getExtractionFunctions() + `
                return extractElementData(el);
            } catch (e) {
                return { error: e.message };
            }
        })();
    `;
    chrome.devtools.inspectedWindow.eval(script, (result, error) => {
        if (error) {
            console.error('Eval error:', error);
            return;
        }
        if (result && result.error) {
            updateStatus('Selection error: ' + result.error);
            return;
        }
        if (result && result.tag) {
            selectedElement = result;
            updateUI(result);
            updateStatus('Element selected: <' + result.tag + '>');
        }
    });
}

function getExtractionFunctions() {
    const functions = [
        extractElementData,
        isUnique,
        isDynamic,
        getStableText,
        generateGetByRole,
        getImplicitRole,
        generateGetByText,
        generateGetByLabel,
        generateGetByPlaceholder,
        generateGetByAltText,
        generateGetByTestId,
        generateCSSSelector,
        generateRelativeXPath,
        generateXPathWithDepth,
        getXPathSegment,
        getElementIndex,
        findUniqueAnchorTextInContainer,
        findNearestPrecedingUniqueText,
        isTextUnique,
        getGlobalIndex,
        escapeXPathText,
        getPaddedXPathSegment,
        isGenericTag,
        isWeakLocator,
        // Framework detection functions
        detectFrameworkLocators,
        detectFramework,
        detectDevExpressLocators,
        detectAGGridLocators,
        detectNexusLocators,
        detectFramesAndElements,
        getElementInFrame,
        generateFrameworkCode,
        generateDevExpressCode,
        generateAGGridCode,
        generateNexusCode,
        getElementXPathIndex
    ];
    return functions.map(f => f.toString()).join('\n');
}

function extractElementData(element) {
    let xpath = generateRelativeXPath(element);

    // CRITICAL: Final uniqueness verification
    // If the generated XPath is not unique, force parent context
    if (!isUnique(xpath, 'xpath', element)) {
        // Try adding parent context
        let parent = element.parentElement;
        let attempts = 0;
        while (parent && attempts < 5) {
            const parentSeg = getXPathSegment(parent, true);
            const targetSeg = getXPathSegment(element, true);
            const newXpath = "//" + parentSeg + "//" + targetSeg;

            if (isUnique(newXpath, 'xpath', element)) {
                xpath = newXpath;
                break;
            }

            parent = parent.parentElement;
            attempts++;
        }

        // FINAL RESORT: Force Uniqueness with Safe Inline Fallback
        // This ensures checking against the actual match count without relying on external helpers
        const doc = element.ownerDocument || document;
        const context = window.__pwContext || doc;
        const xpStr = (window.__pwContext && xpath.startsWith('//')) ? '.' + xpath : xpath;
        try {
            const res = doc.evaluate(xpStr, context, null, 7, null);
            if (res.snapshotLength > 1) {
                // Find distinct index among matches
                for (let i = 0; i < res.snapshotLength; i++) {
                    if (res.snapshotItem(i) === element) {
                        xpath = '(' + xpath + ')[' + (i + 1) + ']';
                        break;
                    }
                }
            }
        } catch (e) { console.error('XPath Fallback Error', e); }
    }

    // Framework-specific detection
    let frameworkLocators = {};
    try {
        frameworkLocators = detectFrameworkLocators(element);
    } catch (e) {
        console.warn('Framework detection failed:', e);
    }

    // Check for frame context
    let frameInfo = null;
    if (element.__pwFrameContext || (element.ownerDocument !== document)) {
        const frame = element.__pwFrameContext || Array.from(document.querySelectorAll('iframe')).find(f => f.contentDocument === element.ownerDocument);
        if (frame) {
            frameInfo = {
                id: frame.id,
                name: frame.name,
                selector: generateCSSSelector(frame)
            };
        }
    }

    const data = {
        tag: element.tagName.toLowerCase(),
        id: element.id || '',
        getByRole: generateGetByRole(element),
        getByText: generateGetByText(element),
        getByLabel: generateGetByLabel(element),
        getByPlaceholder: generateGetByPlaceholder(element),
        getByAltText: generateGetByAltText(element),
        getByTestId: generateGetByTestId(element),
        inputType: element.type || '',
        cssSelector: generateCSSSelector(element),
        xpath: xpath,
        outerHTML: element.outerHTML.substring(0, 3000), // Cap it for AI
        framework: frameworkLocators.framework,
        devExpress: frameworkLocators.devExpress,
        agGrid: frameworkLocators.agGrid,
        nexus: frameworkLocators.nexus,
        frame: frameInfo
    };
    return data;
}

function isUnique(selector, type, el) {
    try {
        // Get the correct document context
        const doc = el ? (el.ownerDocument || document) : document;

        if (type === 'css') {
            // For CSS, use the sandbox context if available
            const context = window.__pwContext || doc;
            return context.querySelectorAll(selector).length === 1;
        }

        if (type === 'xpath') {
            // For XPath, always evaluate from document root for global paths
            // This ensures we count ALL matching elements, not just in a subset
            const context = window.__pwContext || doc;

            // If we have a sandbox context and the XPath is global, make it relative
            const xp = (window.__pwContext && selector.startsWith('//')) ? '.' + selector : selector;

            const result = doc.evaluate(xp, context, null, 7, null);
            return result.snapshotLength === 1;
        }

        return false;
    } catch (e) { return false; }
}

function getElementXPathIndex(selector, el) {
    try {
        const doc = el.ownerDocument || document;
        const context = window.__pwContext || doc;
        const xp = (window.__pwContext && selector.startsWith('//')) ? '.' + selector : selector;
        const res = doc.evaluate(xp, context, null, 7, null);
        for (let i = 0; i < res.snapshotLength; i++) {
            if (res.snapshotItem(i) === el) return i + 1;
        }
    } catch (e) { }
    return 1;
}

function getStableText(text) {
    if (!text || typeof text !== 'string') return null;

    // 1. First check if it's a known framework/ID pattern (those are usually not salvageable)
    const frameworkPatterns = [/[a-f0-9]{8,}/i, /^(ember|ng-|jss|css-|_-|sc-|Mui|v-|dx-|ag-)/i];
    if (frameworkPatterns.some(p => p.test(text))) return null;

    // 2. Search for dynamic patterns and remove them
    const dynamicPatterns = [
        /[0-9]{5,}/,
        /^[0-9]+$/,
        /[a-f0-9]{8,}/i,
        /^(ember|ng-|jss|css-|_-|sc-|Mui|v-|dx-|ag-)/i,
        /(_ngcontent|_nghost)/,
        /^[a-z]-[0-9]+$/i,
        /[_-][a-z0-9]{5,}$/i,
        /\[#[a-f0-9]{6}\]/i,
        /\.[0-9]{1,}/,
        /[0-9]{5,}/g,                       // Long numeric sequences
        /^[0-9]+$/g,                        // Purely numeric
        /[a-f0-9]{8,}/gi,                   // GUID-like hex strings
        /^(ember|ng-|jss|css-|_-|sc-|Mui|v-|dx-|ag-)/gi, // Framework prefixes
        /(_ngcontent|_nghost)/g,            // Angular internal
        /^[a-z]-[0-9]+$/gi,                 // Simple dynamic IDs
        /[_-][a-z0-9]{5,}$/gi,              // Common random suffixes
        /\[#[a-f0-9]{6}\]/gi,                // Tailwind
        /\.[0-9]{1,}/g,                     // Fractional numbers
        // --- EXPERT PATTERNS ---
        /[0-9]+(\.[0-9]+)?(\s*)?[KMBkmb](\+)?(\s|$)/gi, // Metrics
        /[0-9]+(\.[0-9]+)?%/g,               // Percentages
        /[\$\£\€\¥\₹]\s?[0-9]/g,             // Prices (Symbol first)
        /[0-9]\s?[\$\£\€\¥\₹]/g,             // Prices (Symbol last)
        /\b(ago|today|yesterday|tomorrow)\b/gi, // Relative time
        /[0-9]+\s+(min|hour|day|week|month|year)/gi, // Time periods
        /[0-9]{1,2}:[0-9]{2}/g,              // Timestamps
        /\b[0-9]{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/gi, // Dates
        /\b(19|20)[0-9]{2}\b/g,                // Years
        /[0-9]+/g                              // Any remaining digits
    ];

    let currentText = text.replace(/\s+/g, ' ').trim();
    const delimiter = '|||SEP|||';

    // Create a version with all dynamic parts replaced by delimiters
    let delimited = currentText;
    dynamicPatterns.forEach(p => {
        // Use global regex to catch all instances
        const regex = p.global ? p : new RegExp(p.source, p.flags + 'g');
        delimited = delimited.replace(regex, delimiter);
    });

    // Split by delimiter and filter for stable chunks
    const chunks = delimited.split(delimiter)
        .map(c => c.trim())
        .filter(c => {
            if (!c || c.length < 3) return false;
            // Additional check: must not be just punctuation or short prepositions
            if (/^[.,!?;:()\[\]{}]+$/.test(c)) return false;
            return true;
        });

    if (chunks.length === 0) return null;

    // Pick the best segment:
    // 1. If the first segment is decent length (> 5), use it (contextual anchor)
    // 2. Otherwise pick the longest segment
    let best = chunks[0];
    if (best.length < 6) {
        chunks.forEach(c => {
            if (c.length > best.length) best = c;
        });
    }

    // Post-processing on the chosen segment
    let stable = best.replace(/[\?\.\!\,]+$/, '').trim();
    stable = stable.replace(/\b(in|at|on|for|with|by|to|of|and|the|a|an)$/i, '').trim();

    // Final verify: must be significant and contain letters
    if (stable.length >= 4 && /[a-zA-Z]/.test(stable)) return stable;
    return null;
}

function isDynamic(val) {
    if (!val || typeof val !== 'string') return false;

    // Regular stable words bypass
    const stableWords = ['button', 'input', 'select', 'modal', 'dialog', 'header', 'footer', 'submit', 'cancel', 'save', 'close'];
    if (stableWords.includes(val.toLowerCase())) return false;

    // Expert change: If it has ANY digits or matches expert patterns, consider it dynamic for exact matching
    if (/\d/.test(val)) return true;

    const dynamicPatterns = [
        /[0-9]{5,}/,                       // Long numeric sequences
        /^[0-9]+$/,                        // Purely numeric
        /[a-f0-9]{8,}/i,                   // GUID-like hex strings
        /^(ember|ng-|jss|css-|_-|sc-|Mui|v-|dx-|ag-)/i, // Framework prefixes
        /(_ngcontent|_nghost)/,            // Angular internal
        /^[a-z]-[0-9]+$/i,                 // Simple dynamic IDs
        /[_-][a-z0-9]{5,}$/i,              // Common random suffixes
        /\[#[a-f0-9]{6}\]/i                 // Tailwind
    ];

    return dynamicPatterns.some(p => p.test(val));
}

function isGenericTag(tag) {
    const genericTags = ['div', 'span', 'p', 'a', 'i', 'b', 'svg', 'path', 'section', 'article', 'li', 'ul', 'ol', 'nav', 'header', 'footer', 'main', 'aside', 'details', 'summary'];
    return genericTags.includes(tag.toLowerCase());
}

function isWeakLocator(selector, type, el) {
    if (!selector) return true;

    // If it has a stable attribute (id, testid, etc), it's not weak
    if (selector.includes('[@id=') || selector.includes('[data-testid=') || selector.includes('[name=') || selector.includes('[role=') || selector.includes('[@role=')) {
        return false;
    }

    if (type === 'xpath') {
        // Weak if it's just //tag or //tag[index]
        return /^\/\/[a-z]+(\[([0-9]+|normalize-space\(\.\)=.*)\])?$/i.test(selector);
    }

    if (type === 'css') {
        // Weak if it's just tag or tag:nth-of-type(n)
        return /^[a-z]+(:nth-of-type\([0-9]+\))?$/i.test(selector);
    }

    return false;
}

function generateGetByRole(el) {
    const role = el.getAttribute('role') || getImplicitRole(el);
    if (!role) return null;

    const name = el.textContent?.trim() || el.getAttribute('aria-label') || el.getAttribute('title') || el.value || '';
    const cleanName = name.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();

    if (cleanName && cleanName.length < 50) {
        return role + '|' + cleanName;
    }
    return role;
}

function getImplicitRole(el) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'button') return 'button';
    if (tag === 'a' && el.href) return 'link';
    if (tag === 'input') {
        if (['button', 'submit'].includes(el.type)) return 'button';
        if (el.type === 'checkbox') return 'checkbox';
        if (el.type === 'radio') return 'radio';
        return 'textbox';
    }
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) return 'heading';
    return null;
}

function generateGetByText(el) {
    const text = el.textContent?.trim();
    if (text && text.length > 0 && text.length < 60 && !isDynamic(text)) return text;
    return null;
}

function generateGetByLabel(el) {
    const context = window.__pwContext || document;
    if (el.id) {
        try {
            const escapedId = (window.CSS && CSS.escape) ? CSS.escape(el.id) : el.id.replace(/([#;?%&,.+*~\':"!^$[\]()=>|/@])/g, '\\$1');
            const label = context.querySelector('label[for="' + escapedId + '"]');
            if (label) return label.textContent.trim();
        } catch (e) { }
    }
    return el.getAttribute('aria-label') || null;
}

function generateGetByPlaceholder(el) { return el.getAttribute('placeholder'); }
function generateGetByAltText(el) { return el.getAttribute('alt'); }
function generateGetByTestId(el) {
    return el.getAttribute('data-testid') ||
        el.getAttribute('data-nexus-id') ||
        el.getAttribute('data-test-id') ||
        el.getAttribute('test-id') ||
        el.getAttribute('data-automation-id') ||
        el.getAttribute('automation-id') ||
        el.getAttribute('data-cy') ||
        el.getAttribute('data-component');
}

function generateCSSSelector(el) {
    if (el.id && !isDynamic(el.id)) {
        try {
            const escaped = (window.CSS && CSS.escape) ? CSS.escape(el.id) : el.id.replace(/([#;?%&,.+*~\':"!^$[\]()=>|/@])/g, '\\$1');
            const sel = '#' + escaped;
            if (isUnique(sel, 'css')) return sel;
        } catch (e) { }
    }
    let path = [];
    let curr = el;
    while (curr && curr.nodeType === Node.ELEMENT_NODE) {
        let segment = curr.tagName.toLowerCase();
        if (curr.id && !isDynamic(curr.id)) {
            try {
                const escaped = (window.CSS && CSS.escape) ? CSS.escape(curr.id) : curr.id.replace(/([#;?%&,.+*~\':"!^$[\]()=>|/@])/g, '\\$1');
                path.unshift('#' + escaped);
                break;
            } catch (e) { }
        }

        let stableAttr = null;
        const attrs = ['name', 'data-testid', 'data-test-id', 'data-automation-id', 'aria-label'];
        for (const attr of attrs) {
            const val = curr.getAttribute(attr);
            if (val && !isDynamic(val)) {
                const escapedVal = (window.CSS && CSS.escape) ? CSS.escape(val) : val.replace(/([#;?%&,.+*~\':"!^$[\]()=>|/@])/g, '\\$1');
                stableAttr = '[' + attr + '="' + escapedVal + '"]';
                break;
            }
        }

        path.unshift(segment + (stableAttr || ''));
        if (isUnique(path.join(' > '), 'css')) break;
        curr = curr.parentNode;
    }
    let fullSelector = path.join(' > ');
    if (isUnique(fullSelector, 'css') && !isWeakLocator(fullSelector, 'css', el)) return fullSelector;

    // Fallback: If not unique OR weak, add parent context or nth-of-type
    curr = el;
    let fallback = null;
    for (let i = path.length - 1; i >= 0; i--) {
        const index = getElementIndex(curr);
        // Add index to specific segment
        path[i] += `:nth-of-type(${index})`;

        fullSelector = path.join(' > ');
        if (isUnique(fullSelector, 'css')) {
            if (!isWeakLocator(fullSelector, 'css', el)) return fullSelector;
            if (!fallback) fallback = fullSelector;
        }

        curr = curr.parentNode;
        if (!curr || curr.nodeType !== Node.ELEMENT_NODE) break;
    }

    return fallback || fullSelector;
}

function escapeXPathText(text) {
    if (!text) return '""';
    if (!text.includes("'")) return "'" + text + "'";
    if (!text.includes('"')) return '"' + text + '"';
    return 'concat("' + text.split('"').join('", \'"\', "') + '")';
}

function generateRelativeXPath(el) {
    // Two-Pass Strategy: Fast Pass first, then Deep Pass if needed
    const fastResult = generateXPathWithDepth(el, 10, false);
    if (isUnique(fastResult, 'xpath', el)) return fastResult;

    // Deep Pass: More thorough search for complex repeating structures
    return generateXPathWithDepth(el, 30, true);
}

function generateXPathWithDepth(el, maxDepth, deepMode) {
    const tag = el.tagName.toLowerCase();
    const text = el.textContent?.trim();

    // Priority 1: Stable ID on the element itself
    if (el.id && !isDynamic(el.id)) {
        const xp = '//*[@id="' + el.id + '"]';
        if (isUnique(xp, 'xpath', el)) return xp;
    }

    // Priority 2: Unique Text on element itself
    if (text && text.length > 0 && text.length < 50) {
        const stable = getStableText(text);
        if (stable) {
            const escaped = escapeXPathText(stable);
            const xpBase = "//" + tag + "[contains(normalize-space(.), " + escaped + ")]";
            if (isUnique(xpBase, 'xpath', el)) return xpBase;

            // Disambiguate if needed
            const idx = getElementXPathIndex(xpBase, el);
            const indexedXp = `(${xpBase})[${idx}]`;
            if (isUnique(indexedXp, 'xpath', el)) return indexedXp;
        } else if (!isDynamic(text)) {
            const escaped = escapeXPathText(text);
            const xp = "//" + tag + "[normalize-space(.)=" + escaped + "]";
            if (isUnique(xp, 'xpath', el)) return xp;
        }
    }

    // Priority 3: Parent Anchoring & Path Building
    let current = el;
    let path = [];
    let depth = 0;
    const candidateLimit = deepMode ? 15 : 5;

    while (current && current.nodeType === 1 && depth < maxDepth) {
        // Use text-enriched segment for the target element itself
        const segment = (current === el) ? getPaddedXPathSegment(current) : getXPathSegment(current, deepMode);
        path.unshift(segment);

        // Check if current direct path is unique
        const directPath = "//" + path.join("/");
        if (isUnique(directPath, 'xpath', el)) {
            // FIX for GENERIC TAGS (e.g., <path>, <svg>, <div>):
            // Even if unique, avoid returning a bare locator like "//path" or "//div[2]"
            // unless it has a strong ID or test-id.
            const isGeneric = (current === el) && isGenericTag(el.tagName);
            const hasStrongAttr = el.id || el.getAttribute('data-testid') || el.getAttribute('name');

            if (!isGeneric || hasStrongAttr || path.length > 2) {
                return directPath;
            }
            // If generic and no strong attr, we CONTINUING climbing to find a better anchor
        }

        // New Strategy: Ancestor text anchoring
        let ancestorCursor = current;
        let ancestorDepth = 0;
        while (ancestorCursor.parentElement && ancestorDepth < 3) { // Limit ancestor search depth
            ancestorCursor = ancestorCursor.parentElement;
            ancestorDepth++;
            const tagName = ancestorCursor.tagName.toLowerCase();
            if (tagName === 'body' || tagName === 'html') break;

            let ancestorText = ancestorCursor.textContent?.trim();
            if (ancestorText) {
                const stable = getStableText(ancestorText);
                if (stable) {
                    const escaped = escapeXPathText(stable);
                    let containerSeg;
                    if (stable === ancestorText.replace(/\s+/g, ' ').trim()) {
                        containerSeg = tagName + "[normalize-space(.)=" + escaped + "]";
                    } else {
                        containerSeg = tagName + "[contains(normalize-space(.), " + escaped + ")]";
                    }

                    // Build path from ancestor to target element
                    let relativePathFromAncestor = [];
                    let tempEl = el;
                    while (tempEl && tempEl !== ancestorCursor) {
                        relativePathFromAncestor.unshift(getXPathSegment(tempEl, deepMode));
                        tempEl = tempEl.parentElement;
                    }

                    const testXp = "//" + containerSeg + (relativePathFromAncestor.length ? "//" + relativePathFromAncestor.join('//') : "");
                    if (isUnique(testXp, 'xpath', el)) return testXp;
                }
            }
        }

        // Strategy A: Deep-jump from stable ancestors using descendant axis
        const isAnchor = (current.id && !isDynamic(current.id)) ||
            (current.getAttribute('data-testid') && !isDynamic(current.getAttribute('data-testid'))) ||
            (current.getAttribute('name') && !isDynamic(current.getAttribute('name')));

        if (isAnchor) {
            const anchorSegment = getXPathSegment(current, deepMode);
            const relPath = path.length > 1 ? path.slice(1).join('//') : "";
            const deepXp = '//' + anchorSegment + (relPath ? "//" + relPath : "");
            if (isUnique(deepXp, 'xpath', el)) return deepXp;
        }

        // Strategy B: Unique Text Anchor in container using ancestor axis
        const anchorText = findUniqueAnchorTextInContainer(current);
        if (anchorText) {
            const escapedAnchor = escapeXPathText(anchorText);
            const targetSeg = getPaddedXPathSegment(el);
            const anchoredXp = "//*[normalize-space(.)=" + escapedAnchor + "]/ancestor::" + current.tagName.toLowerCase() + "[1]//" + targetSeg;
            if (isUnique(anchoredXp, 'xpath', el)) return anchoredXp;
        }

        // Strategy C: Semantic Parent Anchoring (Headers, Labels)
        if (current.childElementCount < 50) {
            const semanticSelectors = 'h1, h2, h3, h4, h5, h6, label, .title, .header, .name';
            const anchors = Array.from(current.querySelectorAll(semanticSelectors)).filter(a => a !== el);

            for (const anchor of anchors) {
                const txt = anchor.textContent?.trim();
                if (txt && txt.length > 2 && txt.length < 60 && !isDynamic(txt)) {
                    const escaped = escapeXPathText(txt);
                    const anchorTag = anchor.tagName.toLowerCase();
                    const containerTag = current.tagName.toLowerCase();
                    const targetTag = el.tagName.toLowerCase();

                    // Try exact match within anchor tag first
                    const anchoredXp = `//${containerTag}[.//${anchorTag}[normalize-space(.)=${escaped}]]//${targetTag}`;
                    if (isUnique(anchoredXp, 'xpath', el)) return anchoredXp;
                }
            }
        }


        current = current.parentElement;
        depth++;

        // If we found a unique path but it's "weak" (just tags), 
        // we keep climbing to find a "strong" anchor (with ID or Class)
        const currentPath = "//" + path.join("/");
        if (isUnique(currentPath, 'xpath', el)) {
            if (!isWeakLocator(currentPath, 'xpath', el)) return currentPath;
        }
    }

    // Final Fallback: Use all attributes but verify uniqueness
    const fallbackDescriptor = getXPathSegment(el, true);
    const xpBase = '//' + fallbackDescriptor;

    // Only return if unique, otherwise try combining with parent
    if (isUnique(xpBase, 'xpath', el)) return xpBase;

    // Last resort: combine with parent context
    if (el.parentElement) {
        const parentSeg = getXPathSegment(el.parentElement, true);
        const combinedXp = "//" + parentSeg + "/" + fallbackDescriptor;
        if (isUnique(combinedXp, 'xpath', el)) return combinedXp;
    }

    return xpBase;
}

function getXPathSegment(el, forceAllAttrs = false) {
    const tag = el.tagName.toLowerCase();
    let conditions = [];

    // 1. Collect all stable attributes (Core XPath logic) - Prioritized Order
    const attrs = ['data-testid', 'data-nexus-id', 'data-test-id', 'id', 'aria-label', 'name', 'title', 'role', 'placeholder', 'alt', 'type', 'value'];
    for (const attr of attrs) {
        const val = el.getAttribute(attr);
        if (val && !isDynamic(val)) {
            conditions.push("@" + attr + "='" + val + "'");
            if (!forceAllAttrs && conditions.length >= 1) break; // If we have a high-priority attr, stop early
        }
    }

    // If we have attributes, verify they create a unique segment for THIS element
    if (conditions.length > 0) {
        const segment = tag + "[" + conditions.join(" and ") + "]";
        const testXp = "//" + segment;
        // Only return this segment if it uniquely identifies THIS element
        if (isUnique(testXp, 'xpath', el)) {
            return segment;
        }
        // If not unique, try adding more attributes
        if (!forceAllAttrs) {
            return getXPathSegment(el, true); // Force all attributes
        }
        // Even with all attrs it's not unique, continue to text/class
    }

    // 2. Unique text (short)
    const text = el.textContent?.trim();
    if (text && text.length > 0 && text.length < 35) {
        const stable = getStableText(text);
        if (stable) {
            const xpBase = tag + "[contains(normalize-space(.), " + escapeXPathText(stable) + ")]";
            const testXp = "//" + xpBase;
            if (isUnique(testXp, 'xpath', el)) return xpBase;

            // Disambiguate if needed
            const idx = getElementXPathIndex(testXp, el);
            return `(${xpBase})[${idx}]`;
        } else if (!isDynamic(text)) {
            const textSeg = tag + "[normalize-space(.)=" + escapeXPathText(text) + "]";
            const testXp = "//" + textSeg;
            if (isUnique(testXp, 'xpath', el)) return textSeg;
        }
    }

    // 3. Robust Class Matching - Iterate all classes
    if (el.className && typeof el.className === 'string') {
        const classes = el.className.split(/\s+/).filter(c => c && !isDynamic(c));
        for (const cls of classes) {
            const classSeg = tag + "[contains(concat(' ', normalize-space(@class), ' '), ' " + cls + " ')]";
            const testXp = "//" + classSeg;
            if (isUnique(testXp, 'xpath', el)) {
                return classSeg;
            }
        }
    }

    // NO INDEXING FALLBACK. Return tag with all attributes even if not unique
    // The parent climbing will handle making it unique
    if (conditions.length > 0) {
        return tag + "[" + conditions.join(" and ") + "]";
    }

    return tag;
}

function getPaddedXPathSegment(el) {
    let seg = getXPathSegment(el, true);
    // If segment already has text, do nothing
    if (seg.includes('normalize-space') || seg.includes('text()')) return seg;

    // Attempt to append text if available
    const text = el.textContent?.trim();
    if (text && text.length > 0 && text.length < 60 && !isDynamic(text)) {
        const escaped = escapeXPathText(text);
        // Using normalize-space() for robustness
        const textPred = "[normalize-space()=" + escaped + "]";
        return seg + textPred;
    }
    return seg;
}

function getElementIndex(el) {
    let index = 1;
    let sib = el.previousElementSibling;
    while (sib) {
        if (sib.tagName === el.tagName) index++;
        sib = sib.previousElementSibling;
    }
    return index;
}

function findUniqueAnchorTextInContainer(container) {
    // Priority: Explicit titles, labels, or content markers, NOW INCLUDING Paragraphs (p)
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6, b, strong, label, p, span, .title, .name, .poll-question-title__content, .content, .header, .label');
    for (const h of headings) {
        const txt = h.textContent?.trim();
        if (txt && txt.length > 3 && txt.length < 100 && !isDynamic(txt)) {
            if (isTextUnique(txt, container)) return txt;
        }
    }
    // Fallback: Use tree walker for any unique text
    const context = container.ownerDocument || document;
    const walker = context.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, null, false);
    let n;
    while (n = walker.nextNode()) {
        const txt = n.textContent?.trim();
        if (txt && txt.length > 3 && txt.length < 100 && !isDynamic(txt)) {
            if (isTextUnique(txt, container)) return txt;
        }
    }
    return null;
}

function findNearestPrecedingUniqueText(el) {
    const context = el.ownerDocument || document;
    const selectors = 'h1, h2, h3, h4, h5, h6, b, strong, label, .title, .name, .header, .label, .section-title, .box-title';
    const all = Array.from(context.querySelectorAll(selectors));

    // Reverse search: find the nearest one BEFORE our element
    const preceding = all.filter(h => h.compareDocumentPosition(el) & 4).reverse();

    for (const h of preceding) {
        const txt = h.textContent?.trim();
        const stable = getStableText(txt);
        if (stable) {
            const escaped = escapeXPathText(stable);
            let anchorXp;
            if (stable === txt.replace(/\s+/g, ' ').trim()) {
                anchorXp = "//*[normalize-space(.)=" + escaped + "]";
            } else {
                anchorXp = "//*[contains(normalize-space(.), " + escaped + ")]";
            }

            if (isUnique(anchorXp, 'xpath', h)) {
                return { text: txt, element: h, xpath: anchorXp, stable: stable };
            } else {
                // Try parent-anchored text
                let parent = h.parentElement;
                let levels = 0;
                while (parent && levels < 3) {
                    const seg = getXPathSegment(parent);
                    // Use contains for parent-anchored text as well
                    anchorXp = "//" + seg + "//*[contains(normalize-space(.), " + escaped + ")]";
                    if (isUnique(anchorXp, 'xpath', h)) {
                        return { text: txt, element: h, xpath: anchorXp };
                    }
                    parent = parent.parentElement;
                    levels++;
                }
            }
        }
    }
    return null;
}

function isTextUnique(txt, el) {
    const context = window.__pwContext || (el ? el.ownerDocument : document);
    const doc = el ? el.ownerDocument : document;
    const escaped = escapeXPathText(txt);
    const xp = (context !== doc) ? ".//*[normalize-space()=" + escaped + "]" : "//*[normalize-space()=" + escaped + "]";
    try {
        const snap = doc.evaluate(xp, context, null, 7, null);
        return snap.snapshotLength === 1;
    } catch (e) { return false; }
}

function getGlobalIndex(el) {
    const context = window.__pwContext || el.ownerDocument || document;
    const tag = el.tagName;
    const allElements = context.querySelectorAll(tag);
    for (let i = 0; i < allElements.length; i++) {
        if (allElements[i] === el) return i + 1;
    }
    return 1;
}

function updateUI(data) {
    overrideStrategy = null;
    document.getElementById('elementInfo').classList.remove('hidden');

    const gridBody = document.getElementById('unifiedGridBody');
    gridBody.innerHTML = '';

    const addRow = (method, value, type) => {
        if (!value || value === '-') return;

        // Extract string from objects (Framework locators)
        if (typeof value === 'object') {
            value = value.selector || value.nexus_id || value.dx_id || value.row_selector || JSON.stringify(value);
        }

        const row = document.createElement('div');
        row.className = 'ag-grid-row';
        row.style.minHeight = '44px';
        row.onclick = () => {
            overrideStrategy = { method, value, type };
            updateCodeBlock();
            document.querySelectorAll('#unifiedGridBody .ag-grid-row').forEach(r => r.style.borderLeft = 'none');
            row.style.borderLeft = '4px solid var(--primary)';
        };

        const safeVal = String(value).replace(/"/g, '&quot;');
        row.innerHTML = `
            <div class="ag-grid-cell ag-cell-method" style="color: #1e293b; font-weight: 600;">${method}</div>
            <div class="ag-grid-cell ag-cell-value ag-cell-mono" style="color: #475569;" title="${String(value)}">${String(value)}</div>
            <div class="ag-grid-cell ag-cell-action">
                <button class="copy-btn copy-item-grid" data-val="${safeVal}">📋</button>
            </div>
        `;
        gridBody.appendChild(row);
    };

    // Populate Native Locators
    addRow('getByRole', data.getByRole, 'role');
    addRow('getByText', data.getByText, 'text');
    addRow('getByTestId', data.getByTestId, 'testid');
    addRow('getByLabel', data.getByLabel, 'label');
    addRow('getByPlaceholder', data.getByPlaceholder, 'placeholder');
    addRow('getByAltText', data.getByAltText, 'alt');

    // Populate Traditional
    addRow('css', data.cssSelector, 'css');
    addRow('xpath', data.xpath, 'xpath');

    // Populate Frameworks
    if (data.framework) addRow('Framework', data.framework, 'framework');
    if (data.agGrid) addRow('AG-Grid', data.agGrid, 'aggrid');
    if (data.nexus) addRow('Nexus', data.nexus, 'nexus');

    const best = getBestLocator(data);
    document.getElementById('heroLocatorValue').textContent = best.value;

    updateCodeBlock();

    // Reset AI section
    document.getElementById('aiResults').classList.add('hidden');
    document.getElementById('aiResults').innerHTML = '';



    // Add listeners to new copy buttons
    document.querySelectorAll('.copy-item-grid').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            copyToClipboard(btn.getAttribute('data-val'));
        };
    });
}

function formatLocator(best) {
    const escapeJS = (s) => s.replace(/'/g, "\\'");
    if (best.method === 'getByRole') {
        const parts = best.value.split('|');
        const role = parts[0];
        if (parts.length > 1) {
            return `page.getByRole('${role}', { name: '${escapeJS(parts[1])}' })`;
        }
        return `page.getByRole('${role}')`;
    }
    if (best.method === 'locator') {
        return `page.locator('${escapeJS(best.value)}')`;
    }
    return `page.${best.method}('${escapeJS(best.value)}')`;
}

function getBestLocator(data) {
    if (data.getByTestId) return { method: 'getByTestId', value: data.getByTestId, type: 'testid' };
    if (data.getByRole && data.getByRole.includes('|')) return { method: 'getByRole', value: data.getByRole, type: 'role' };
    if (data.getByLabel) return { method: 'getByLabel', value: data.getByLabel, type: 'label' };
    if (data.getByPlaceholder) return { method: 'getByPlaceholder', value: data.getByPlaceholder, type: 'placeholder' };
    if (data.getByText) return { method: 'getByText', value: data.getByText, type: 'text' };
    return { method: 'locator', value: data.cssSelector, type: 'css' };
}

function updateCodeBlock() {
    if (!selectedElement) return;
    const activeBtn = document.querySelector('.lang-btn.active');
    const lang = activeBtn ? activeBtn.getAttribute('data-lang') : 'python';
    const addWait = document.getElementById('addWaitFor').checked;
    const best = overrideStrategy || getBestLocator(selectedElement);
    const action = getAutoAction(selectedElement);

    let code = '';
    if (lang === 'python') code = generatePythonCode(best, action, addWait);
    else if (lang === 'javascript') code = generateJSCode(best, action, addWait);
    else if (lang === 'java') code = generateJavaCode(best, action, addWait);

    document.getElementById('codeBlock').textContent = code;
}

function getAutoAction(el) {
    const tag = el.tag;
    const type = el.inputType;
    if (tag === 'select') return 'selectOption';
    if (tag === 'textarea') return 'fill';
    if (tag === 'input') {
        if (['checkbox', 'radio'].includes(type)) return 'check';
        return 'fill';
    }
    return 'click';
}

function generatePythonCode(best, action, addWait) {
    const { method, value } = best;
    const act = getActionStr('python', action);
    const esc = (s) => s.replace(/"/g, '\\"');
    let locatorStr = "";

    // Handle frame context
    let prefix = "page";
    if (selectedElement && selectedElement.frame) {
        prefix = `page.frame_locator("${esc(selectedElement.frame.selector)}")`;
    }

    if (method === 'locator') locatorStr = `${prefix}.locator("${esc(value)}")`;
    else if (method === 'getByRole') {
        const parts = value.split('|');
        if (parts.length > 1) locatorStr = `${prefix}.get_by_role("${parts[0]}", name="${esc(parts[1])}")`;
        else locatorStr = `${prefix}.get_by_role("${parts[0]}")`;
    } else {
        const pyMethod = method.replace(/([A-Z])/g, "_$1").toLowerCase();
        locatorStr = `${prefix}.${pyMethod}("${esc(value)}")`;
    }

    if (addWait) return `${locatorStr}.wait_for()\n${locatorStr}${act}`;
    return `${locatorStr}${act}`;
}

function generateJSCode(best, action, addWait) {
    const { method, value } = best;
    const act = getActionStr('js', action);
    const esc = (s) => s.replace(/'/g, "\\'");
    let locatorStr = "";

    // Handle frame context
    let prefix = "page";
    if (selectedElement && selectedElement.frame) {
        prefix = `page.frameLocator('${esc(selectedElement.frame.selector)}')`;
    }

    if (method === 'locator') locatorStr = `${prefix}.locator('${esc(value)}')`;
    else if (method === 'getByRole') {
        const parts = value.split('|');
        if (parts.length > 1) locatorStr = `${prefix}.getByRole('${parts[0]}', { name: '${esc(parts[1])}' })`;
        else locatorStr = `${prefix}.getByRole('${parts[0]}')`;
    } else {
        locatorStr = `${prefix}.${method}('${esc(value)}')`;
    }

    if (addWait) return `await ${locatorStr}.waitFor();\nawait ${locatorStr}${act};`;
    return `await ${locatorStr}${act};`;
}

function generateJavaCode(best, action, addWait) {
    const { method, value } = best;
    const act = getActionStr('java', action) + ';';
    const esc = (s) => s.replace(/"/g, '\\"');
    let locatorStr = "";
    if (method === 'locator') locatorStr = `page.locator("${esc(value)}")`;
    else if (method === 'getByRole') {
        const parts = value.split('|');
        const roleConst = parts[0].toUpperCase().replace(/-/g, '_');
        if (parts.length > 1) locatorStr = `page.getByRole(AriaRole.${roleConst}, new Page.GetByRoleOptions().setName("${esc(parts[1])}"))`;
        else locatorStr = `page.getByRole(AriaRole.${roleConst})`;
    } else {
        locatorStr = `page.${method}("${esc(value)}")`;
    }

    if (addWait) return `${locatorStr}.waitFor();\n${locatorStr}${act}`;
    return `${locatorStr}${act}`;
}

function getActionStr(lang, action) {
    if (action === 'click') return '.click()';
    if (action === 'check') return '.check()';
    if (action === 'fill') return '.fill("value")';
    if (action === 'selectOption') return '.selectOption("value")';
    return '.click()';
}

function setupCopyButtons() {
    const selectorMap = {
        'getByRole': { type: 'role', method: 'getByRole' },
        'getByText': { type: 'text', method: 'getByText' },
        'getByLabel': { type: 'label', method: 'getByLabel' },
        'getByPlaceholder': { type: 'placeholder', method: 'getByPlaceholder' },
        'getByTestId': { type: 'testid', method: 'getByTestId' },
        'cssLocator': { type: 'css', method: 'locator' },
        'xpathLocator': { type: 'xpath', method: 'locator' }
    };

    document.querySelectorAll('.copy-item').forEach(btn => {
        btn.onclick = () => {
            if (!selectedElement) return;
            const id = btn.getAttribute('data-id');
            const cfg = selectorMap[id];
            const val = selectedElement[id === 'cssLocator' ? 'cssSelector' : (id === 'xpathLocator' ? 'xpath' : id)];

            if (val && val !== '-') {
                copyToClipboard(val);
                showToast('Copied locator!');
                overrideStrategy = { type: cfg.type, method: cfg.method, value: val };
                updateCodeBlock();
            }
        };
    });

    document.getElementById('copyHero').onclick = function () {
        if (!selectedElement) return;
        const best = overrideStrategy || getBestLocator(selectedElement);
        const code = formatLocator(best);
        copyToClipboard(code);
        showToast('Copied recommended locator!');
    };

    document.getElementById('codeBlock').onclick = function () {
        const text = this.textContent;
        if (text && !text.startsWith('//')) {
            copyToClipboard(text);
            showToast('Code snippet copied!');
        }
    };
}

function copyToClipboard(text) {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
}

function showToast(msg) {
    const toast = document.getElementById('copyToast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

function updateStatus(text) {
    document.getElementById('statusText').textContent = text;
}

// AI Core Logic
// AI Core Logic
async function processAIRequest() {
    if (!selectedElement) {
        updateStatus('Select an element first');
        return;
    }

    const { openaiApiKey } = await chrome.storage.local.get(['openaiApiKey']);
    if (!openaiApiKey) {
        document.getElementById('settingsModal').classList.remove('hidden');
        updateStatus('OpenAI API Key required');
        return;
    }

    const aiTrigger = document.getElementById('generateAIHero');
    const aiResults = document.getElementById('aiResults');

    const oldText = aiTrigger.innerHTML;
    aiTrigger.innerHTML = '🤖 Thinking...';
    aiTrigger.style.opacity = '0.7';
    aiTrigger.style.pointerEvents = 'none';

    try {
        if (!window.AIService) throw new Error('AIService not loaded');

        const recommendations = await window.AIService.generateLocators(selectedElement, openaiApiKey);
        renderAIResults(recommendations);
        aiResults.classList.remove('hidden');
        updateStatus('AI locators generated!');
    } catch (e) {
        console.error('AI Processing failed:', e);
        updateStatus('AI generation failed: ' + e.message);
    } finally {
        aiTrigger.innerHTML = oldText;
        aiTrigger.style.opacity = '1';
        aiTrigger.style.pointerEvents = 'auto';
    }
}
// callOpenAI removed as it is now in ai-service.js

function renderAIResults(recommendations) {
    const container = document.getElementById('aiResults');
    container.innerHTML = `
        <div class="section-box" style="border-color: #ddd6fe; background: #fbfaff;">
            <div class="section-title" style="background: #f5f3ff; color: #7c3aed;">
                AI ASSISTANT
                <span style="font-size: 8px; background: #ddd6fe; color: #7c3aed; padding: 2px 6px; border-radius: 4px;">POWERED BY GPT-4O</span>
            </div>
            <div id="aiList"></div>
        </div>
    `;
    const list = container.querySelector('#aiList');

    recommendations.forEach((rec) => {
        // Determine action based on element type
        let actionMethod = '.click()';
        if (selectedElement) {
            const act = getAutoAction(selectedElement);
            actionMethod = getActionStr('js', act); // Reusing existing helper to get .click(), .fill(), etc.
        }

        // Append action to locator
        const finalLocator = rec.locator + actionMethod;

        const row = document.createElement('div');
        row.className = 'locator-row';
        // Use flexbox layout to prevent overlap
        row.style.display = 'flex';
        row.style.flexDirection = 'column';
        row.style.gap = '4px';
        row.style.alignItems = 'flex-start';
        row.style.padding = '8px';
        row.style.borderBottom = '1px solid #f0f0f0';

        row.innerHTML = `
            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                <span class="locator-type" title="${rec.reason}" style="font-weight: bold; color: #4b5563;">${rec.name}</span>
                <button class="copy-btn ai-copy-btn" data-copy="${finalLocator}" title="Copy Code">📋</button>
            </div>
            <code class="locator-val" style="font-family: monospace; color: #2563eb; background: #eff6ff; padding: 4px; border-radius: 4px; width: 100%; word-break: break-all;">${finalLocator}</code>
            <div style="font-size: 11px; color: #6b7280; font-style: italic;">${rec.reason}</div>
        `;
        list.appendChild(row);
    });

    container.querySelectorAll('.ai-copy-btn').forEach(btn => {
        btn.onclick = () => {
            const val = btn.getAttribute('data-copy');
            copyToClipboard(val);
            showToast('Copied AI locator!');

            // Try to set manual override if it's a standard format
            if (val.includes("page.getBy")) {
                // Skip for now as AI might return full code snippets
            }
        };
    });
} // Correctly close renderAIResults here.


