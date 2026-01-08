<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { currentLocale } from '$lib/i18n';
  import type { ReframeOptions } from '../api/saliency';
  
  export let show = false;
  export let progress = 0;
  export let processing = false;
  
  const dispatch = createEventDispatcher<{
    reframe: ReframeOptions;
    close: void;
  }>();
  
  let aspectRatio = '9:16';
  let customWidth = '';
  let customHeight = '';
  let smoothingFactor = 0.3;
  
  $: presets = $currentLocale === 'en' ? [
    { label: '9:16 (Vertical)', value: '9:16' },
    { label: '16:9 (Horizontal)', value: '16:9' },
    { label: '1:1 (Square)', value: '1:1' },
    { label: 'Custom', value: 'custom' }
  ] : [
    { label: '9:16 (Hochformat)', value: '9:16' },
    { label: '16:9 (Querformat)', value: '16:9' },
    { label: '1:1 (Quadratisch)', value: '1:1' },
    { label: 'Benutzerdefiniert', value: 'custom' }
  ];
  
  function handleReframe() {
    const options: ReframeOptions = {
      aspectRatio,
      smoothingFactor
    };
    
    if (aspectRatio === 'custom') {
      if (!customWidth || !customHeight) {
        alert($currentLocale === 'en' ? 'Please enter both width and height for custom aspect ratio' : 'Bitte geben Sie Breite und Höhe für benutzerdefiniertes Seitenverhältnis ein');
        return;
      }
      options.customWidth = parseInt(customWidth);
      options.customHeight = parseInt(customHeight);
    }
    
    dispatch('reframe', options);
  }
  
  function handleClose() {
    dispatch('close');
  }
  
  function formatSmoothingValue(value: number): string {
    if ($currentLocale === 'en') {
      if (value === 0) return 'No smoothing';
      if (value <= 0.3) return 'Light smoothing';
      if (value <= 0.6) return 'Medium smoothing';
      return 'Heavy smoothing';
    } else {
      if (value === 0) return 'Keine Glättung';
      if (value <= 0.3) return 'Leichte Glättung';
      if (value <= 0.6) return 'Mittlere Glättung';
      return 'Starke Glättung';
    }
  }
</script>

{#if show}
<div class="modal-overlay" on:click={handleClose}>
  <div class="modal-content glass-card" on:click|stopPropagation>
    <div class="modal-header">
      <h2>{$currentLocale === 'en' ? 'Reframe Video' : 'Video umrahmen'}</h2>
      <button class="close-button" on:click={handleClose}>×</button>
    </div>
    
    <div class="modal-body">
      <div class="form-group">
        <label for="aspect-ratio">{$currentLocale === 'en' ? 'Aspect Ratio' : 'Seitenverhältnis'}</label>
        <select id="aspect-ratio" bind:value={aspectRatio}>
          {#each presets as preset}
            <option value={preset.value}>{preset.label}</option>
          {/each}
        </select>
      </div>
      
      {#if aspectRatio === 'custom'}
        <div class="form-group">
          <label>{$currentLocale === 'en' ? 'Custom Dimensions' : 'Benutzerdefinierte Abmessungen'}</label>
          <div class="form-row">
            <input 
              type="number" 
              bind:value={customWidth} 
              placeholder={$currentLocale === 'en' ? 'Width' : 'Breite'} 
              min="1"
              class="custom-input"
            />
            <span class="separator">:</span>
            <input 
              type="number" 
              bind:value={customHeight} 
              placeholder={$currentLocale === 'en' ? 'Height' : 'Höhe'} 
              min="1"
              class="custom-input"
            />
          </div>
          <small class="form-help">{$currentLocale === 'en' ? 'Enter width and height for custom aspect ratio' : 'Breite und Höhe für benutzerdefiniertes Seitenverhältnis eingeben'}</small>
        </div>
      {/if}
      
      <div class="form-group">
        <label for="smoothing">{$currentLocale === 'en' ? 'Smoothing Factor:' : 'Glättungsfaktor:'} {smoothingFactor}</label>
        <input 
          id="smoothing"
          type="range" 
          min="0" 
          max="1" 
          step="0.1" 
          bind:value={smoothingFactor}
          class="slider"
        />
        <small class="form-help">{formatSmoothingValue(smoothingFactor)}</small>
      </div>
      
      {#if processing}
        <div class="progress-section">
          <div class="progress-bar">
            <div class="progress-fill" style="width: {progress}%"></div>
          </div>
          <p class="progress-text">{$currentLocale === 'en' ? 'Processing:' : 'Verarbeitung:'} {Math.round(progress)}%</p>
        </div>
      {:else}
        <div class="modal-actions">
          <button on:click={handleClose} class="glass-button secondary">
            {$currentLocale === 'en' ? 'Cancel' : 'Abbrechen'}
          </button>
          <button on:click={handleReframe} class="glass-button primary">
            {$currentLocale === 'en' ? 'Start Reframing' : 'Starten'}
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal-content {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 0;
    max-width: min(500px, 95vw);
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  @media (max-width: 768px) {
    .modal-content {
      width: 95%;
      max-height: 85vh;
      padding: 0;
    }
    
    .modal-header {
      padding: 1rem 1rem 0;
    }
    
    .modal-header h2 {
      font-size: 1.25rem;
    }
    
    .modal-body {
      padding: 0 1rem 1rem;
    }
    
    .form-group input,
    .form-group select,
    .form-group textarea {
      font-size: 16px;
    }
  }
  
  @media (max-width: 640px) {
    .modal-content {
      width: 100%;
      max-width: none;
      border-radius: 0;
      max-height: 100vh;
    }
    
    .modal-actions {
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .glass-button {
      width: 100%;
    }
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 1.5rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 1.5rem;
  }
  
  .modal-header h2 {
    margin: 0;
    color: white;
    font-size: 1.5rem;
    font-weight: 600;
  }
  
  .close-button {
    background: none;
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  
  .close-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .modal-body {
    padding: 0 1.5rem 1.5rem;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  .form-group label {
    display: block;
    color: white;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }
  
  .form-group select,
  .form-group input {
    width: 100%;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: white;
    font-size: 1rem;
  }
  
  .form-group select:focus,
  .form-group input:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.15);
  }
  
  .form-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .custom-input {
    flex: 1;
  }
  
  .separator {
    color: white;
    font-weight: bold;
  }
  
  .slider {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    outline: none;
    -webkit-appearance: none;
  }
  
  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    cursor: pointer;
  }
  
  .slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }
  
  .form-help {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.875rem;
    margin-top: 0.25rem;
    display: block;
  }
  
  .progress-section {
    margin-top: 1rem;
  }
  
  .progress-bar {
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4f46e5, #7c3aed);
    transition: width 0.3s ease;
  }
  
  .progress-text {
    color: white;
    text-align: center;
    margin: 0;
    font-size: 0.875rem;
  }
  
  .modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
  }
  
  .glass-button {
    padding: 0.75rem 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    backdrop-filter: blur(10px);
  }
  
  .glass-button:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
  }
  
  .glass-button.primary {
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    border-color: #4f46e5;
  }
  
  .glass-button.primary:hover {
    background: linear-gradient(135deg, #5b52f0, #8b4cf0);
  }
  
  .glass-button.secondary {
    background: rgba(255, 255, 255, 0.05);
  }
  
  .glass-button.secondary:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .glass-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
