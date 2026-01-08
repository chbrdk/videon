import { searchScenes, healthCheck, updateApiConfig, setBaseURL } from './api.js';
import '../styles/main.css';

// Wait for CSInterface to be available
function waitForCSInterface(callback) {
  if (typeof CSInterface !== 'undefined') {
    callback();
  } else {
    setTimeout(function() {
      waitForCSInterface(callback);
    }, 50);
  }
}

// CSInterface for AE Communication
let csInterface;
waitForCSInterface(function() {
  csInterface = new CSInterface();
  
  // Initialize after CSInterface is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
});

// Application state
const state = {
  searchResults: [],
  selectedIndices: [],
  isProcessing: false,
  currentProgress: null
};

// Initialize
function init() {
  setupEventListeners();
  loadSettings();
}

function setupEventListeners() {
  // Settings toggle
  document.getElementById('settings-toggle').addEventListener('click', toggleSettings);
  document.getElementById('settings-save').addEventListener('click', saveSettings);
  document.getElementById('test-btn').addEventListener('click', testConnection);
  
  // Search
  document.getElementById('search-btn').addEventListener('click', performSearch);
  document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  });

  // Insert options
  document.getElementById('target-comp').addEventListener('change', updateCompNameVisibility);
  document.getElementById('sequential-check').addEventListener('change', updateGapVisibility);
  document.getElementById('insert-btn').addEventListener('click', insertSelectedScenes);
  document.getElementById('cancel-btn').addEventListener('click', cancelOperation);
  
  // Status cancel
  document.getElementById('cancel-operations').addEventListener('click', cancelOperation);
}

function toggleSettings() {
  const panel = document.getElementById('settings-panel');
  panel.classList.toggle('hidden');
}

function loadSettings() {
  const serverUrl = localStorage.getItem('serverUrl') || 'http://localhost:4001';
  const apiToken = localStorage.getItem('authToken') || '';
  const defaultComp = localStorage.getItem('defaultComp') || 'Search Results';
  
  document.getElementById('server-url').value = serverUrl;
  document.getElementById('api-token').value = apiToken;
  document.getElementById('default-comp').value = defaultComp;
  document.getElementById('comp-name').value = defaultComp;
  
  setBaseURL(serverUrl);
}

async function saveSettings() {
  const config = {
    serverUrl: document.getElementById('server-url').value || 'http://localhost:4001',
    apiToken: document.getElementById('api-token').value || '',
  };
  
  const defaultComp = document.getElementById('default-comp').value;
  localStorage.setItem('defaultComp', defaultComp);
  
  updateApiConfig(config);
  showStatus('Settings saved', 'success');
  
  setTimeout(hideStatus, 2000);
}

async function testConnection() {
  try {
    const result = await healthCheck();
    alert('Connection successful!\n\n' + JSON.stringify(result, null, 2));
  } catch (error) {
    alert('Connection failed:\n\n' + error.message);
  }
}

async function performSearch() {
  const query = document.getElementById('search-input').value.trim();
  
  if (!query) {
    alert('Bitte geben Sie einen Suchbegriff ein');
    return;
  }

  try {
    document.getElementById('search-btn').disabled = true;
    const resultsContainer = document.getElementById('results-container');
    resultsContainer.innerHTML = '<div class="loading">Searching...</div>';

    const results = await searchScenes(query);
    state.searchResults = results;

    if (results.length === 0) {
      resultsContainer.innerHTML = '<div class="empty-state">No results found</div>';
      document.getElementById('results-count').textContent = '0 Ergebnisse';
    } else {
      displayResults(results);
      document.getElementById('results-count').textContent = results.length + ' Ergebnisse';
    }
  } catch (error) {
    alert('Search error: ' + error.message);
    document.getElementById('results-container').innerHTML = '<div class="empty-state">Search failed</div>';
  } finally {
    document.getElementById('search-btn').disabled = false;
  }
}

