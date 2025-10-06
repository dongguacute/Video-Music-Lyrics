// Background Service Worker
console.log('Video Music Lyrics: Background service worker loaded');

// Initialize on installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason);

  // Set default values
  chrome.storage.local.set({
    extensionEnabled: true,  // Global extension toggle
    lyricsEnabled: false,
    lyricsPosition: { x: 0, y: 0 },
    lyricsStyle: {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      fontFamily: 'Arial, sans-serif'
    }
  });
});

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getExtensionState') {
    chrome.storage.local.get(['extensionEnabled'], (result) => {
      sendResponse({ enabled: result.extensionEnabled !== false }); // Default to true
    });
    return true;
  }

  if (request.action === 'setExtensionState') {
    chrome.storage.local.set({ extensionEnabled: request.enabled }, () => {
      updateExtensionIcon(request.enabled);
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'getLyricsState') {
    chrome.storage.local.get(['lyricsEnabled'], (result) => {
      sendResponse({ enabled: result.lyricsEnabled || false });
    });
    return true;
  }

  if (request.action === 'setLyricsState') {
    chrome.storage.local.set({ lyricsEnabled: request.enabled }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'getLyricsStyle') {
    chrome.storage.local.get(['lyricsStyle'], (result) => {
      sendResponse({ style: result.lyricsStyle });
    });
    return true;
  }

  if (request.action === 'setLyricsStyle') {
    chrome.storage.local.set({ lyricsStyle: request.style }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isYouTube = tab.url.includes('youtube.com/watch') || tab.url.includes('music.youtube.com');

    if (isYouTube) {
      console.log('YouTube page detected:', tab.url);
    }
  }
});

// Update extension icon based on state
function updateExtensionIcon(enabled) {
  // For now, we'll use a simple approach - just change the badge
  // In a real implementation, you'd have separate icon files for enabled/disabled states
  if (enabled) {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setBadgeBackgroundColor({ color: '#28a745' });
  } else {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#dc3545' });
  }
}

// Handle extension icon click - toggle global extension state
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked on tab:', tab.id);

  // Get current extension state
  const result = await chrome.storage.local.get(['extensionEnabled']);
  const currentState = result.extensionEnabled !== false; // Default to true

  // Toggle the state
  const newState = !currentState;

  // Save new state
  await chrome.storage.local.set({ extensionEnabled: newState });

  // Update icon
  updateExtensionIcon(newState);

  // Notify content script if on YouTube page
  if (tab.url && (tab.url.includes('youtube.com/watch') || tab.url.includes('music.youtube.com'))) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'extensionStateChanged',
        enabled: newState
      });
    } catch (error) {
      console.log('Could not notify content script:', error);
    }
  }

  console.log('Extension state toggled to:', newState);
});

// Initialize icon on startup
chrome.storage.local.get(['extensionEnabled'], (result) => {
  const enabled = result.extensionEnabled !== false; // Default to true
  updateExtensionIcon(enabled);
});