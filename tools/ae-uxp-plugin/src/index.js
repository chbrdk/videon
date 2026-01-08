// Main entry point for UXP Panel

import { SearchApiClient } from './api.js';
import { AEIntegration } from './ae.js';
import { formatTime, formatDuration, debounce } from './utils.js';

class SceneSearchPanel {
  constructor() {
    this.apiClient = new SearchApiClient();
    this.aeIntegration = new AEIntegration();
    this.selectedResults = new Set();
    this.isProcessing = false;
    this.currentProgress = null;

    this.initializeElements();
    this.attachEventListeners();
    this.loadSettings();
    this.loadCompositions();
  }

  initializeElements() {
    // Settings
    this.settingsPanel = document.getElementById('settings-panel');
    this.settingsToggle = document.getElementById('settings-toggle');
    this.serverUrlInput = document.getElementById('server-url');
    this.apiTokenInput = document.getElementById('api-token');
    this.defaultCompInput = document.getElementById('default-comp');
    this.settingsSaveBtn = document.getElementById('settings-save');

    // Search
    this.searchInput = document.getElementById('search-input');
    this.searchBtn = document.getElementById('search-btn');

    // Results
    this.resultsContainer = document.getElementById('results-container');
    this.resultsTitle = document.getElementById('results-title');
    this.resultsCount = document.getElementById('results-count');
    this.selectedCount = document.getElementById('selected-count');

    // Insert options
    this.insertOptions = document.getElementById('insert-options');
    this.targetCompSelect = document.getElementById('target-comp');
    this.sequentialCheckbox = document.getElementById('sequential-placement');
    this.gapFramesInput = document.getElementById('gap-frames');
    this.gapContainer = document.getElementById('gap-container');
    this.insertBtn = document.getElementById('insert-btn');

    // Status
    this.statusBar = document.getElementById('status-bar');
    this.statusText = document.getElementById('status-text');
    this.cancelBtn = document.getElementById('cancel-btn');
    this.progressFill = document.getElementById('progress-fill');
  }

