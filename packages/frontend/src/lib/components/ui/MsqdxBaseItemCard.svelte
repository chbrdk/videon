<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { MSQDX_COLORS, MSQDX_SPACING } from '$lib/design-tokens';
  import { MsqdxGlassCard, MaterialSymbol } from '$lib/components/ui';

  export let title: string;
  export let subtitle: string = '';
  export let type: 'video' | 'folder' | 'project' = 'video';
  export let thumbnailUrl: string = '';
  export let icon: string = '';
  export let selected = false;
  export let hoverable = true;
  export let className = '';

  const dispatch = createEventDispatcher();

  function handleMenuToggle(event: MouseEvent) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      dispatch('menuToggle', { x: event.clientX, y: event.clientY });
    }
  }

  function handleClick(event: MouseEvent) {
    dispatch('click', event);
  }

  $: defaultIcon = (() => {
    switch (type) {
      case 'folder':
        return 'folder';
      case 'project':
        return 'movie_edit';
      default:
        return 'movie';
    }
  })();

  $: iconColor = (() => {
    switch (type) {
      case 'folder':
        return MSQDX_COLORS.brand.orange;
      case 'project':
        return MSQDX_COLORS.brand.purple;
      default:
        return MSQDX_COLORS.brand.blue;
    }
  })();

  $: iconBg = (() => {
    switch (type) {
      case 'folder':
        return MSQDX_COLORS.tints.orange;
      case 'project':
        return MSQDX_COLORS.tints.purple;
      default:
        return MSQDX_COLORS.tints.blue;
    }
  })();
</script>

<MsqdxGlassCard
  {hoverable}
  noPadding={true}
  borderRadiusVariant="xxl"
  class="msqdx-base-card {className} {selected ? 'selected' : ''}"
  on:click={handleClick}
  on:contextmenu={handleMenuToggle}
  {...$$restProps}
  style="
    --border-color: {selected ? MSQDX_COLORS.brand.green : 'rgba(255, 255, 255, 0.1)'};
    --card-bg: {selected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'};
    {$$restProps.style || ''}
  "
>
  <div class="card-inner">
    <!-- Visual Area (Top) -->
    <div class="visual-area">
      {#if type === 'video'}
        <div
          class="thumbnail-container"
          style={thumbnailUrl ? `background-image: url(${thumbnailUrl});` : ''}
        >
          <div class="play-overlay">
            <MaterialSymbol icon="play_arrow" fontSize={48} />
          </div>
        </div>
      {:else}
        <div class="icon-container" style="background-color: {iconBg};">
          <MaterialSymbol icon={icon || defaultIcon} fontSize={48} style="color: {iconColor};" />
        </div>
      {/if}

      <!-- Top info layer (e.g. Status Chips handled by parent via slot if needed, or by type) -->
      <div class="overlay-info">
        <slot name="overlay" />
      </div>
    </div>

    <!-- Info Area (Bottom) -->
    <div class="info-area">
      <div class="info-text">
        <h3 class="title" {title}>{title}</h3>
        {#if subtitle}
          <p class="subtitle">{subtitle}</p>
        {/if}
      </div>

      <!-- Actions Button (Bottom Right) -->
      <div class="actions-container">
        <button
          class="menu-trigger"
          on:mousedown|stopPropagation={handleMenuToggle}
          on:click|stopPropagation
          title="More actions"
        >
          <MaterialSymbol icon="more_horiz" fontSize={24} />
        </button>
      </div>
    </div>

    <!-- Extra content (e.g. duration/size chips) -->
    <div class="extra-area">
      <slot name="extra" />
    </div>
  </div>
</MsqdxGlassCard>

<style>
  .card-inner {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    position: relative;
  }

  .visual-area {
    position: relative;
    aspect-ratio: 16 / 9;
    width: 100%;
    overflow: hidden;
    border-radius: var(--msqdx-radius-xxl) var(--msqdx-radius-xxl) 0 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.1);
  }

  .thumbnail-container {
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    transition: transform 0.3s ease;
  }

  :global(.msqdx-base-card:hover) .thumbnail-container {
    transform: scale(1.05);
  }

  .play-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.2);
    opacity: 0.6;
    transition: opacity 0.2s ease;
  }

  :global(.msqdx-base-card:hover) .play-overlay {
    opacity: 0.9;
    background: rgba(0, 0, 0, 0.4);
  }

  .icon-container {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.3s ease;
  }

  :global(.msqdx-base-card:hover) .icon-container {
    transform: scale(1.1);
  }

  .overlay-info {
    position: absolute;
    bottom: 12px;
    right: 12px;
    z-index: 2;
  }

  .info-area {
    padding: 16px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .info-text {
    flex: 1;
    min-width: 0;
  }

  .title {
    font-size: 16px;
    font-weight: 600;
    color: var(--msqdx-color-dark-text-primary);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .subtitle {
    font-size: 12px;
    color: var(--msqdx-color-dark-text-secondary);
    margin: 4px 0 0 0;
    font-weight: 500;
  }

  .menu-trigger {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--msqdx-color-brand-orange);
    border: 1px solid var(--msqdx-color-brand-orange);
    background: rgba(255, 255, 255, 0.1);
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .menu-trigger:hover {
    background: var(--msqdx-color-brand-orange);
    color: white;
  }

  .extra-area {
    padding: 0 16px 16px 16px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  :global(.msqdx-base-card.selected) {
    box-shadow: 0 0 0 2px var(--msqdx-color-brand-green);
  }
</style>
