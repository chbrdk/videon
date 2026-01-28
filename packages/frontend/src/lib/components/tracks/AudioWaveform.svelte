<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { api } from '$lib/config/environment';
  
  export let audioStemId: string;
  export let stemType: 'vocals' | 'music' | 'original' | 'drums' | 'bass';
  export let startTime: number;
  export let endTime: number;
  export let width: number = 200;
  export let height: number = 32;
  
  // Parse height if it's a string with calc
  $: actualHeight = typeof height === 'string' ? 32 : height;
  $: actualWidth = width > 0 ? width : 1;
  export let color: string = '';
  export let showPeaks: boolean = true;
  export let showSilence: boolean = true;
  
  let canvas: HTMLCanvasElement;
  let waveformData: any = null;
  let isLoading: boolean = true;
  let error: string = '';
  
  // Farben für verschiedene Stem-Typen (gedämpft, weniger knallig)
  const stemColors = {
    vocals: '#cc7777',
    music: '#77cc77', 
    original: '#7777cc',
    drums: '#cc9966',
    bass: '#9966cc'
  };
  
  $: waveformColor = color || stemColors[stemType] || '#666666';
  $: duration = endTime - startTime;
  
  onMount(() => {
    loadWaveformData();
  });
  
  async function loadWaveformData() {
    // Don't load if width is 0 or invalid
    if (actualWidth <= 0) {
      console.warn('🎵 Skipping waveform load - invalid width:', actualWidth);
      return;
    }
    
    try {
      isLoading = true;
      error = '';
      
      // Verwende eine feste Breite für Waveform-Peaks (max 10000px für detaillierte Waveforms)
      const waveformWidth = Math.min(actualWidth, 10000);
      
      console.log('🎵 Loading waveform with width:', waveformWidth, 'actualWidth:', actualWidth);
      
      // Versuche zuerst Audio-Stem Waveform zu laden (mit cache-busting)
      const timestamp = Date.now();
      // Don't pass startTime/endTime for full waveform - only when explicitly trimming
      const timeParams = (startTime > 0 || endTime < Infinity) 
        ? `&startTime=${startTime}&endTime=${endTime}` 
        : '';
      let response = await fetch(
        `${api.baseUrl}/audio-stems/${audioStemId}/waveform?width=${waveformWidth}${timeParams}&_t=${timestamp}`
      );
      
      if (!response.ok) {
        // Fallback: Versuche Video-Waveform zu laden (für Video-spezifische Stems)
        console.log('🎵 Audio-Stem waveform not available, trying video waveform...');
        
        // Hole Video-ID vom Audio-Stem
        const stemResponse = await fetch(`${api.baseUrl}/audio-stems/${audioStemId}`);
        if (stemResponse.ok) {
          const stemData = await stemResponse.json();
          const videoId = stemData.videoId;
          
          response = await fetch(
            `${api.baseUrl}/videos/${videoId}/waveform?width=${width}&startTime=${startTime}&endTime=${endTime}`
          );
        }
      }
      
      if (!response.ok) {
        throw new Error(`Failed to load waveform: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🎵 Waveform data loaded:', data);
      console.log('🎵 Full waveform data:', JSON.stringify(data, null, 2));
      
      // Extract waveform data from response
      if (data.waveform && data.waveform.peaks) {
        waveformData = data.waveform;
        console.log('🎵 Waveform peaks count:', data.waveform.peaks.length);
        console.log('🎵 First 10 actual peak values:', data.waveform.peaks.slice(0, 10));
      } else {
        console.error('🎵 Invalid waveform data structure:', data);
        throw new Error('Invalid waveform data structure');
      }
      
      // Rendere Waveform nach dem Laden
      await renderWaveform();
      
    } catch (err) {
      console.error('Failed to load waveform data:', err);
      error = err.message;
    } finally {
      isLoading = false;
    }
  }
  
  async function renderWaveform() {
    if (!canvas || !waveformData) {
      console.warn('🎵 Cannot render waveform: canvas or data missing', { canvas: !!canvas, waveformData });
      return;
    }
    
    console.log('🎵 Rendering waveform:', { actualWidth, actualHeight, peaks: waveformData.peaks?.length });
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('🎵 Cannot get canvas context');
      return;
    }
    
    // Canvas-Dimensionen setzen
    canvas.width = actualWidth;
    canvas.height = actualHeight;
    
    console.log('🎵 Canvas dimensions set:', { width: canvas.width, height: canvas.height });
    
    // Hintergrund löschen
    ctx.clearRect(0, 0, actualWidth, actualHeight);
    
    // Hintergrund (für Silence-Bereiche)
    if (showSilence) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, actualWidth, actualHeight);
    }
    
    // Waveform-Peaks rendern
    if (showPeaks && waveformData.peaks) {
      const peaks = waveformData.peaks;
      const centerY = actualHeight / 2;
      
      // Filter out invalid peaks and calculate max (safely for large arrays)
      const validPeaks = peaks.filter(p => typeof p === 'number' && !isNaN(p) && p >= 0);
      let maxPeak = 0;
      for (const peak of validPeaks) {
        if (peak > maxPeak) maxPeak = peak;
      }
      
      // Apply boost to make quiet audio more visible
      // Use square root to boost quiet peaks more than loud ones
      const boostFactor = maxPeak > 0 && maxPeak < 0.1 ? 1.5 : 1.0;
      
      // Normalize peaks to use full range if they're all low
      const minPeak = Math.min(...validPeaks);
      const dynamicRange = maxPeak - minPeak;
      
      console.log('🎵 Peak analysis:', { maxPeak, minPeak, dynamicRange, boostFactor });
      
      // Log actual peak values
      const samplePeaks = peaks.slice(0, 10);
      console.log('🎵 Rendering peaks:', { 
        peaksCount: peaks.length, 
        validPeaksCount: validPeaks.length,
        maxPeak, 
        centerY
      });
      console.log('🎵 Sample peaks:', samplePeaks);
      console.log('🎵 Peak value details:', samplePeaks.map(p => ({
        value: p,
        type: typeof p,
        isNaN: isNaN(p),
        isNumber: typeof p === 'number'
      })));
      
      if (maxPeak === 0) {
        console.warn('🎵 Warning: All peaks are 0 or invalid!');
        return; // Don't render if no valid peaks
      }
      
      ctx.strokeStyle = waveformColor + 'cc'; // Etwas transparenter für weniger knallig
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      // Normalize all peaks to use full dynamic range for better visibility
      const normalizedMaxPeak = dynamicRange > 0.001 ? dynamicRange : maxPeak;
      
      // Zeichne die obere Linie mit Skalierung und Boost
      let firstValidPeak = true;
      for (let i = 0; i < peaks.length; i++) {
        const peak = peaks[i];
        // Skip invalid peaks
        if (typeof peak !== 'number' || isNaN(peak) || peak < 0) continue;
        
        const x = (i / (peaks.length - 1)) * actualWidth;
        
        // Normalize peak to full dynamic range and apply boost for quiet audio
        const normalizedPeak = (peak - minPeak) / normalizedMaxPeak * boostFactor;
        const peakHeight = (normalizedPeak * (actualHeight / 2));
        
        if (firstValidPeak) {
          ctx.moveTo(x, centerY - peakHeight);
          firstValidPeak = false;
        } else {
          ctx.lineTo(x, centerY - peakHeight);
        }
      }
      
      // Untere Hälfte der Waveform
      for (let i = peaks.length - 1; i >= 0; i--) {
        const peak = peaks[i];
        // Skip invalid peaks
        if (typeof peak !== 'number' || isNaN(peak) || peak < 0) continue;
        
        const x = (i / (peaks.length - 1)) * actualWidth;
        
        // Normalize peak to full dynamic range and apply boost for quiet audio
        const normalizedPeak = (peak - minPeak) / normalizedMaxPeak * boostFactor;
        const peakHeight = (normalizedPeak * (actualHeight / 2));
        
        ctx.lineTo(x, centerY + peakHeight);
      }
      
      ctx.closePath();
      ctx.fillStyle = waveformColor + '30'; // Weniger knallig, mehr transparent
      ctx.fill();
      ctx.stroke();
    }
    
    // Zentrale Linie
    ctx.strokeStyle = waveformColor + '60'; // Weniger knallig
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, actualHeight / 2);
    ctx.lineTo(actualWidth, actualHeight / 2);
    ctx.stroke();
  }
  
  // Re-render bei Änderungen
  $: if (waveformData && canvas && actualWidth > 0 && actualHeight > 0) {
    console.log('🎵 Re-rendering waveform due to size change:', { actualWidth, actualHeight });
    renderWaveform();
  }
  
  // Refresh-Funktion für externe Aufrufe
  export function refresh() {
    loadWaveformData();
  }
</script>

<div class="audio-waveform" style="width: {actualWidth}px; height: {actualHeight}px;">
  {#if isLoading}
    <div class="loading">
      <div class="loading-spinner"></div>
    </div>
  {:else if error}
    <div class="error">
      <span>⚠️</span>
      <span>{error}</span>
    </div>
  {:else if actualWidth > 0 && actualHeight > 0}
    <canvas 
      bind:this={canvas}
      width={actualWidth}
      height={actualHeight}
      class="waveform-canvas"
    ></canvas>
  {/if}
</div>

<style>
  .audio-waveform {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border-radius: var(--msqdx-radius-xs);
    overflow: hidden;
  }
  
  .waveform-canvas {
    display: block;
    image-rendering: pixelated;
  }
  
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--msqdx-color-dark-text-secondary);
    font-size: var(--msqdx-font-size-sm);
    font-family: var(--msqdx-font-primary);
  }
  
  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--msqdx-color-dark-border);
    border-top: 2px solid var(--msqdx-color-brand-blue);
    border-radius: var(--msqdx-radius-full);
    animation: spin 1s linear infinite;
    margin-right: var(--msqdx-spacing-xs);
  }
  
  .error {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--msqdx-color-status-error);
    font-size: var(--msqdx-font-size-xs);
    font-family: var(--msqdx-font-primary);
    text-align: center;
    padding: var(--msqdx-spacing-xxs);
  }
  
  .error span:first-child {
    margin-right: 4px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>
