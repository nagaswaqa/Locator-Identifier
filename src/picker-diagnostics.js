// Picker Failure Diagnostics and Fixes
// Addresses: "Picker failed to start" error

/**
 * ISSUES CAUSING "PICKER FAILED TO START"
 * ========================================
 * 
 * 1. LARGE CODE INJECTION (90+ lines)
 *    - Problem: Complex eval() code may fail on some pages
 *    - Cause: Template literal nesting, escape sequences
 *    - Solution: Break into smaller pieces
 * 
 * 2. NO ERROR REPORTING
 *    - Problem: Generic "Picker failed to start" with no details
 *    - Cause: Error object not logged/reported
 *    - Solution: Add detailed error logging
 * 
 * 3. OVERLAY DETECTION IN INJECTION
 *    - Problem: isOverlayElement() function complex in eval context
 *    - Cause: Regex operations, DOM queries may fail
 *    - Solution: Simplify or move overlay detection
 * 
 * 4. getElementAtPoint COMPLEXITY
 *    - Problem: Deep traversal with Set tracking may fail
 *    - Cause: Memory, Set operations in sandboxed context
 *    - Solution: Simplify to essential logic
 * 
 * 5. DOCUMENT.BODY NULL
 *    - Problem: document.body may not exist on some pages
 *    - Cause: Page still loading or unusual DOCTYPE
 *    - Solution: Fallback to document.documentElement
 * 
 * 6. HIGHLIGHT APPEND FAILURE
 *    - Problem: Cannot append highlight element
 *    - Cause: body doesn't exist or is inaccessible
 *    - Solution: Use safer append method
 * 
 * 7. EVENT LISTENER CONFLICTS
 *    - Problem: addEventListener fails in some contexts
 *    - Cause: Content Security Policy (CSP) restrictions
 *    - Solution: Wrap in try-catch
 * 
 * 8. REGEX OBJECT IN EVAL
 *    - Problem: Regex patterns inside eval can cause syntax errors
 *    - Cause: Backslash escaping issues in template literals
 *    - Solution: Use string patterns instead
 */

/**
 * SIMPLIFIED, ROBUST PICKER CODE
 * Replaces complex inline eval with failsafe version
 */
