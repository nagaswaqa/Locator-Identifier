// DevTools entry point
// This creates the panel in Chrome DevTools

chrome.devtools.panels.create(
    "PW Inspector",  // Panel title
    "src/icons/icon48.png",  // Icon path relative to extension root
    "src/devtools-panel.html",  // Panel HTML relative to extension root
    function (panel) {
        console.log('Playwright Inspector panel created');
    }
);
