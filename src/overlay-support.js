// CSS Overlay Support - Issue Analysis and Enhancement

/**
 * IDENTIFIED ISSUES WITH CURRENT CSS-OVERLAY SUPPORT
 * ====================================================
 * 
 * 1. ELEMENT DETECTION ISSUE
 *    - Current: Uses document.elementFromPoint(x, y)
 *    - Problem: Returns the overlay element, not the target element underneath
 *    - Impact: Cannot select elements hidden behind overlays, modals, or tooltips
 *    - Scenario: Modal overlays, dropdown menus, tooltips, loading spinners
 * 
 * 2. Z-INDEX CONFLICT
 *    - Current highlight z-index: 2147483646 (near max)
 *    - Problem: Some overlays use z-index: 2147483647 or higher
 *    - Impact: Highlight may appear behind certain overlays
 *    - Scenario: Modal dialogs with z-index: 2147483647
 * 
 * 3. POINTER-EVENTS HANDLING
 *    - Current: Only highlight has pointer-events: none
 *    - Problem: Overlays may have pointer-events: auto, blocking interaction
 *    - Impact: Cannot click through overlays to select elements
 *    - Scenario: Semi-transparent backdrop overlays
 * 
 * 4. SCROLL AND TRANSFORM ISSUES
 *    - Current: Uses getBoundingClientRect() directly
 *    - Problem: Doesn't account for transformed parent containers
 *    - Impact: Highlight appears in wrong position for transformed elements
 *    - Scenario: Rotated/scaled containers, CSS transform: scale()
 * 
 * 5. SHADOW DOM TRAVERSAL
 *    - Current: Basic shadowRoot traversal
 *    - Problem: Doesn't handle nested shadow DOMs or shadow DOM overlays
 *    - Impact: Cannot select elements inside shadow DOM overlays
 *    - Scenario: Web components with shadow DOM, custom elements
 * 
 * 6. MODAL/BACKDROP DETECTION
 *    - Current: No special handling for modals
 *    - Problem: Cannot intelligently skip modal backdrops
 *    - Impact: Selects backdrop instead of modal content
 *    - Scenario: Material Design modals, Bootstrap modals
 * 
 * 7. CROSS-ORIGIN IFRAME OVERLAYS
 *    - Current: Cross-origin iframes throw errors
 *    - Problem: Security restrictions prevent access
 *    - Impact: Elements in cross-origin iframes cannot be selected
 *    - Scenario: Third-party widget iframes, payment gateway iframes
 * 
 * 8. FIXED/STICKY POSITIONING
 *    - Current: Treats all positioning the same
 *    - Problem: Fixed/sticky elements scroll differently
 *    - Impact: Highlight misaligned for fixed position overlays
 *    - Scenario: Fixed headers, sticky navigation menus
 */

/**
 * ENHANCED ELEMENT DETECTION WITH OVERLAY SUPPORT
 * Handles overlays intelligently by checking element properties
 */
function getElementAtPointWithOverlayDetection(x, y, maxDepth = 50) {
    let element = document.elementFromPoint(x, y);
    let depth = 0;
    const visited = new Set();

    while (element && depth < maxDepth) {
        // Avoid infinite loops
        if (visited.has(element)) break;
        visited.add(element);

        // Skip overlay-like elements
        if (isOverlayElement(element)) {
            // Hide element temporarily to get element below
            const originalPointerEvents = element.style.pointerEvents;
            const originalDisplay = element.style.display;
            const originalVis = element.style.visibility;
            
            element.style.pointerEvents = 'none';
            
            const elementBelow = document.elementFromPoint(x, y);
            
            // Restore original styles
            element.style.pointerEvents = originalPointerEvents;
            
            if (elementBelow && elementBelow !== element && !isBodyOrHtml(elementBelow)) {
                element = elementBelow;
                continue;
            }
            break;
        }

        // If element is valid target, return it
        if (!isBodyOrHtml(element)) {
            return element;
        }

        // Check shadow DOM
        if (element.shadowRoot) {
            const shadowElement = element.shadowRoot.elementFromPoint(x, y);
            if (shadowElement && !isOverlayElement(shadowElement)) {
                element = shadowElement;
                continue;
            }
        }

        depth++;
        break;
    }

    return element;
}

