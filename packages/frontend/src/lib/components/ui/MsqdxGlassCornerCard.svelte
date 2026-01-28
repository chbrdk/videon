<script lang="ts">
  import { MSQDX_COLORS, MSQDX_EFFECTS, MSQDX_RESPONSIVE, MSQDX_SPACING } from '$lib/design-tokens';
  import { theme } from '$lib/stores/theme.store';
  import MsqdxGlassCard from './MsqdxGlassCard.svelte';

  interface Props {
    topLeftBadge?: any;
    bottomRightBadge?: any;
    topLeftSize?: { width: number; height: number };
    bottomRightSize?: { width: string | number; height: number };
    borderRadiusVariant?: keyof typeof MSQDX_SPACING.borderRadius;
    class?: string;
    [key: string]: any;
  }

  let {
    topLeftBadge,
    bottomRightBadge,
    topLeftSize = { width: 70, height: 55 },
    bottomRightSize = { width: "70%", height: 55 },
    borderRadiusVariant,
    class: className = '',
    ...rest
  }: Props = $props();

  let currentTheme: 'light' | 'dark' = 'dark';

  $effect(() => {
    const unsubscribe = theme.subscribe(t => {
      currentTheme = t;
    });
    return unsubscribe;
  });

  const cornerRadius = $derived(() => {
    return borderRadiusVariant 
      ? MSQDX_SPACING.borderRadius[borderRadiusVariant]
      : MSQDX_RESPONSIVE.cardRadius.md;
  });

  const borderColor = $derived(() => {
    return currentTheme === 'dark' 
      ? 'rgba(255, 255, 255, 0.12)' 
      : 'rgba(0, 0, 0, 0.12)';
  });

  const borderTopColor = $derived(() => {
    return currentTheme === 'dark' 
      ? 'rgba(255, 255, 255, 0.18)' 
      : 'rgba(0, 0, 0, 0.18)';
  });

  const backgroundColor = $derived(() => {
    return currentTheme === 'dark' 
      ? 'rgba(0, 0, 0, 0.05)' 
      : 'rgba(255, 255, 255, 0.05)';
  });

  const bottomRightWidth = $derived(() => {
    return typeof bottomRightSize.width === 'number' 
      ? `${bottomRightSize.width}px` 
      : bottomRightSize.width;
  });

  const invertedCornerRight = $derived(() => {
    return typeof bottomRightSize.width === 'number' 
      ? `${bottomRightSize.width}px` 
      : `calc(${bottomRightSize.width} - ${cornerRadius * 2}px)`;
  });
</script>

<div 
  class="msqdx-glass-corner-card-container {className}"
  style="position: relative; overflow: visible; display: flex; flex-direction: column;"
>
  {#if topLeftBadge}
    <div
      class="msqdx-corner-badge top-left"
      style="
        top: -{topLeftSize.height}px;
        left: 0;
        width: {topLeftSize.width}px;
        height: {topLeftSize.height}px;
        background-color: {backgroundColor};
        border-color: {borderColor};
        border-top-color: {borderTopColor};
      "
    >
      {topLeftBadge}
    </div>
    <div
      class="msqdx-inverted-corner top-left"
      style="
        left: {topLeftSize.width}px;
        width: {cornerRadius * 2}px;
        height: {cornerRadius * 2}px;
        background-color: var(--bg-default, {currentTheme === 'dark' ? '#0f0f0f' : '#f8f6f0'});
        border-color: {borderColor};
      "
    ></div>
  {/if}

  <MsqdxGlassCard
    {...rest}
    borderRadiusVariant={borderRadiusVariant}
    style="
      {topLeftBadge ? 'border-top-left-radius: 0 !important;' : ''}
      {bottomRightBadge ? 'border-bottom-right-radius: 0 !important;' : ''}
      {rest.style || ''}
    "
  >
    <slot />
  </MsqdxGlassCard>

  {#if bottomRightBadge}
    <div
      class="msqdx-corner-badge bottom-right"
      style="
        bottom: -{bottomRightSize.height}px;
        right: 0;
        width: {bottomRightWidth};
        height: {bottomRightSize.height}px;
        background-color: {backgroundColor};
        border-color: {borderColor};
        border-top-color: {borderTopColor};
      "
    >
      {bottomRightBadge}
    </div>
    <div
      class="msqdx-inverted-corner bottom-right"
      style="
        right: {invertedCornerRight};
        width: {cornerRadius * 2}px;
        height: {cornerRadius * 2}px;
        background-color: var(--bg-default, {currentTheme === 'dark' ? '#0f0f0f' : '#f8f6f0'});
        border-color: {borderColor};
      "
    ></div>
  {/if}
</div>

<style>
  .msqdx-glass-corner-card-container {
    position: relative;
    overflow: visible;
    display: flex;
    flex-direction: column;
  }

  .msqdx-corner-badge {
    position: absolute;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid;
    border-left: 1px solid;
    box-shadow: var(--shadow, none);
    color: var(--text-color, rgba(255, 255, 255, 1));
  }

  .msqdx-corner-badge.top-left {
    border-top-left-radius: 30px;
    border-top-right-radius: 30px;
  }

  .msqdx-corner-badge.bottom-right {
    border-bottom-left-radius: 30px;
    border-bottom-right-radius: 30px;
  }

  .msqdx-inverted-corner {
    position: absolute;
    z-index: 3;
    border: 1px solid;
    border-radius: 50%;
  }

  .msqdx-inverted-corner.top-left {
    top: 0;
    clip-path: circle(var(--corner-radius, 32px) at var(--corner-radius, 32px) var(--corner-radius, 32px));
  }

  .msqdx-inverted-corner.bottom-right {
    bottom: 0;
    clip-path: circle(var(--corner-radius, 32px) at var(--corner-radius, 32px) var(--corner-radius, 32px));
  }

  :global(.light) .msqdx-corner-badge {
    --text-color: rgba(15, 23, 42, 1);
  }

  :global(.dark) .msqdx-corner-badge {
    --text-color: rgba(255, 255, 255, 1);
  }
</style>
