// Background service worker for the extension
console.log('Playwright AutoLocator & CodeGen - Service Worker initialized');

// Handle messages from DevTools panel if needed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'INJECT_PICKER') {
        chrome.scripting.executeScript({
            target: {
                tabId: request.tabId,
                allFrames: true
            },
            world: 'MAIN',
            func: (code) => {
                const script = document.createElement('script');
                script.textContent = code;
                document.documentElement.appendChild(script);
                script.remove();
            },
            args: [request.code]
        }).then(() => {
            sendResponse({ success: true });
        }).catch(err => {
            console.error('Injection failed:', err);
            sendResponse({ success: false, error: err.message });
        });
        return true; // Keep channel open for async response
    }

    if (request.type === 'CLEANUP_PICKER') {
        chrome.scripting.executeScript({
            target: {
                tabId: request.tabId,
                allFrames: true
            },
            world: 'MAIN',
            func: () => {
                if (window.__pwPickerCleanup) window.__pwPickerCleanup();
            }
        }).then(() => {
            sendResponse({ success: true });
        }).catch(err => {
            sendResponse({ success: false, error: err.message });
        });
        return true;
    }

    sendResponse({ received: true });
});