function createSimplifiedPickerCode() {
    // Split into minimal, testable parts
    return `
        (function() {
            try {
                // 1. Cleanup existing
                if (window.__pwPickerCleanup) {
                    window.__pwPickerCleanup();
                    return 'cancelled';
                }
                
                // Remove old highlight
                const old = document.getElementById('__pw-highlight');
                if (old) {
                    try { old.remove(); } catch(e) {}
                }
                
                // 2. Create highlight element
                const highlight = document.createElement('div');
                highlight.id = '__pw-highlight';
                
                // Apply styles safely
                highlight.style.position = 'fixed';
                highlight.style.border = '3px solid #6366f1';
                highlight.style.background = 'rgba(99, 102, 241, 0.15)';
                highlight.style.pointerEvents = 'none';
                highlight.style.display = 'none';
                highlight.style.zIndex = '2147483647';
                highlight.style.boxShadow = '0 0 15px rgba(99, 102, 241, 0.5), inset 0 0 0 1px rgba(99, 102, 241, 0.3)';
                highlight.style.borderRadius = '6px';
                highlight.style.transition = 'all 0.08s ease-out';
                highlight.style.backfaceVisibility = 'hidden';
                
                // 3. Append to body or documentElement
                const target = document.body || document.documentElement;
                if (!target) throw new Error('No valid DOM target');
                
                target.appendChild(highlight);
                
                // 4. Simple overlay detection (minimal version)
                function isSimpleOverlay(el) {
                    if (!el || el === highlight) return false;
                    const tag = el.tagName.toLowerCase();
                    if (tag === 'body' || tag === 'html') return false;
                    
                    const cls = (el.className || '').toLowerCase();
                    const id = (el.id || '').toLowerCase();
                    
                    // Check for overlay keywords
                    const overlayKeywords = ['overlay', 'backdrop', 'modal', 'dialog', 'tooltip', 'popover'];
                    return overlayKeywords.some(kw => cls.includes(kw) || id.includes(kw));
                }
                
                // 5. Simple element detection
                function getElementAtPoint(x, y) {
                    let el = document.elementFromPoint(x, y);
                    
                    // Try to skip overlay
                    if (el && isSimpleOverlay(el)) {
                        const saved = el.style.pointerEvents;
                        el.style.pointerEvents = 'none';
                        el = document.elementFromPoint(x, y);
                        if (el && isSimpleOverlay(el)) {
                            el.style.pointerEvents = saved;
                            el = null;
                        } else if (el) {
                            document.elementFromPoint(x, y).style.pointerEvents = saved;
                        }
                    }
                    
                    return el;
                }
                
                // 6. Event handlers
                let hoveredElement = null;
                
                function updateHighlight(e) {
                    try {
                        const el = getElementAtPoint(e.clientX, e.clientY);
                        if (el && el !== highlight && el.tagName !== 'HTML') {
                            hoveredElement = el;
                            const rect = el.getBoundingClientRect();
                            highlight.style.display = 'block';
                            highlight.style.top = rect.top + 'px';
                            highlight.style.left = rect.left + 'px';
                            highlight.style.width = rect.width + 'px';
                            highlight.style.height = rect.height + 'px';
                        }
                    } catch(e) {
                        console.error('Highlight error:', e);
                    }
                }
                
                function selectElement(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (hoveredElement) {
                        window.__pwSelectedElement = hoveredElement;
                    }
                    window.__pwPickerCleanup();
                    return 'selected';
                }
                
                // 7. Cleanup function
                window.__pwPickerCleanup = function() {
                    try {
                        document.removeEventListener('mousemove', updateHighlight, true);
                        document.removeEventListener('click', selectElement, true);
                    } catch(e) {}
                    
                    try {
                        document.body.style.cursor = '';
                    } catch(e) {}
                    
                    try {
                        highlight.remove();
                    } catch(e) {}
                    
                    try {
                        delete window.__pwPickerCleanup;
                        delete window.__pwPickerActive;
                    } catch(e) {}
                };
                
                // 8. Setup listeners
                document.addEventListener('mousemove', updateHighlight, true);
                document.addEventListener('click', selectElement, true);
                document.body.style.cursor = 'crosshair';
                window.__pwPickerActive = true;
                
                return 'started';
                
            } catch(e) {
                // Return error details
                return { error: e.message, stack: e.stack };
            }
        })();
    `;
}

/**
 * ENHANCED ERROR HANDLING
 * Better error reporting for picker failures
 */
function startElementPickerWithErrorHandling() {
    const btn = document.getElementById('toggleInspect');
    
    // Simplified picker code
    const pickerCode = createSimplifiedPickerCode();
    
    chrome.devtools.inspectedWindow.eval(pickerCode, (result, error) => {
        if (error) {
            console.error('Chrome DevTools eval error:', error);
            updateStatus('Picker failed to start: DevTools error');
            
            // Try alternative approach
            console.warn('Retrying with fallback picker...');
            startFallbackPicker();
            return;
        }
        
        if (result && result.error) {
            // Error occurred in injected code
            console.error('Picker injection error:', result.error);
            console.error('Stack:', result.stack);
            updateStatus(`Picker error: ${result.error}`);
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
        } else {
            console.warn('Unexpected picker result:', result);
        }
    });
}

/**
 * FALLBACK PICKER
 * Uses alternative approach if main picker fails
 */
function startFallbackPicker() {
    const btn = document.getElementById('toggleInspect');
    
    // Even simpler approach - just set up DevTools listening
    const simpleCode = `
        (function() {
            try {
                if (window.__pwPickerActive) return 'already-active';
                window.__pwPickerActive = true;
                window.__pwSelectedElement = null;
                return 'fallback-started';
            } catch(e) {
                return { error: e.message };
            }
        })();
    `;
    
    chrome.devtools.inspectedWindow.eval(simpleCode, (result, error) => {
        if (error || (result && result.error)) {
            console.error('Fallback picker failed:', error);
            updateStatus('Element picker unavailable');
            return;
        }
        
        updateStatus('Fallback mode: Use DevTools Elements panel');
        btn.innerHTML = '<span>🛠️</span> Use DevTools';
        
        // Offer alternative
        showPickerAlternatives();
    });
}

