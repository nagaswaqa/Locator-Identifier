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
}

function clearLocators() {
    selectedElement = null;
    document.getElementById('elementInfo').classList.add('hidden');
    document.getElementById('sandboxWrapper').classList.add('hidden');
    document.getElementById('sandboxContent').innerHTML = '';

    // Cleanup picker if it was running
    stopPolling();
    chrome.devtools.inspectedWindow.eval('if(window.__pwPickerCleanup) window.__pwPickerCleanup();');
    document.getElementById('toggleInspect').innerHTML = '<span>🎯</span> Inspect Page';

    updateStatus('Cleared. Ready for new element.');
}

function processPastedDOM() {
    const html = document.getElementById('domPasteArea').value;
    if (!html.trim()) {
        updateStatus('Please paste some HTML first');
        return;
    }

    const sandbox = document.getElementById('sandboxContent');
    const wrapper = document.getElementById('sandboxWrapper');

    sandbox.innerHTML = html;
    wrapper.classList.remove('hidden');
    updateStatus('DOM Rendered. Click an element in the preview to inspect.');

    // Add click listeners to all elements in sandbox
    const allElements = sandbox.querySelectorAll('*');
    allElements.forEach(el => {
        el.style.outline = '1px dashed transparent';
        el.onmouseover = (e) => {
            e.stopPropagation();
            el.style.outline = '2px solid var(--primary)';
        };
        el.onmouseout = (e) => {
            el.style.outline = '1px dashed transparent';
        };
        el.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            inspectLocalElement(el);
        };
    });
}

function inspectLocalElement(el) {
    const sandbox = document.getElementById('sandboxContent');
    // Set a global context for the extractor to use
    window.__pwContext = sandbox;

    try {
        const data = extractElementData(el);
        selectedElement = data;
        updateUI(data);
        updateStatus(`Inspected local element: <${data.tag}>`);
    } catch (e) {
        console.error('Local inspection failed:', e);
        updateStatus('Failed to inspect local element');
    } finally {
        delete window.__pwContext;
    }
}

function startElementPicker() {
    const btn = document.getElementById('toggleInspect');

    chrome.devtools.inspectedWindow.eval(`
        (function() {
            // Force cleanup of any old state
            if (window.__pwPickerCleanup) {
                window.__pwPickerCleanup();
                return 'cancelled';
            }
            // Also explicitly remove any lingering highlights
            const oldHighlight = document.getElementById('__pw-highlight');
            if (oldHighlight) oldHighlight.remove();
            
            const highlight = document.createElement('div');
            highlight.id = '__pw-highlight';
            highlight.style.cssText = \`
                position: fixed;
                border: 2px solid #6366f1;
                background: rgba(99, 102, 241, 0.1);
                pointer-events: none;
                display: none;
                z-index: 2147483646;
                box-shadow: 0 0 15px rgba(99, 102, 241, 0.3);
                border-radius: 4px;
                transition: all 0.1s ease-out;
            \`;
            document.body.appendChild(highlight);
            
            let hoveredElement = null;
            
            function getElementAtPoint(x, y) {
                let element = document.elementFromPoint(x, y);
                if (element && element.tagName === 'IFRAME') {
                    try {
                        const rect = element.getBoundingClientRect();
                        const innerElement = element.contentDocument.elementFromPoint(x - rect.left, y - rect.top);
                        if (innerElement) return innerElement;
                    } catch (e) {}
                }
                while (element && element.shadowRoot) {
                    const shadowElement = element.shadowRoot.elementFromPoint(x, y);
                    if (shadowElement) element = shadowElement;
                    else break;
                }
                return element;
            }
            
            function updateHighlight(e) {
                const el = getElementAtPoint(e.clientX, e.clientY);
                if (el === highlight || !el) return;
                
                hoveredElement = el;
                const rect = el.getBoundingClientRect();
                highlight.style.display = 'block';
                highlight.style.top = rect.top + 'px';
                highlight.style.left = rect.left + 'px';
                highlight.style.width = rect.width + 'px';
                highlight.style.height = rect.height + 'px';
            }
            
            function selectElement(e) {
                e.preventDefault();
                e.stopPropagation();
                window.__pwSelectedElement = hoveredElement;
                window.__pwPickerCleanup();
                return 'selected';
            }
            
            window.__pwPickerCleanup = function() {
                document.removeEventListener('mousemove', updateHighlight, true);
                document.removeEventListener('click', selectElement, true);
                document.body.style.cursor = '';
                if (highlight) highlight.remove();
                delete window.__pwPickerCleanup;
                delete window.__pwPickerActive;
            };
            
            document.addEventListener('mousemove', updateHighlight, true);
            document.addEventListener('click', selectElement, true);
            document.body.style.cursor = 'crosshair';
            window.__pwPickerActive = true;
            
            return 'started';
        })();
    `, (result, error) => {
        if (error) {
            updateStatus('Picker failed to start');
            return;
        }
        if (result === 'started') {
            updateStatus('Inspecting... (Click element)');
            btn.innerHTML = '<span>⏹</span> Cancel';
            startPolling();
        } else if (result === 'cancelled') {
            btn.innerHTML = '<span>🎯</span> Inspect Page';
            updateStatus('Picker cancelled');
            stopPolling();
        }
    });
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
                // Remote cleanup
                chrome.devtools.inspectedWindow.eval('if(window.__pwPickerCleanup) window.__pwPickerCleanup();');
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
        getPaddedXPathSegment
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
        outerHTML: element.outerHTML.substring(0, 3000) // Cap it for AI
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
    } catch (e) {
        return false;
    }
}