function displayResults(results) {
  const container = document.getElementById('results-container');
  container.innerHTML = '';
  
  state.selectedIndices = [];

  results.forEach((result, index) => {
    const item = document.createElement('div');
    item.className = 'result-item';
    
    const title = result.videoTitle || 'Unknown';
    const startTime = formatTime(result.startTime);
    const endTime = formatTime(result.endTime);
    const duration = formatDuration(result.startTime, result.endTime);

    item.innerHTML = `
      <label style="display: flex; align-items: flex-start; cursor: pointer;">
        <input type="checkbox" data-index="${index}" style="margin-right: 8px; margin-top: 2px;" />
        <div style="flex: 1;">
          <div class="result-title">${escapeHtml(title)}</div>
          <div class="result-info">${startTime} - ${endTime} (${duration})</div>
          <div style="font-size: 11px; color: #aaa; margin-top: 4px;">
            ${escapeHtml(result.content ? result.content.substring(0, 100) : '')}...
          </div>
        </div>
      </label>
    `;

    const checkbox = item.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', function() {
      updateSelected(this);
    });

    container.appendChild(item);
  });

  updateInsertUI();
}

function updateSelected(checkbox) {
  const index = parseInt(checkbox.getAttribute('data-index'));
  
  if (checkbox.checked) {
    state.selectedIndices.push(index);
  } else {
    state.selectedIndices = state.selectedIndices.filter(i => i !== index);
  }

  updateInsertUI();
}

function updateInsertUI() {
  const count = state.selectedIndices.length;
  document.getElementById('selected-count').textContent = count;
  
  const insertOptions = document.getElementById('insert-options');
  if (count > 0) {
    insertOptions.classList.remove('hidden');
  } else {
    insertOptions.classList.add('hidden');
  }
}

function updateCompNameVisibility() {
  const select = document.getElementById('target-comp');
  const container = document.getElementById('comp-name-container');
  
  if (select.value === 'new') {
    container.classList.remove('hidden');
  } else {
    container.classList.add('hidden');
  }
}

function updateGapVisibility() {
  const checkbox = document.getElementById('sequential-check');
  const container = document.getElementById('gap-container');
  
  if (checkbox.checked) {
    container.classList.remove('hidden');
  } else {
    container.classList.add('hidden');
  }
}

async function insertSelectedScenes() {
  if (state.isProcessing) {
    return;
  }

  if (state.selectedIndices.length === 0) {
    alert('Bitte wählen Sie mindestens ein Ergebnis aus');
    return;
  }

  try {
    state.isProcessing = true;
    showStatus('Adding scenes...');

    const createNew = document.getElementById('target-comp').value === 'new';
    const compName = document.getElementById('comp-name').value;
    const sequential = document.getElementById('sequential-check').checked;
    const gapFrames = parseInt(document.getElementById('gap-frames').value) || 0;

    const scenesToInsert = state.selectedIndices.map(index => state.searchResults[index]);

    // Send to ExtendScript
    const data = {
      scenes: scenesToInsert,
      options: {
        createNewComp: createNew,
        compName: compName,
        sequential: sequential,
        gapFrames: gapFrames
      }
    };

    const result = await new Promise((resolve, reject) => {
      csInterface.evalScript('importScenes(' + JSON.stringify(data) + ')', (res) => {
        if (res === 'success' || res === 'Error') {
          resolve(res);
        } else {
          reject(new Error(res));
        }
      });
    });
    
    if (result === 'success') {
      alert('Successfully added ' + scenesToInsert.length + ' scene(s)!');
      hideStatus();
      state.selectedIndices = [];
      updateInsertUI();
    } else {
      throw new Error(result);
    }
  } catch (error) {
    alert('Insert error: ' + error.message);
  } finally {
    state.isProcessing = false;
  }
}

function cancelOperation() {
  state.isProcessing = false;
  hideStatus();
}

function showStatus(message, type = 'info') {
  document.getElementById('status-text').textContent = message;
  document.getElementById('status-bar').classList.remove('hidden');
  
  if (type === 'success') {
    document.getElementById('progress-fill').style.background = '#4caf50';
  }
}

function hideStatus() {
  document.getElementById('status-bar').classList.add('hidden');
  document.getElementById('progress-fill').style.width = '0%';
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + ':' + String(seconds).padStart(2, '0');
}

function formatDuration(startMs, endMs) {
  const duration = (endMs - startMs) / 1000;
  return duration.toFixed(1) + 's';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Init will be called after CSInterface is ready
// Theme listener will be set up in init()

