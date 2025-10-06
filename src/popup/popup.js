import './popup.css';

// Popup Script
let isEnabled = false;
let extensionEnabled = true;

document.addEventListener('DOMContentLoaded', async () => {
  const toggleBtn = document.getElementById('toggleBtn');
  const toggleText = document.getElementById('toggleText');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const subtitleStatus = document.getElementById('subtitleStatus');
  const windowStatus = document.getElementById('windowStatus');

  const fontSizeSelect = document.getElementById('fontSize');
  const fontColorInput = document.getElementById('fontColor');
  const bgOpacityInput = document.getElementById('bgOpacity');
  const opacityValue = document.getElementById('opacityValue');

  // Check extension global state first
  await checkExtensionState();

  // Load saved settings
  await loadSettings();

  // Check current status
  await checkStatus();

  // Set up event listeners
  toggleBtn.addEventListener('click', toggleLyrics);
  
  fontSizeSelect.addEventListener('change', saveSettings);
  fontColorInput.addEventListener('change', saveSettings);
  bgOpacityInput.addEventListener('input', (e) => {
    opacityValue.textContent = e.target.value + '%';
    saveSettings();
  });
  
  // Load settings
  async function loadSettings() {
    const result = await chrome.storage.local.get(['lyricsStyle']);
    if (result.lyricsStyle) {
      const style = result.lyricsStyle;
      fontSizeSelect.value = style.fontSize || '24px';
      fontColorInput.value = style.color || '#ffffff';

      // Extract opacity from backgroundColor
      const bgColor = style.backgroundColor || 'rgba(0, 0, 0, 0.7)';
      const match = bgColor.match(/rgba?\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/);
      if (match) {
        const opacity = Math.round(parseFloat(match[1]) * 100);
        bgOpacityInput.value = opacity;
        opacityValue.textContent = opacity + '%';
      }
    }
  }

  // Save settings
  async function saveSettings() {
    const style = {
      fontSize: fontSizeSelect.value,
      color: fontColorInput.value,
      backgroundColor: `rgba(0, 0, 0, ${bgOpacityInput.value / 100})`,
      fontFamily: 'Arial, "Microsoft JhengHei", sans-serif'
    };

    await chrome.storage.local.set({ lyricsStyle: style });

    // Notify content script to update style
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && isYouTubePage(tab.url)) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'updateStyle',
        style: style
      }).catch(() => {});
    }
  }

  // Check extension global state
  async function checkExtensionState() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getExtensionState' });
      extensionEnabled = response.enabled;

      if (!extensionEnabled) {
        // Extension is disabled globally
        updateStatus('inactive', 'Extension is disabled', false, false);
        toggleBtn.disabled = true;
        toggleText.textContent = 'Extension Disabled';
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error checking extension state:', error);
      return false;
    }
  }

  // Check status
  async function checkStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !isYouTubePage(tab.url)) {
        updateStatus('inactive', 'Please go to YouTube video page', false, false);
        toggleBtn.disabled = true;
        return;
      }

      // Send message to content script to check status
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'checkStatus'
      });

      isEnabled = response.enabled;
      const hasSubtitles = response.hasSubtitles;

      if (isEnabled) {
        updateStatus('active', 'Lyrics displaying', hasSubtitles, true);
        toggleText.textContent = 'Stop Lyrics Display';
        toggleBtn.classList.add('active');
      } else {
        updateStatus('inactive', 'Lyrics not started', hasSubtitles, false);
        toggleText.textContent = 'Start Lyrics Display';
        toggleBtn.classList.remove('active');
      }

      toggleBtn.disabled = false;

    } catch (error) {
      console.error('Error checking status:', error);
      updateStatus('inactive', 'Unable to connect to page', false, false);
      toggleBtn.disabled = true;
    }
  }
  
  // Toggle lyrics display
  async function toggleLyrics() {
    try {
      // Check if extension is enabled first
      if (!extensionEnabled) {
        alert('Extension is disabled. Click the extension icon to enable it.');
        return;
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !isYouTubePage(tab.url)) {
        alert('Please use this feature on YouTube video pages');
        return;
      }

      isEnabled = !isEnabled;

      // Send message to content script
      await chrome.tabs.sendMessage(tab.id, {
        action: 'toggleLyrics',
        enabled: isEnabled
      });

      // Save state
      await chrome.storage.local.set({ lyricsEnabled: isEnabled });

      // Update UI
      if (isEnabled) {
        toggleText.textContent = 'Stop Lyrics Display';
        toggleBtn.classList.add('active');
        statusDot.className = 'status-dot active';
        statusText.textContent = 'Lyrics displaying';
        windowStatus.textContent = 'Opened';
        windowStatus.className = 'info-value success';
      } else {
        toggleText.textContent = 'Start Lyrics Display';
        toggleBtn.classList.remove('active');
        statusDot.className = 'status-dot inactive';
        statusText.textContent = 'Lyrics not started';
        windowStatus.textContent = 'Closed';
        windowStatus.className = 'info-value';
      }

    } catch (error) {
      console.error('Error toggling lyrics:', error);
      alert('Operation failed, please refresh the page and try again');
    }
  }
  
  // Update status display
  function updateStatus(status, text, hasSubtitles, windowOpen) {
    statusDot.className = `status-dot ${status}`;
    statusText.textContent = text;

    if (hasSubtitles) {
      subtitleStatus.textContent = 'Available';
      subtitleStatus.className = 'info-value success';
    } else {
      subtitleStatus.textContent = 'Unavailable';
      subtitleStatus.className = 'info-value error';
    }

    if (windowOpen) {
      windowStatus.textContent = 'Opened';
      windowStatus.className = 'info-value success';
    } else {
      windowStatus.textContent = 'Closed';
      windowStatus.className = 'info-value';
    }
  }

  // Check if it's a YouTube page
  function isYouTubePage(url) {
    if (!url) return false;
    return url.includes('youtube.com/watch') || url.includes('music.youtube.com');
  }
});