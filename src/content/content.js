// Content Script - Extract YouTube CC subtitles
console.log('Video Music Lyrics: Content script loaded');

let pipWindow = null;
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
  } else if (request.action === 'updateStyle') {
    applyStyleToOverlay(request.style);
    sendResponse({ success: true });
  }
  return true;
});

// Check if subtitles are available
function checkSubtitlesAvailable() {
  const subtitleContainer = document.querySelector('.ytp-caption-window-container');
  return subtitleContainer !== null;
}

// Start displaying lyrics
async function startLyricsDisplay() {
  console.log('Starting lyrics display...');

  // Create Picture-in-Picture window
  await createPiPWindow();

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

  if (pipWindow) {
    pipWindow.close();
    pipWindow = null;
  }
}

// Create Picture-in-Picture window for lyrics
async function createPiPWindow() {
  try {
    // Check if Document PiP is supported
    if (!('documentPictureInPicture' in window)) {
      console.error('Document Picture-in-Picture not supported');
      alert('Your browser does not support Picture-in-Picture mode. Please use Chrome 116+ or Edge 116+.');
      return;
    }

    // Request Picture-in-Picture window
    pipWindow = await window.documentPictureInPicture.requestWindow({
      width: 600,
      height: 150
    });

    console.log('Picture-in-Picture window created');

    // Copy stylesheets to PiP window
    const pipDocument = pipWindow.document;

    // Add styles to PiP window
    const style = pipDocument.createElement('style');
    style.textContent = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: Arial, "Microsoft JhengHei", sans-serif;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        overflow: hidden;
      }

      #lyrics-container {
        width: 100%;
        padding: 20px;
        text-align: center;
      }

      #lyrics-text {
        font-size: 24px;
        color: #ffffff;
        line-height: 1.6;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        word-wrap: break-word;
        animation: fadeIn 0.5s ease-in;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .updating {
        animation: slideIn 0.3s ease-out;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    pipDocument.head.appendChild(style);

    // Create lyrics content
    const container = pipDocument.createElement('div');
    container.id = 'lyrics-container';

    const lyricsText = pipDocument.createElement('div');
    lyricsText.id = 'lyrics-text';
    lyricsText.textContent = 'Waiting for lyrics...';

    container.appendChild(lyricsText);
    pipDocument.body.appendChild(container);

    // Handle PiP window close
    pipWindow.addEventListener('pagehide', () => {
      pipWindow = null;
      isEnabled = false;
      chrome.storage.local.set({ lyricsEnabled: false });
    });

  } catch (error) {
    console.error('Error creating Picture-in-Picture window:', error);
    alert('Failed to open Picture-in-Picture window. Please try again.');
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
        updateLyricsOverlay(subtitleText);
      }
    });
  });

  subtitleObserver.observe(subtitleContainer, {
    childList: true,
    subtree: true,
    characterData: true
  });

  // Update with current subtitles
  const currentText = extractSubtitleText();
  updateLyricsOverlay(currentText);
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

// Update lyrics in PiP window
function updateLyricsOverlay(text) {
  if (!pipWindow) return;

  const lyricsText = pipWindow.document.getElementById('lyrics-text');
  if (lyricsText) {
    if (!text || text.trim() === '') {
      lyricsText.textContent = 'Waiting for lyrics...';
      lyricsText.classList.remove('updating');
    } else {
      lyricsText.textContent = text;
      // Add animation
      lyricsText.classList.remove('updating');
      void lyricsText.offsetWidth; // Trigger reflow
      lyricsText.classList.add('updating');
    }
  }
}

// Apply style to PiP window
function applyStyleToOverlay(style) {
  if (!pipWindow) return;

  const lyricsText = pipWindow.document.getElementById('lyrics-text');
  if (lyricsText) {
    lyricsText.style.fontSize = style.fontSize;
    lyricsText.style.color = style.color;
    lyricsText.style.fontFamily = style.fontFamily;
  }

  const body = pipWindow.document.body;
  if (body) {
    body.style.background = style.backgroundColor;
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