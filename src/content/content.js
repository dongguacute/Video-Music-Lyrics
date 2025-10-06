// Content Script - Extract YouTube CC subtitles
console.log('Video Music Lyrics: Content script loaded');

let lyricsWindow = null;
let isEnabled = false;
let subtitleObserver = null;
let extensionEnabled = true; // Global extension state

// Listen for messages from popup and background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleLyrics') {
    if (!extensionEnabled) {
      sendResponse({ success: false, message: 'Extension is disabled' });
      return true;
    }

    isEnabled = request.enabled;
    if (isEnabled) {
      startLyricsDisplay();
    } else {
      stopLyricsDisplay();
    }
    sendResponse({ success: true });
  } else if (request.action === 'checkStatus') {
    sendResponse({
      enabled: isEnabled,
      hasSubtitles: checkSubtitlesAvailable(),
      extensionEnabled: extensionEnabled
    });
  } else if (request.action === 'extensionStateChanged') {
    extensionEnabled = request.enabled;
    console.log('Extension state changed to:', extensionEnabled);

    // If extension is disabled, stop lyrics display
    if (!extensionEnabled && isEnabled) {
      stopLyricsDisplay();
      isEnabled = false;
    }
  }
  return true;
});

// Check if subtitles are available
function checkSubtitlesAvailable() {
  const subtitleContainer = document.querySelector('.ytp-caption-window-container');
  return subtitleContainer !== null;
}

// Start displaying lyrics
function startLyricsDisplay() {
  console.log('Starting lyrics display...');

  // Open independent lyrics window
  openLyricsWindow();

  // Start observing subtitle changes
  observeSubtitles();
}

// Stop displaying lyrics
function stopLyricsDisplay() {
  console.log('Stopping lyrics display...');

  if (subtitleObserver) {
    subtitleObserver.disconnect();
    subtitleObserver = null;
  }

  if (lyricsWindow && !lyricsWindow.closed) {
    lyricsWindow.close();
    lyricsWindow = null;
  }
}

// Open independent lyrics window
function openLyricsWindow() {
  if (lyricsWindow && !lyricsWindow.closed) {
    lyricsWindow.focus();
    return;
  }

  const width = 800;
  const height = 200;
  const left = (screen.width - width) / 2;
  const top = screen.height - height - 100;

  const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,status=no,toolbar=no,menubar=no,location=no`;

  lyricsWindow = window.open(
    chrome.runtime.getURL('lyrics.html'),
    'LyricsWindow',
    features
  );

  // Send initialization message after window loads
  if (lyricsWindow) {
    lyricsWindow.addEventListener('load', () => {
      sendLyricsToWindow('Lyrics window opened');
    });
  }
}

// Observe subtitle changes
function observeSubtitles() {
  const subtitleContainer = document.querySelector('.ytp-caption-window-container');

  if (!subtitleContainer) {
    console.log('No subtitle container found');
    return;
  }

  // Use MutationObserver to monitor subtitle changes
  subtitleObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' || mutation.type === 'characterData') {
        const subtitleText = extractSubtitleText();
        if (subtitleText) {
          sendLyricsToWindow(subtitleText);
        }
      }
    });
  });

  subtitleObserver.observe(subtitleContainer, {
    childList: true,
    subtree: true,
    characterData: true
  });

  // Send current subtitles
  const currentText = extractSubtitleText();
  if (currentText) {
    sendLyricsToWindow(currentText);
  }
}

// Extract subtitle text
function extractSubtitleText() {
  const captionSegments = document.querySelectorAll('.ytp-caption-segment');

  if (captionSegments.length === 0) {
    return '';
  }

  let text = '';
  captionSegments.forEach((segment) => {
    text += segment.textContent + ' ';
  });

  return text.trim();
}

// Send lyrics to independent window
function sendLyricsToWindow(text) {
  if (lyricsWindow && !lyricsWindow.closed) {
    lyricsWindow.postMessage({
      type: 'updateLyrics',
      text: text,
      timestamp: Date.now()
    }, '*');
  }
}

// Clean up when page unloads
window.addEventListener('beforeunload', () => {
  stopLyricsDisplay();
});

// Initialize extension state and check if already enabled
chrome.runtime.sendMessage({ action: 'getExtensionState' }, (response) => {
  extensionEnabled = response.enabled;
  console.log('Extension enabled state:', extensionEnabled);

  if (extensionEnabled) {
    chrome.storage.local.get(['lyricsEnabled'], (result) => {
      if (result.lyricsEnabled) {
        isEnabled = true;
        startLyricsDisplay();
      }
    });
  }
});