function isDynamic(val) {
    if (!val) return false;

    // Bypass if it's a stable-looking word (e.g., polling-window)
    // Random suffixes usually contain numbers or have high entropy.
    // If a suffix is all-alpha and short, don't treat it as dynamic.
    const suffixMatch = val.match(/[_-]([a-z0-9]{3,6})$/i);
    if (suffixMatch) {
        const suffix = suffixMatch[1];
        if (!/[0-9]/.test(suffix) && suffix.length < 10) return false;
    }

    const dynamicPatterns = [
        /[0-9]{5,}/,                       // Long numeric sequences
        /^[0-9]+$/,                        // Purely numeric
        /[a-f0-9]{8,}/i,                   // GUID-like hex strings
        /^(ember|ng-|jss|css-|_-|sc-|Mui|v-)/i, // Framework prefixes
        /(_ngcontent|_nghost)/,            // Angular internal attributes
        /^[a-z]-[0-9]+$/i,                 // Simple dynamic IDs
        /[_-][a-z0-9]{5,6}$/i               // Common random suffixes
    ];

    return dynamicPatterns.some(p => p.test(val));
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
    if (text && text.length > 0 && text.length < 60) return text;
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
        el.getAttribute('data-test-id') ||
        el.getAttribute('test-id') ||
        el.getAttribute('data-automation-id') ||
        el.getAttribute('automation-id') ||
        el.getAttribute('data-cy');
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
    if (isUnique(fullSelector, 'css')) return fullSelector;

    // Fallback: If not unique, add nth-of-type indices starting from the target element
    curr = el;
    for (let i = path.length - 1; i >= 0; i--) {
        const index = getElementIndex(curr);
        // Add index to specific segment
        path[i] += `:nth-of-type(${index})`;

        fullSelector = path.join(' > ');
        if (isUnique(fullSelector, 'css')) return fullSelector;

        curr = curr.parentNode;
        if (!curr || curr.nodeType !== Node.ELEMENT_NODE) break;
    }

    return fullSelector;
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
        const escaped = escapeXPathText(text);
        const xp = "//" + tag + "[normalize-space(.)=" + escaped + "]";
        if (isUnique(xp, 'xpath', el)) return xp;
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
        if (isUnique(directPath, 'xpath', el)) return directPath;

        // Strategy D (Moved to Priority 1): Check if the ancestor itself has unique text content
        // This prioritizes descriptive text-based locators (like "Read more" in a paragraph)
        let ancestorText = current.textContent?.trim();
        if (ancestorText) {
            ancestorText = ancestorText.replace(/\s+/g, ' ');
            if (ancestorText.length > 5 && ancestorText.length < 1000) {
                const escaped = escapeXPathText(ancestorText);
                const containerSeg = current.tagName.toLowerCase() + "[contains(normalize-space(.), " + escaped + ")]";

                // Use text-enriched target segment if available
                const targetSeg = getPaddedXPathSegment(el);
                const deepXp = "//" + containerSeg + "//" + targetSeg;
                if (isUnique(deepXp, 'xpath', el)) return deepXp;

                if (path.length > 1) {
                    const directXp = "//" + containerSeg + "/" + path.slice(1).join('/');
                    if (isUnique(directXp, 'xpath', el)) return directXp;
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

        // Strategy C: Parent differentiator using contains() predicate
        if (current.childElementCount < 100) {
            const targets = current.querySelectorAll('h1, h2, h3, h4, h5, h6, b, strong, label, p, span, .title, .name, .price, .sku');
            let checks = 0;
            for (const child of targets) {
                if (checks++ > candidateLimit) break;
                const txt = child.textContent?.trim();
                // Increased length limit for paragraph text support
                if (txt && txt.length > 2 && txt.length < 100) {
                    if (isTextUnique(txt, child)) {
                        const escaped = escapeXPathText(txt);
                        const containerSeg = getXPathSegment(current, deepMode);
                        const targetSeg = getPaddedXPathSegment(el);
                        const xp = "//" + containerSeg + "[contains(normalize-space(.), " + escaped + ")]//" + targetSeg;
                        if (isUnique(xp, 'xpath', el)) return xp;
                    }
                }
            }
        }


        current = current.parentElement;
        depth++;
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

    // 1. Collect all stable attributes (Core XPath logic)
    const attrs = ['id', 'data-testid', 'href', 'src', 'aria-label', 'name', 'title', 'role', 'placeholder', 'alt', 'type', 'value', 'aria-checked'];
    for (const attr of attrs) {
        const val = el.getAttribute(attr);
        if (val && !isDynamic(val)) {
            conditions.push("@" + attr + "='" + val + "'");
            if (!forceAllAttrs && conditions.length >= 2) break;
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
        const textSeg = tag + "[normalize-space(.)=" + escapeXPathText(text) + "]";
        const testXp = "//" + textSeg;
        if (isUnique(testXp, 'xpath', el)) {
            return textSeg;
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
    if (text && text.length > 0 && text.length < 60) {
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
        if (txt && txt.length > 3 && txt.length < 100) {
            if (isTextUnique(txt, container)) return txt;
        }
    }
    // Fallback: Use tree walker for any unique text
    const context = container.ownerDocument || document;
    const walker = context.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, null, false);
    let n;
    while (n = walker.nextNode()) {
        const txt = n.textContent?.trim();
        if (txt && txt.length > 3 && txt.length < 100) {
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
        if (txt && txt.length > 3 && txt.length < 80) {
            const escaped = escapeXPathText(txt);
            let anchorXp = "//*[normalize-space(.)=" + escaped + "]";

            if (isUnique(anchorXp, 'xpath', h)) {
                return { text: txt, element: h, xpath: anchorXp };
            } else {
                // Try parent-anchored text
                let parent = h.parentElement;
                let levels = 0;
                while (parent && levels < 3) {
                    const seg = getXPathSegment(parent);
                    anchorXp = "//" + seg + "//*[normalize-space(.)=" + escaped + "]";
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

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        const row = el?.closest('.locator-row');
        if (el) {
            if (id === 'getByRole' && val && val.includes('|')) {
                el.textContent = val.split('|')[1] + ' (' + val.split('|')[0] + ')';
            } else {
                el.textContent = val || '-';
            }
        }
        if (row) {
            row.style.opacity = val ? '1' : '0.4';
        }
    };

    setVal('getByRole', data.getByRole);
    setVal('getByText', data.getByText);
    setVal('getByLabel', data.getByLabel);
    setVal('getByPlaceholder', data.getByPlaceholder);
    setVal('getByTestId', data.getByTestId);
    setVal('cssLocator', data.cssSelector);
    setVal('xpathLocator', data.xpath);

    const best = getBestLocator(data);
    const heroValue = document.getElementById('heroLocatorValue');
    const codeSnippet = formatLocator(best);

    let displayValue = best.value;
    if (best.method === 'getByRole' && displayValue && displayValue.includes('|')) {
        const parts = displayValue.split('|');
        displayValue = `${parts[0]} "${parts[1]}"`;
    }

    heroValue.textContent = displayValue;

    updateCodeBlock();

    // Reset AI section
    document.getElementById('aiResults').classList.add('hidden');
    document.getElementById('aiResults').innerHTML = '';
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
    if (method === 'locator') locatorStr = `page.locator("${esc(value)}")`;
    else if (method === 'getByRole') {
        const parts = value.split('|');
        if (parts.length > 1) locatorStr = `page.get_by_role("${parts[0]}", name="${esc(parts[1])}")`;
        else locatorStr = `page.get_by_role("${parts[0]}")`;
    } else {
        const pyMethod = method.replace(/([A-Z])/g, "_$1").toLowerCase();
        locatorStr = `page.${pyMethod}("${esc(value)}")`;
    }

    if (addWait) return `${locatorStr}.wait_for()\n${locatorStr}${act}`;
    return `${locatorStr}${act}`;
}

function generateJSCode(best, action, addWait) {
    const { method, value } = best;
    const act = getActionStr('js', action);
    const esc = (s) => s.replace(/'/g, "\\'");
    let locatorStr = "";
    if (method === 'locator') locatorStr = `page.locator('${esc(value)}')`;
    else if (method === 'getByRole') {
        const parts = value.split('|');
        if (parts.length > 1) locatorStr = `page.getByRole('${parts[0]}', { name: '${esc(parts[1])}' })`;
        else locatorStr = `page.getByRole('${parts[0]}')`;
    } else {
        locatorStr = `page.${method}('${esc(value)}')`;
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
        const recommendations = await callOpenAI(selectedElement, openaiApiKey);
        renderAIResults(recommendations);
        aiResults.classList.remove('hidden');
        updateStatus('AI locators generated!');
    } catch (e) {
        console.error('AI Processing failed:', e);
        updateStatus('AI generation failed');
    } finally {
        aiTrigger.innerHTML = oldText;
        aiTrigger.style.opacity = '1';
        aiTrigger.style.pointerEvents = 'auto';
    }
}

async function callOpenAI(data, apiKey) {
    const prompt = `
        Analyze this HTML element and suggest 3 high-quality Playwright locators.
        Element: ${data.outerHTML}
        Tag: ${data.tag}
        Current ID: ${data.id}
        
        Respond ONLY with a JSON array of objects: 
        [{"name": "semantic_variable_name", "locator": "page.getByRole(...)", "reason": "Why this is good"}]
        Focus on stability and best practices.
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'system', content: 'You are a Playwright automation expert.' }, { role: 'user', content: prompt }],
            temperature: 0,
            response_format: { type: "json_object" }
        })
    });

    if (!response.ok) throw new Error('API request failed');
    const result = await response.json();
    const content = result.choices[0].message.content;
    const json = JSON.parse(content);
    // Support both direct array or wrapped object
    return Array.isArray(json) ? json : (json.recommendations || json.locators || Object.values(json)[0]);
}

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
}