/**
 * Detects if an element is an overlay/backdrop
 * Checks multiple indicators to identify overlay elements
 */
function isOverlayElement(element) {
    if (!element) return false;

    const tag = element.tagName.toLowerCase();
    const classList = element.className || '';
    const id = element.id || '';
    const style = window.getComputedStyle(element);

    // Common overlay patterns
    const overlayPatterns = [
        /overlay|backdrop|modal|dialog|tooltip|popover|dropdown|menu|toast|notification|spinner|loader|modal-bg|modal-overlay/i,
        /scrim|shade|shadow|dim|mask|cover/i,
        /react-modal|ng-modal|v-modal/i // Framework-specific
    ];

    // Check class names and ID
    for (const pattern of overlayPatterns) {
        if (pattern.test(classList) || pattern.test(id)) {
            // But exclude elements that are the actual content
            if (/content|body|wrapper|container|inner|card|panel|form/i.test(classList)) {
                continue;
            }
            return true;
        }
    }

    // Check CSS properties indicative of overlays
    const bgColor = style.backgroundColor;
    const opacity = parseFloat(style.opacity);
    const pointerEvents = style.pointerEvents;
    const zIndex = parseInt(style.zIndex) || 0;

    // Semi-transparent backdrop (common overlay pattern)
    if (opacity < 1 && opacity > 0) {
        const rgb = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgb) {
            const [, r, g, b] = rgb;
            // Very dark or very light semi-transparent = likely backdrop
            const darkness = (parseInt(r) + parseInt(g) + parseInt(b)) / 3;
            if ((darkness < 50 || darkness > 200) && opacity < 0.5) {
                return true;
            }
        }
    }

    // Fixed/absolute positioning with high z-index and full-screen = likely overlay
    const position = style.position;
    if ((position === 'fixed' || position === 'absolute') && zIndex > 999) {
        const width = parseFloat(style.width);
        const height = parseFloat(style.height);
        const viewport = window.innerWidth * window.innerHeight;
        const elementArea = width * height;
        
        // If it covers most of viewport, it's probably an overlay
        if (elementArea > viewport * 0.7) {
            return true;
        }
    }

    // Explicit overlay role/data attribute
    if (element.getAttribute('role') === 'presentation' && position === 'fixed') {
        return true;
    }

    if (element.getAttribute('data-overlay') === 'true') {
        return true;
    }

    return false;
}

/**
 * Check if element is body or html
 */
function isBodyOrHtml(element) {
    if (!element) return true;
    return element.tagName === 'BODY' || element.tagName === 'HTML' || element.tagName === 'DOCUMENT';
}

/**
 * ENHANCED HIGHLIGHT WITH Z-INDEX MANAGEMENT
 * Ensures highlight stays above overlays
 */
function createEnhancedHighlight() {
    const highlight = document.createElement('div');
    highlight.id = '__pw-highlight';
    highlight.className = '__pw-highlight-element';
    
    // Track original z-index values to manage layering
    highlight.__originalZIndices = new Map();
    
    highlight.style.cssText = `
        position: fixed;
        border: 3px solid #6366f1;
        background: rgba(99, 102, 241, 0.15);
        pointer-events: none;
        display: none;
        z-index: 2147483647;
        box-shadow: 
            0 0 15px rgba(99, 102, 241, 0.5),
            inset 0 0 0 1px rgba(99, 102, 241, 0.3);
        border-radius: 6px;
        transition: all 0.08s ease-out;
        backface-visibility: hidden;
    `;
    
    return highlight;
}

/**
 * OVERLAY DETECTION REPORT
 * Provides detailed analysis of overlays on page
 */
