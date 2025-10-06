import './lyrics.css';

// Lyrics Window Script
let currentSettings = {
  fontSize: '24px',
  color: '#ffffff',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  textAlign: 'center'
};

let isPinned = false;

document.addEventListener('DOMContentLoaded', () => {
  const lyricsText = document.getElementById('lyricsText');
  const settingsBtn = document.getElementById('settingsBtn');
  const pinBtn = document.getElementById('pinBtn');
  const closeBtn = document.getElementById('closeBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const applySettingsBtn = document.getElementById('applySettings');
  
  const fontSizeSlider = document.getElementById('fontSizeSlider');
  const fontSizeValue = document.getElementById('fontSizeValue');
  const fontColorPicker = document.getElementById('fontColorPicker');
  const bgOpacitySlider = document.getElementById('bgOpacitySlider');
  const bgOpacityValue = document.getElementById('bgOpacityValue');
  const textAlignSelect = document.getElementById('textAlign');
  
  // Load saved settings
  loadSettings();

  // Listen for messages from content script
  window.addEventListener('message', (event) => {
    if (event.data.type === 'updateLyrics') {
      updateLyrics(event.data.text);
    }
  });

  // Settings button events
  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
    settingsBtn.classList.toggle('active');
  });

  pinBtn.addEventListener('click', () => {
    isPinned = !isPinned;
    pinBtn.classList.toggle('active');
    // Note: Browser security restrictions prevent true pinning functionality
    // This is just visual feedback
  });
  
  closeBtn.addEventListener('click', () => {
    window.close();
  });
  
  // Settings panel events
  fontSizeSlider.addEventListener('input', (e) => {
    fontSizeValue.textContent = e.target.value + 'px';
  });

  bgOpacitySlider.addEventListener('input', (e) => {
    bgOpacityValue.textContent = e.target.value + '%';
  });

  applySettingsBtn.addEventListener('click', () => {
    applySettings();
    settingsPanel.classList.add('hidden');
    settingsBtn.classList.remove('active');
  });

  // Apply settings
  function applySettings() {
    currentSettings = {
      fontSize: fontSizeSlider.value + 'px',
      color: fontColorPicker.value,
      backgroundColor: `rgba(0, 0, 0, ${bgOpacitySlider.value / 100})`,
      textAlign: textAlignSelect.value
    };

    // Apply to UI
    lyricsText.style.fontSize = currentSettings.fontSize;
    lyricsText.style.color = currentSettings.color;
    lyricsText.style.textAlign = currentSettings.textAlign;
    document.querySelector('.lyrics-container').style.background = currentSettings.backgroundColor;

    // Save settings
    saveSettings();
  }
  
  // Load settings
  function loadSettings() {
    const saved = localStorage.getItem('lyricsSettings');
    if (saved) {
      try {
        currentSettings = JSON.parse(saved);

        // Apply settings to UI elements
        const fontSize = parseInt(currentSettings.fontSize);
        fontSizeSlider.value = fontSize;
        fontSizeValue.textContent = fontSize + 'px';
        fontColorPicker.value = currentSettings.color;
        textAlignSelect.value = currentSettings.textAlign || 'center';

        // Extract opacity from background color
        const bgMatch = currentSettings.backgroundColor.match(/rgba?\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/);
        if (bgMatch) {
          const opacity = Math.round(parseFloat(bgMatch[1]) * 100);
          bgOpacitySlider.value = opacity;
          bgOpacityValue.textContent = opacity + '%';
        }

        // Apply to display
        lyricsText.style.fontSize = currentSettings.fontSize;
        lyricsText.style.color = currentSettings.color;
        lyricsText.style.textAlign = currentSettings.textAlign;
        document.querySelector('.lyrics-container').style.background = currentSettings.backgroundColor;
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }
  }

  // Save settings
  function saveSettings() {
    localStorage.setItem('lyricsSettings', JSON.stringify(currentSettings));
  }

  // Update lyrics
  function updateLyrics(text) {
    if (!text || text.trim() === '') {
      lyricsText.textContent = 'Waiting for lyrics...';
      lyricsText.classList.remove('updating');
      return;
    }

    // Add update animation
    lyricsText.classList.remove('updating');
    void lyricsText.offsetWidth; // Trigger reflow
    lyricsText.classList.add('updating');

    lyricsText.textContent = text;
  }
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // ESC to close settings panel
    if (e.key === 'Escape') {
      settingsPanel.classList.add('hidden');
      settingsBtn.classList.remove('active');
    }

    // Ctrl/Cmd + W to close window
    if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
      e.preventDefault();
      window.close();
    }

    // Ctrl/Cmd + , to open settings
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
      e.preventDefault();
      settingsPanel.classList.toggle('hidden');
      settingsBtn.classList.toggle('active');
    }
  });

  // Recalculate layout on window resize
  window.addEventListener('resize', () => {
    // Responsive layout handling can be added here
  });

  // Prevent right-click menu (optional)
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
  
  console.log('Lyrics window initialized');
});