<script lang="ts">
  import { trackConfigs } from '$lib/stores/timeline.store';
  import { trackConfigs } from '$lib/stores/timeline.store';
  import { MaterialSymbol } from '$lib/components/ui';
  import { _ } from '$lib/i18n';

  function toggleTrackVisibility(trackId: string) {
    trackConfigs.update(tracks =>
      tracks.map(t => (t.id === trackId ? { ...t, visible: !t.visible } : t))
    );
  }

  function reorderTrack(trackId: string, direction: 'up' | 'down') {
    trackConfigs.update(tracks => {
      const index = tracks.findIndex(t => t.id === trackId);
      if (index === -1) return tracks;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= tracks.length) return tracks;

      const newTracks = [...tracks];
      [newTracks[index], newTracks[newIndex]] = [newTracks[newIndex], newTracks[index]];

      return newTracks.map((t, i) => ({ ...t, order: i }));
    });
  }

  function updateTrackHeight(trackId: string, newHeight: number) {
    trackConfigs.update(tracks =>
      tracks.map(t =>
        t.id === trackId ? { ...t, height: Math.max(30, Math.min(200, newHeight)) } : t
      )
    );
  }

  function toggleTrackLock(trackId: string) {
    trackConfigs.update(tracks =>
      tracks.map(t => (t.id === trackId ? { ...t, locked: !t.locked } : t))
    );
  }

  function getTrackIcon(trackType: string): string {
    switch (trackType) {
      case 'scenes':
        return 'movie';
      case 'transcription':
        return 'mic';
      case 'waveform':
        return 'graphic_eq';
      case 'markers':
        return 'flag';
      default:
        return 'folder';
    }
  }
</script>

<div class="track-config-panel">
  <div class="panel-header">
    <h4>{_('trackConfig.title')}</h4>
    <p class="panel-subtitle">{_('trackConfig.subtitle')}</p>
  </div>

  <div class="tracks-list">
    {#each $trackConfigs.sort((a, b) => a.order - b.order) as track (track.id)}
      <div class="track-config-item" class:locked={track.locked}>
        <div class="track-main">
          <div class="track-info">
            <span class="track-icon"
              ><MaterialSymbol icon={getTrackIcon(track.type)} fontSize={20} /></span
            >
            <span class="track-name">{track.label}</span>
            {#if track.locked}
              <span class="lock-indicator" title={_('trackConfig.locked')}
                ><MaterialSymbol icon="lock" fontSize={16} /></span
              >
            {/if}
          </div>

          <div class="track-controls">
            <!-- Visibility Toggle -->
            <button
              class="control-btn visibility-btn"
              class:active={track.visible}
              on:click={() => toggleTrackVisibility(track.id)}
              title={track.visible ? _('trackConfig.hideTrack') : _('trackConfig.showTrack')}
            >
              <MaterialSymbol
                icon={track.visible ? 'visibility' : 'visibility_off'}
                fontSize={18}
              />
            </button>

            <!-- Lock Toggle -->
            <button
              class="control-btn lock-btn"
              class:active={track.locked}
              on:click={() => toggleTrackLock(track.id)}
              title={track.locked ? _('trackConfig.unlockTrack') : _('trackConfig.lockTrack')}
            >
              <MaterialSymbol icon={track.locked ? 'lock' : 'lock_open'} fontSize={18} />
            </button>

            <!-- Reorder Controls -->
            <div class="reorder-controls">
              <button
                class="control-btn reorder-btn"
                on:click={() => reorderTrack(track.id, 'up')}
                disabled={track.order === 0}
                title={_('trackConfig.moveUp')}
              >
                <MaterialSymbol icon="arrow_upward" fontSize={16} />
              </button>
              <button
                class="control-btn reorder-btn"
                on:click={() => reorderTrack(track.id, 'down')}
                disabled={track.order === $trackConfigs.length - 1}
                title={_('trackConfig.moveDown')}
              >
                <MaterialSymbol icon="arrow_downward" fontSize={16} />
              </button>
            </div>
          </div>
        </div>

        <!-- Height Control -->
        <div class="track-height-control">
          <label class="height-label">{_('trackConfig.height')}: {track.height}px</label>
          <input
            type="range"
            min="30"
            max="200"
            value={track.height}
            on:input={e => updateTrackHeight(track.id, parseInt(e.target.value))}
            class="height-slider"
            disabled={track.locked}
          />
        </div>
      </div>
    {/each}
  </div>

  <div class="panel-footer">
    <p class="help-text">
      {_('trackConfig.help')}
    </p>
  </div>
</div>

<style lang="postcss">
  .track-config-panel {
    backdrop-filter: blur(20px);
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1rem;
    margin: 1rem 0;
  }

  .panel-header {
    margin-bottom: 1rem;
  }

  .panel-header h4 {
    color: white;
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 0.25rem 0;
  }

  .panel-subtitle {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.875rem;
    margin: 0;
  }

  .tracks-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .track-config-item {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 0.75rem;
    transition: all 0.2s ease;
  }

  .track-config-item:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .track-config-item.locked {
    background: rgba(100, 100, 100, 0.1);
    border-color: rgba(100, 100, 100, 0.3);
    opacity: 0.7;
  }

  .track-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .track-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .track-icon {
    font-size: 1.2rem;
  }

  .track-name {
    color: white;
    font-weight: 500;
    font-size: 0.9rem;
  }

  .lock-indicator {
    font-size: 0.8rem;
    opacity: 0.7;
  }

  .track-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .control-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 0.375rem;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.875rem;
    min-width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .control-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
  }

  .control-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .control-btn.active {
    background: rgba(100, 150, 255, 0.3);
    border-color: rgba(100, 150, 255, 0.6);
  }

  .visibility-btn.active {
    background: rgba(100, 255, 100, 0.3);
    border-color: rgba(100, 255, 100, 0.6);
  }

  .lock-btn.active {
    background: rgba(255, 100, 100, 0.3);
    border-color: rgba(255, 100, 100, 0.6);
  }

  .reorder-controls {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .reorder-btn {
    font-size: 0.7rem;
    padding: 0.25rem;
    min-width: 24px;
    height: 24px;
  }

  .track-height-control {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .height-label {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.8rem;
    min-width: 80px;
  }

  .height-slider {
    flex: 1;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }

  .height-slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    background: rgba(100, 150, 255, 0.8);
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .height-slider::-webkit-slider-thumb:hover {
    background: rgba(100, 150, 255, 1);
    transform: scale(1.1);
  }

  .height-slider:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .panel-footer {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .help-text {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.8rem;
    margin: 0;
    line-height: 1.4;
  }
</style>
