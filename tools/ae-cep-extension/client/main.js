// PrismVid Scene Search - CEP Controller

(function() {
  'use strict';

  // CSInterface for communication with AE
  var csInterface = new CSInterface();

  // Application state
  var state = {
    searchResults: [],
    selectedIndices: [],
    isProcessing: false
  };

  // Initialize
  function init() {
    setupEventListeners();
  }

  function setupEventListeners() {
    // Settings toggle
    document.getElementById('settings-toggle').addEventListener('click', toggleSettings);
    document.getElementById('test-btn').addEventListener('click', testConnection);
    document.getElementById('search-btn').addEventListener('click', performSearch);
    
    // Search input
    document.getElementById('search-input').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        performSearch();
      }
    });

    // Insert options
    document.getElementById('target-comp').addEventListener('change', updateCompNameVisibility);
    document.getElementById('sequential-check').addEventListener('change', updateGapVisibility);
    document.getElementById('insert-btn').addEventListener('click', insertSelectedScenes);
    document.getElementById('cancel-btn').addEventListener('click', cancelOperation);
  }

  function toggleSettings() {
    var panel = document.getElementById('settings-panel');
    panel.classList.toggle('hidden');
  }

  async function testConnection() {
    try {
      var serverUrl = document.getElementById('server-url').value;
      var response = await fetch(serverUrl + '/health');
      
      if (response.ok) {
        alert('Connection successful!');
      } else {
        alert('Connection failed. Please check:\n\n1. Proxy server is running\n2. Backend is running\n3. URL is correct');
      }
    } catch (error) {
      alert('Connection error: ' + error.message);
    }
  }

  async function performSearch() {
    var query = document.getElementById('search-input').value.trim();
    
    if (!query) {
      alert('Please enter a search query');
      return;
    }

    try {
      document.getElementById('search-btn').disabled = true;
      var resultsContainer = document.getElementById('results-container');
      resultsContainer.innerHTML = '<div class="empty-state">Searching...</div>';

      var serverUrl = document.getElementById('server-url').value;
      var searchUrl = serverUrl + '/proxy/search?q=' + encodeURIComponent(query);
      
      var response = await fetch(searchUrl);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }

      var results = await response.json();
      state.searchResults = results;

      if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="empty-state">No results found</div>';
      } else {
        displayResults(results);
      }
    } catch (error) {
      alert('Search error: ' + error.message);
      document.getElementById('results-container').innerHTML = '<div class="empty-state">Search failed</div>';
    } finally {
      document.getElementById('search-btn').disabled = false;
    }
  }

  function displayResults(results) {
    var container = document.getElementById('results-container');
    container.innerHTML = '';
    
    state.selectedIndices = [];

    results.forEach(function(result, index) {
      var item = document.createElement('div');
      item.className = 'result-item';
      
      var title = result.videoTitle || 'Unknown';
      var startTime = formatTime(result.startTime);
      var endTime = formatTime(result.endTime);
      var duration = formatDuration(result.startTime, result.endTime);

      item.innerHTML = `
        <label style="display: flex; align-items: flex-start; cursor: pointer;">
          <input type="checkbox" data-index="${index}" style="margin-right: 8px; margin-top: 2px;" />
          <div>
            <div class="result-title">${escapeHtml(title)}</div>
            <div class="result-info">${startTime} - ${endTime} (${duration})</div>
            <div style="font-size: 11px; color: #aaa; margin-top: 4px;">${escapeHtml(result.content.substring(0, 100))}...</div>
          </div>
        </label>
      `;

      var checkbox = item.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', function() {
        updateSelected(this);
      });

      container.appendChild(item);
    });

    updateInsertUI();
    document.getElementById('results-count').textContent = results.length + ' Ergebnisse';
  }

  function updateSelected(checkbox) {
    var index = parseInt(checkbox.getAttribute('data-index'));
    
    if (checkbox.checked) {
      state.selectedIndices.push(index);
    } else {
      state.selectedIndices = state.selectedIndices.filter(function(i) { return i !== index; });
    }

    updateInsertUI();
  }

  function updateInsertUI() {
    var count = state.selectedIndices.length;
    document.getElementById('selected-count').textContent = count;
    
    var insertOptions = document.getElementById('insert-options');
    if (count > 0) {
      insertOptions.classList.remove('hidden');
    } else {
      insertOptions.classList.add('hidden');
    }
  }

  function updateCompNameVisibility() {
    var select = document.getElementById('target-comp');
    var label = document.getElementById('comp-name-label');
    
    if (select.value === 'new') {
      label.classList.remove('hidden');
    } else {
      label.classList.add('hidden');
    }
  }

  function updateGapVisibility() {
    var checkbox = document.getElementById('sequential-check');
    var label = document.getElementById('gap-label');
    
    if (checkbox.checked) {
      label.classList.remove('hidden');
    } else {
      label.classList.add('hidden');
    }
  }

  async function insertSelectedScenes() {
    if (state.isProcessing) {
      return;
    }

    if (state.selectedIndices.length === 0) {
      alert('Please select at least one scene');
      return;
    }

    try {
      state.isProcessing = true;
      showStatus('Adding scenes...');

      var createNew = document.getElementById('target-comp').value === 'new';
      var compName = document.getElementById('comp-name').value;
      var sequential = document.getElementById('sequential-check').checked;
      var gapFrames = parseInt(document.getElementById('gap-frames').value) || 0;

      var scenesToInsert = state.selectedIndices.map(function(index) {
        return state.searchResults[index];
      });

      // Send to ExtendScript
      var data = {
        scenes: scenesToInsert,
        options: {
          createNewComp: createNew,
          compName: compName,
          sequential: sequential,
          gapFrames: gapFrames
        }
      };

      var result = await csInterface.evalScript('importScenes(' + JSON.stringify(data) + ')');
      
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

  function showStatus(message) {
    document.getElementById('status-text').textContent = message;
    document.getElementById('status-bar').classList.remove('hidden');
  }

  function hideStatus() {
    document.getElementById('status-bar').classList.add('hidden');
  }

  function formatTime(ms) {
    var totalSeconds = Math.floor(ms / 1000);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return minutes + ':' + String(seconds).padStart(2, '0');
  }

  function formatDuration(startMs, endMs) {
    var duration = (endMs - startMs) / 1000;
    return duration.toFixed(1) + 's';
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize on load
  window.addEventListener('load', init);

})();

