/**
 * DOM Picker Scripts
 * Contains the injected scripts for element selection
 */
const PickerScripts = {

    getSimplifiedPickerCode() {
        return `
        (function() {
            try {
                console.log('[Playwright Inspector] Starting picker...');
                
                // Force cleanup of any old state
                if (window.__pwPickerCleanup) {
                    const wasReallyActive = window.__pwPickerActive;
                    window.__pwPickerCleanup();
                    // If it was just a zombie (cleanup existed but active flag was gone), don't cancel
                    if (wasReallyActive) return 'cancelled';
                }
                // Remove old highlight
                try {
                    const oldHighlight = document.getElementById('__pw-highlight');
                    if (oldHighlight) oldHighlight.remove();
                } catch(e) {}
                
                // Create highlight element
                const highlight = document.createElement('div');
                highlight.id = '__pw-highlight';
                
                // Apply styles safely (avoid cssText issues)
                highlight.style.position = 'fixed';
                highlight.style.border = '3px solid #6366f1';
                highlight.style.background = 'rgba(99, 102, 241, 0.15)';
                highlight.style.pointerEvents = 'none'; // Critical for clicking through
                highlight.style.display = 'none';
                highlight.style.zIndex = '2147483647';
                highlight.style.boxShadow = '0 0 15px rgba(99, 102, 241, 0.5), inset 0 0 0 1px rgba(99, 102, 241, 0.3)';
                highlight.style.borderRadius = '6px';
                highlight.style.transition = 'all 0.08s ease-out';
                highlight.style.backfaceVisibility = 'hidden';
                
                // Append to documentElement for maximum visibility
                const target = document.documentElement || document.body;
                if (!target) throw new Error('No valid DOM target found');
                
                target.appendChild(highlight);
                
                let hoveredElement = null;
                
                // Simplified overlay detection (more reliable)
                function isSimpleOverlay(el) {
                    if (!el || el === highlight) return false;
                    const tag = el.tagName.toLowerCase();
                    if (tag === 'body' || tag === 'html') return false;
                    
                    const cls = (el.className && typeof el.className === 'string' ? el.className.toLowerCase() : '');
                    const id = (el.id && typeof el.id === 'string' ? el.id.toLowerCase() : '');
                    
                    // Check for overlay keywords (expanded)
                    const overlayKeywords = ['overlay', 'backdrop', 'modal', 'dialog', 'tooltip', 'popover', 'dropdown', 'scrim', 'spinner', 'loading', 'mask', 'shield'];
                    const isKeywordMatch = overlayKeywords.some(kw => cls.includes(kw) || id.includes(kw));
                    
                    // Check for transparent full-screen fixed elements which are often backdrops
                    const style = window.getComputedStyle(el);
                    const isFullScreen = style.position === 'fixed' && 
                                       parseInt(style.width) >= window.innerWidth && 
                                       parseInt(style.height) >= window.innerHeight;
                    const isTransparent = style.backgroundColor === 'transparent' || 
                                        style.backgroundColor.includes('rgba(0, 0, 0, 0)') ||
                                        parseFloat(style.opacity) < 0.1;

                    return isKeywordMatch || (isFullScreen && isTransparent);
                }
                
                // Simplified element detection
                function getElementAtPoint(x, y) {
                    try {
                        let element = document.elementFromPoint(x, y);
                        
                        // Skip overlay if detected (Recursive check to find real element)
                        let attempts = 0;
                        while (element && isSimpleOverlay(element) && attempts < 5) {
                            const saved = element.style.pointerEvents;
                            element.style.pointerEvents = 'none';
                            const next = document.elementFromPoint(x, y);
                            // We don't restore immediately if we want to keep looking deeper
                            // but we MUST restore eventually. Let's use a stack.
                            element.__pwSavedPointerEvents = saved;
                            element = next;
                            attempts++;
                        }
                        
                        // Restore pointer events
                        document.querySelectorAll('*').forEach(el => {
                            if (el.__pwSavedPointerEvents !== undefined) {
                                el.style.pointerEvents = el.__pwSavedPointerEvents;
                                delete el.__pwSavedPointerEvents;
                            }
                        });
                        
                        // Ignore iframes only if instructed (Multi-frame mode)
                        if (element && element.tagName === 'IFRAME' && window.__pwIgnoreIframes) {
                            return null;
                        }
                        
                        // Check shadow DOM
                        if (element && element.shadowRoot) {
                            try {
                                const shadowElement = element.shadowRoot.elementFromPoint(x, y);
                                if (shadowElement) return shadowElement;
                            } catch(e) {}
                        }
                        
                        return element;
                    } catch(e) {
                        console.error('[Playwright Inspector] Hit test error:', e);
                        return null;
                    }
                }
                
                // Update highlight box
                function updateHighlight(e) {
                    try {
                        const el = getElementAtPoint(e.clientX, e.clientY);
                        if (el && el !== highlight && el.tagName !== 'HTML' && el.tagName !== 'BODY') {
                            hoveredElement = el;
                            const rect = el.getBoundingClientRect();
                            highlight.style.display = 'block';
                            highlight.style.top = rect.top + 'px';
                            highlight.style.left = rect.left + 'px';
                            highlight.style.width = rect.width + 'px';
                            highlight.style.height = rect.height + 'px';
                        }
                    } catch(e) {
                        console.error('Highlight update error:', e);
                    }
                }
                
                // Select element on click
                function selectElement(e) {
                    try {
                        e.preventDefault();
                        e.stopPropagation();
                    } catch(e) {}
                    
                    if (hoveredElement) {
                        console.log('[Playwright Inspector] Element selected:', hoveredElement.tagName);
                        
                        // Extract data locally to bypass cross-origin restrictions on DOM elements
                        const data = (function() {
                            try {
                                // These functions are injected by the panel
                                return extractElementData(hoveredElement);
                            } catch(err) {
                                return { tag: hoveredElement.tagName.toLowerCase(), error: 'Extraction failed: ' + err.message };
                            }
                        })();

                        // Relay to parent frame if we are in an iframe
                        if (window.parent !== window) {
                            window.parent.postMessage({ type: 'PW_ELEMENT_SELECTED', data: data }, '*');
                        } else {
                            window.__pwSelectedElement = data;
                        }
                    }
                    window.__pwPickerCleanup();
                }

                // Listen for messages from child frames (relay up to top)
                function handleMessage(e) {
                    if (e.data && e.data.type === 'PW_ELEMENT_SELECTED') {
                        if (window.parent !== window) {
                            window.parent.postMessage(e.data, '*');
                        } else {
                            window.__pwSelectedElement = e.data.data;
                        }
                    } else if (e.data && e.data.type === 'PW_PICKER_CANCELLED') {
                        if (window.parent !== window) {
                            window.parent.postMessage(e.data, '*');
                        } else {
                            window.__pwPickerCleanup();
                        }
                    }
                }
                
                // Listen for Escape to cancel
                function handleKey(e) {
                    if (e.key === 'Escape') {
                        if (window.parent !== window) {
                            window.parent.postMessage({ type: 'PW_PICKER_CANCELLED' }, '*');
                        } else {
                            window.__pwPickerCleanup();
                        }
                    }
                }
                
                // Cleanup function
                window.__pwPickerCleanup = function() {
                    try {
                        document.removeEventListener('mousemove', updateHighlight, true);
                    } catch(e) {}
                    try {
                        document.removeEventListener('click', selectElement, true);
                    } catch(e) {}
                    try {
                        window.removeEventListener('message', handleMessage);
                    } catch(e) {}
                    try {
                        window.removeEventListener('keydown', handleKey, true);
                    } catch(e) {}
                    try {
                        if (document.body) document.body.style.cursor = '';
                    } catch(e) {}
                    try {
                        if (highlight) highlight.remove();
                    } catch(e) {}
                    try {
                        delete window.__pwPickerCleanup;
                        delete window.__pwPickerActive;
                        delete window.__pwIgnoreIframes;
                    } catch(e) {}
                };
                
                // Setup event listeners
                try {
                    document.addEventListener('mousemove', updateHighlight, true);
                    document.addEventListener('click', selectElement, true);
                    window.addEventListener('message', handleMessage);
                    window.addEventListener('keydown', handleKey, true);
                    if (document.body) document.body.style.cursor = 'crosshair';
                } catch(e) {
                    throw new Error('Failed to setup event listeners: ' + e.message);
                }
                
                window.__pwPickerActive = true;
                return 'started';
                
            } catch(e) {
                return { error: e.message, type: 'picker_init' };
            }
        })();
        `;
    },

    getExtractionFunctions() {
        // We need to return the functions as a string to be eval'd in the inspected window
        // The functions themselves must be defined in the devtools-panel.js context to be stringified
        // However, to avoid code duplication, we will assume these functions are globally available 
        // in the devtools panel and just list them here by name reference if simpler, 
        // OR we duplicate the function logic here if we want true separation.
        // For now, let's keep the array construction logic but referencing the functions in devtools-panel.js
        // is tricky if they are Modules.
        // BETTER APPROACH: The devtools-panel.js will pass the function references. 
        // This helper might just return the list of function names if they were global, 
        // but since we are refactoring, let's keep the logic in devtools-panel.js for now 
        // OR move all locator logic to a separate file 'locator-strategy.js' which we sadly don't have yet.

        // Retaining original design: extraction functions are stringified.
        return null; // Logic remains in devtools-panel.js for now to avoid breaking intricate dependencies
    }
};

window.PickerScripts = PickerScripts;
