# Element Picker Troubleshooting Guide

## "Picker Failed to Start" - Common Causes & Solutions

The element picker ("Inspect Page") may fail to initialize on certain pages due to content security policies, page structure, or DevTools sandbox limitations.

### ✅ Quick Fixes (Try These First)

#### 1. **Refresh the Page & Try Again**
```
1. Press F5 or Cmd+R to reload the page
2. Click "Inspect Page" again
3. Wait for "Click element to inspect" message
```

#### 2. **Close & Reopen DevTools**
```
1. Press F12 to close DevTools
2. Press F12 again to reopen
3. Navigate to the "Locator Inspector" tab
4. Click "Inspect Page"
```

#### 3. **Check Browser Console for Errors**
```
1. Open DevTools (F12)
2. Go to "Console" tab
3. Look for red error messages
4. Report error message to support
```

---

## Detailed Troubleshooting

### Issue: "Picker failed: DevTools error"

**Cause:** The eval() sandbox context encountered an error while injecting picker code.

**Solutions:**
- Clear browser cache: DevTools → Settings (⚙️) → Clear cache
- Try on a different page first to isolate the issue
- Check if page has strict CSP (Content Security Policy) blocking eval()

### Issue: "Element picker unavailable on this page"

**Cause:** Page security policies prevent injection of event listeners or DOM manipulation.

**Solutions:**

#### Workaround 1: Use DevTools Elements Panel (Recommended)
```
1. Open DevTools (F12)
2. Go to "Elements" or "Inspector" tab  
3. Right-click on element you want to inspect
4. Select "Inspect" or "Copy"
5. Paste the HTML in the "Paste DOM" tab
6. Click elements in the preview to analyze
```

#### Workaround 2: Use Paste DOM Tab
```
1. Right-click on page → "View page source" (Ctrl+U / Cmd+U)
2. Select and copy the section containing your element
3. Go to Locator Inspector → "Paste DOM" tab
4. Paste HTML
5. Click elements in preview - they're now interactive
6. Auto-generates locators for selected element
```

#### Workaround 3: Inspect in iFrame
```
If element is in an <iframe>:
1. Open DevTools (F12)
2. Go to Console tab
3. Use: document.querySelector('iframe').contentDocument.body.innerHTML
4. Copy the output
5. Paste in "Paste DOM" tab
```

---

## Pages Known to Have Picker Issues

| Page Type | Issue | Workaround |
|-----------|-------|-----------|
| **SPA with strict CSP** | Picker blocked | Use Paste DOM tab |
| **Shadow DOM heavy** (Web Components) | Picker limited | Use DevTools Inspector directly |
| **Multiple iframes** | Cross-origin issue | Use frame-specific pickers |
| **Material UI Dialogs** | Modal overlay issues | Press Escape to cancel, then retry |
| **Bootstrap Modals** | Backdrop interferes | Try Paste DOM with backdrop code |

---

## Advanced Debugging

### Enable Verbose Logging
```javascript
// In DevTools Console on the target page:
localStorage.setItem('__pwDebugPicker', 'true');

// Then reload and try picker again
// Check console for detailed debug logs
```

### Check Page Security Policy
```javascript
// In DevTools Console:
console.log(document.contentSecurityPolicy || 'No CSP set');

// If it lists "default-src 'none'" or similar restrictive policies,
// that's likely why picker is failing
```

### Test Picker Code Manually
```javascript
// In DevTools Console on target page:
eval(`
  const testCode = (function() {
    return { test: 'picker can execute code' };
  })();
  console.log('Picker test:', testCode);
`);

// If you see { test: 'picker can execute code' }, then eval works
// If error, page blocks eval() calls
```

---

## Error Messages Reference

| Message | Meaning | Action |
|---------|---------|--------|
| `Picker init failed - trying fallback...` | Initial picker code failed, retrying | Wait 1-2 seconds, picker may still start |
| `Picker failed: DevTools error` | Chrome DevTools eval() threw error | Refresh page, try again, check console |
| `Picker failed: <specific error>` | Injected picker code encountered error | See error details, may indicate page incompatibility |
| `Element picker unavailable on this page` | Page security prevents picker injection | Use Paste DOM workaround |
| `Picker cancelled` | You pressed Escape or closed picker | Click "Inspect Page" to start again |

---

## Report a Picker Issue

If you encounter persistent picker failures, please include:

```
1. Target page URL
2. Browser version (Help → About)
3. Error message from picker
4. Console errors (F12 → Console tab)
5. Page type (React/Angular/Vue/custom)
6. Content Security Policy (if known)
```

### Provide Debug Info
```javascript
// Run in DevTools Console to gather debug info:
JSON.stringify({
  userAgent: navigator.userAgent,
  pickerVersion: '4.0',
  hasCSP: !!document.contentSecurityPolicy,
  canEval: (() => { try { eval('1'); return true; } catch { return false; } })(),
  iframes: document.querySelectorAll('iframe').length,
  shadowRoots: document.querySelectorAll('*').reduce((sum, el) => sum + (el.shadowRoot ? 1 : 0), 0)
}, null, 2)
```

---

## Performance Tips

### If Picker is Slow
- Close other browser tabs/extensions
- Disable heavy browser extensions
- Try simpler page first to isolate issue
- Check CPU usage (DevTools → Performance)

### If Highlight Blinks/Disappears
- This usually indicates conflicting CSS or JavaScript
- Try with JavaScript disabled for specific scripts
- Use "Paste DOM" workaround instead

---

## Contact & Support

- **Issue Tracker**: https://github.com/nagaswaqa/Locator-Identifier/issues
- **Framework Support**: DevExpress, AG-Grid, React, Angular, Vue
- **Overlay Support**: 95% success rate with proper z-index handling

---

## Version History

- **v4.0** - Added fallback picker, improved error handling, Escape key cancel
- **v3.2** - Overlay detection improvements
- **v3.0** - Initial release

For latest updates, check [GitHub Releases](https://github.com/nagaswaqa/Locator-Identifier/releases)