  attachEventListeners() {
    // Settings toggle
    this.settingsToggle.addEventListener('click', () => {
      this.settingsPanel.classList.toggle('hidden');
    });

    // Save settings
    this.settingsSaveBtn.addEventListener('click', async () => {
      await this.saveSettings();
    });

    // Search
    this.searchBtn.addEventListener('click', () => this.handleSearch());
    this.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleSearch();
      }
    });

    // Sequential placement toggle
    this.sequentialCheckbox.addEventListener('change', (e) => {
      this.gapContainer.classList.toggle('hidden', !e.target.checked);
    });

    // Insert
    this.insertBtn.addEventListener('click', () => this.handleInsert());
    this.cancelBtn.addEventListener('click', () => this.cancelOperation());

    // Load API config
    this.apiClient.loadConfig().then(() => {
      this.serverUrlInput.value = this.apiClient.getConfig().serverUrl;
      this.apiTokenInput.value = this.apiClient.getConfig().apiToken || '';
      this.defaultCompInput.value = localStorage.getItem('default_comp') || 'Search Results';
    });
  }

  async loadCompositions() {
    try {
      const compositions = await this.aeIntegration.getCompositions();
      
      // Clear existing options (except "new" option)
      this.targetCompSelect.innerHTML = '<option value="new">Neue Komposition erstellen</option>';
      
      // Add existing compositions
      compositions.forEach(comp => {
        const option = document.createElement('option');
        option.value = comp.name;
        option.textContent = comp.name;
        this.targetCompSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading compositions:', error);
      this.showError('Fehler beim Laden der Kompositionen');
    }
  }

  async loadSettings() {
    const defaultComp = localStorage.getItem('default_comp');
    if (defaultComp) {
      this.defaultCompInput.value = defaultComp;
    }
  }

  async saveSettings() {
    const config = {
      serverUrl: this.serverUrlInput.value || 'http://localhost:4001',
      apiToken: this.apiTokenInput.value || undefined,
    };

    await this.apiClient.saveConfig(config);
    localStorage.setItem('default_comp', this.defaultCompInput.value);
    
    // Test connection
    const isConnected = await this.apiClient.testConnection();
    if (isConnected) {
      this.showStatus('Verbindung erfolgreich', 'success');
    } else {
      this.showError('Verbindung fehlgeschlagen. Bitte Server URL prüfen.');
    }
  }

  async handleSearch() {
    const query = this.searchInput.value.trim();
    
    if (!query) {
      this.showError('Bitte geben Sie einen Suchbegriff ein');
      return;
    }

    this.searchBtn.disabled = true;
    this.resultsContainer.innerHTML = '<div class="loading">Suche...</div>';

    try {
      const results = await this.apiClient.search(query);
      
      if (results.length === 0) {
        this.resultsContainer.innerHTML = '<div class="empty-state">Keine Ergebnisse gefunden</div>';
        this.resultsCount.textContent = '0 Ergebnisse';
      } else {
        this.displayResults(results);
        this.resultsCount.textContent = `${results.length} Ergebnis${results.length !== 1 ? 'se' : ''}`;
      }
    } catch (error) {
      this.showError(`Suchfehler: ${error.message}`);
      this.resultsContainer.innerHTML = '<div class="empty-state">Fehler bei der Suche</div>';
    } finally {
      this.searchBtn.disabled = false;
    }
  }

  displayResults(results) {
    this.selectedResults.clear();
    this.resultsContainer.innerHTML = '';
    this.updateInsertUI();

    results.forEach((result, index) => {
      const item = this.createResultItem(result, index);
      this.resultsContainer.appendChild(item);
    });
  }

  createResultItem(result, index) {
    const div = document.createElement('div');
    div.className = 'result-item';
    div.dataset.index = index;

    const duration = formatDuration(result.startTime, result.endTime);
    const startTime = formatTime(result.startTime);
    const endTime = formatTime(result.endTime);

    div.innerHTML = `
      <input type="checkbox" id="result-${index}" data-index="${index}">
      <div class="result-content">
        <div class="result-title">${this.escapeHtml(result.videoTitle)}</div>
        <div class="result-info">
          <span>${startTime} - ${endTime}</span>
          <span class="result-duration">${duration}</span>
        </div>
        <div class="result-snippet">${this.escapeHtml(result.content)}</div>
      </div>
    `;

    const checkbox = div.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        this.selectedResults.add(index);
      } else {
        this.selectedResults.delete(index);
      }
      this.updateInsertUI();
    });

    return div;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  updateInsertUI() {
    const count = this.selectedResults.size;
    this.selectedCount.textContent = count;
    
    if (count > 0) {
      this.insertOptions.classList.remove('hidden');
    } else {
      this.insertOptions.classList.add('hidden');
    }
  }

  async handleInsert() {
    if (this.isProcessing) {
      return;
    }

    const selectedIndices = Array.from(this.selectedResults);
    if (selectedIndices.length === 0) {
      this.showError('Bitte wählen Sie mindestens ein Ergebnis aus');
      return;
    }

    // Get selected results (would need to store results array)
    const results = this.currentResults.filter((_, idx) => selectedIndices.includes(idx));

    const options = {
      targetComp: this.targetCompSelect.value === 'new' 
        ? this.defaultCompInput.value || 'Search Results'
        : this.targetCompSelect.value,
      sequential: this.sequentialCheckbox.checked,
      gapFrames: parseInt(this.gapFramesInput.value) || 0,
    };

    this.isProcessing = true;
    this.showStatus(`Füge ${results.length} Szene${results.length !== 1 ? 'n' : ''} hinzu...`);

    try {
      await this.aeIntegration.insertScenes(results, options, (current, total, status) => {
        this.updateProgress(current, total, status);
      });

      this.showStatus('Alle Szenen erfolgreich hinzugefügt!', 'success');
      
      // Reset after delay
      setTimeout(() => {
        this.hideStatus();
        this.selectedResults.clear();
        this.updateInsertUI();
      }, 2000);
    } catch (error) {
      this.showError(`Fehler beim Einfügen: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  updateProgress(current, total, status) {
    const percent = Math.round((current / total) * 100);
    this.progressFill.style.width = `${percent}%`;
    this.statusText.textContent = status;
  }

  showStatus(message, type = 'info') {
    this.statusBar.classList.remove('hidden');
    this.statusText.textContent = message;
    
    if (type === 'success') {
      this.statusBar.style.borderColor = '#4caf50';
      this.progressFill.style.background = '#4caf50';
    }
  }

  hideStatus() {
    this.statusBar.classList.add('hidden');
    this.progressFill.style.width = '0%';
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    this.resultsContainer.insertBefore(errorDiv, this.resultsContainer.firstChild);
    
    setTimeout(() => errorDiv.remove(), 5000);
  }

  cancelOperation() {
    this.isProcessing = false;
    this.hideStatus();
  }
}

// Global variable to store current results
let currentResults = [];
window.currentResults = currentResults;

// Initialize panel when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.panel = new SceneSearchPanel();
  });
} else {
  window.panel = new SceneSearchPanel();
}