function analyzePageOverlays() {
    const report = {
        timestamp: new Date().toISOString(),
        overlays: [],
        modals: [],
        fixedElements: [],
        stickyElements: [],
        shadowDomElements: [],
        issues: []
    };

    // Find all potential overlays
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const zIndex = parseInt(style.zIndex) || 0;
        const position = style.position;

        // Check for overlays
        if (isOverlayElement(el)) {
            report.overlays.push({
                tag: el.tagName.toLowerCase(),
                class: el.className,
                id: el.id,
                zIndex: zIndex,
                position: position,
                opacity: parseFloat(style.opacity),
                rect: { width: rect.width, height: rect.height }
            });
        }

        // Check for modals (specific overlay type)
        if (/modal|dialog/i.test(el.className || el.id)) {
            report.modals.push({
                tag: el.tagName.toLowerCase(),
                class: el.className,
                id: el.id,
                zIndex: zIndex
            });
        }

        // Check for fixed elements
        if (position === 'fixed') {
            report.fixedElements.push({
                tag: el.tagName.toLowerCase(),
                class: el.className,
                id: el.id,
                zIndex: zIndex
            });
        }

        // Check for sticky elements
        if (position === 'sticky') {
            report.stickyElements.push({
                tag: el.tagName.toLowerCase(),
                class: el.className,
                id: el.id,
                zIndex: zIndex
            });
        }

        // Check for shadow DOM
        if (el.shadowRoot) {
            report.shadowDomElements.push({
                tag: el.tagName.toLowerCase(),
                class: el.className,
                id: el.id
            });
        }
    });

    // Identify potential issues
    const maxZIndex = Math.max(...report.overlays.map(o => o.zIndex).filter(z => z < 2147483647));
    if (maxZIndex > 2147483646) {
        report.issues.push({
            severity: 'high',
            issue: 'Z-index conflict detected',
            description: `Some overlays have z-index up to ${maxZIndex}, which may obscure the highlight`,
            recommendation: 'Highlight z-index should be adjusted or overlay management improved'
        });
    }

    if (report.overlays.length > 5) {
        report.issues.push({
            severity: 'medium',
            issue: 'Multiple overlays detected',
            description: `Found ${report.overlays.length} overlay elements`,
            recommendation: 'Be cautious when selecting elements - multiple overlays may interfere'
        });
    }

    if (report.shadowDomElements.length > 0) {
        report.issues.push({
            severity: 'medium',
            issue: 'Shadow DOM elements detected',
            description: `Found ${report.shadowDomElements.length} elements with shadow DOM`,
            recommendation: 'Elements inside shadow DOM may have limited selection support'
        });
    }

    return report;
}

/**
 * SMART OVERLAY HANDLING
 * Temporarily hides overlays during element selection
 */
function withOverlaysHidden(callback) {
    const hiddenElements = [];
    const allElements = document.querySelectorAll('*');

    // Hide all overlay elements
    allElements.forEach(el => {
        if (isOverlayElement(el) && el.id !== '__pw-highlight') {
            const originalDisplay = el.style.display;
            const originalVis = el.style.visibility;
            const originalPointerEvents = el.style.pointerEvents;
            
            el.style.display = 'none';
            
            hiddenElements.push({
                element: el,
                originalDisplay,
                originalVis,
                originalPointerEvents
            });
        }
    });

    try {
        return callback();
    } finally {
        // Restore all overlay elements
        hiddenElements.forEach(({ element, originalDisplay, originalVis, originalPointerEvents }) => {
            element.style.display = originalDisplay || '';
            element.style.visibility = originalVis || '';
            element.style.pointerEvents = originalPointerEvents || '';
        });
    }
}

/**
 * TEST OVERLAY DETECTION
 * For debugging and verification
 */
function testOverlayDetection() {
    console.log('=== CSS Overlay Detection Test ===');
    const report = analyzePageOverlays();
    
    console.log('Report:', report);
    console.log(`Total overlays found: ${report.overlays.length}`);
    console.log(`Total modals found: ${report.modals.length}`);
    console.log(`Total fixed elements: ${report.fixedElements.length}`);
    console.log(`Issues: ${report.issues.length}`);
    
    report.issues.forEach(issue => {
        console.warn(`[${issue.severity.toUpperCase()}] ${issue.issue}:`, issue.description);
    });

    return report;
}