/**
 * PICKER DIAGNOSTICS
 * Debug utility to check page compatibility
 */
function checkPickerCompatibility() {
    const checks = {
        documentReady: document.readyState === 'complete' || document.readyState === 'interactive',
        bodyExists: !!document.body,
        documentElementExists: !!document.documentElement,
        canEval: true,
        canCreateElement: true,
        canAppendElement: true,
        csrfIssues: false
    };
    
    try {
        chrome.devtools.inspectedWindow.eval('1 + 1', (result, error) => {
            checks.canEval = !error;
        });
    } catch (e) {
        checks.canEval = false;
    }
    
    try {
        const div = document.createElement('div');
        checks.canCreateElement = !!div;
    } catch (e) {
        checks.canCreateElement = false;
    }
    
    try {
        const div = document.createElement('div');
        document.body.appendChild(div);
        document.body.removeChild(div);
        checks.canAppendElement = true;
    } catch (e) {
        checks.canAppendElement = false;
    }
    
    // Check for CSP
    const style = document.createElement('style');
    style.textContent = 'body { }';
    try {
        document.head.appendChild(style);
        document.head.removeChild(style);
    } catch (e) {
        checks.csrfIssues = true;
    }
    
    return checks;
}

/**
 * DIAGNOSTICS REPORT
 * For debugging picker failures
 */
function getPickerDiagnostics() {
    const compat = checkPickerCompatibility();
    
    return {
        timestamp: new Date().toISOString(),
        page: {
            url: window.location.href,
            title: document.title,
            readyState: document.readyState
        },
        compatibility: compat,
        recommendations: getRecommendations(compat),
        workarounds: [
            'Try refreshing the page',
            'Check browser console for errors',
            'Use DevTools Elements panel to inspect directly',
            'Try different element on page',
            'Disable extensions that modify DOM'
        ]
    };
}

/**
 * Get recommendations based on compatibility check
 */
function getRecommendations(compat) {
    const recs = [];
    
    if (!compat.documentReady) {
        recs.push('⚠️ Page is still loading - wait for page to fully load');
    }
    
    if (!compat.bodyExists && !compat.documentElementExists) {
        recs.push('❌ No valid DOM target - page structure corrupted');
    }
    
    if (!compat.canEval) {
        recs.push('❌ DevTools eval not available - extension permissions issue');
    }
    
    if (!compat.canCreateElement) {
        recs.push('❌ Cannot create elements - DOM access restricted');
    }
    
    if (!compat.canAppendElement) {
        recs.push('❌ Cannot append elements - DOM mutation blocked');
    }
    
    if (compat.csrfIssues) {
        recs.push('⚠️ Content Security Policy may restrict extension - some features may not work');
    }
    
    if (recs.length === 0) {
        recs.push('✓ Page appears compatible with picker');
    }
    
    return recs;
}

/**
 * PICKER ALTERNATIVES UI
 * Show alternatives when picker fails
 */
function showPickerAlternatives() {
    console.log('Picker Alternatives:');
    console.log('');
    console.log('1. USE DEVTOOLS ELEMENTS PANEL:');
    console.log('   - Right-click element → Inspect');
    console.log('   - Or press F12, click Elements tab');
    console.log('   - Then use extension "Select from page"');
    console.log('');
    console.log('2. PASTE HTML:');
    console.log('   - Copy element\'s HTML');
    console.log('   - Paste into "Paste DOM" tab');
    console.log('   - Click element in preview');
    console.log('');
    console.log('3. MANUAL SELECTION:');
    console.log('   - Use extension\'s paste feature');
    console.log('   - Or generate locators manually');
}

/**
 * RUN DIAGNOSTICS COMMAND
 * For user console debugging
 */
function runPickerDiagnostics() {
    console.log('=== Picker Diagnostics ===');
    const diagnostics = getPickerDiagnostics();
    
    console.log('Page:', diagnostics.page);
    console.log('Compatibility:', diagnostics.compatibility);
    console.log('');
    console.log('Recommendations:');
    diagnostics.recommendations.forEach(rec => console.log('  ' + rec));
    console.log('');
    console.log('Workarounds:');
    diagnostics.workarounds.forEach(work => console.log('  - ' + work));
    
    return diagnostics;
}
