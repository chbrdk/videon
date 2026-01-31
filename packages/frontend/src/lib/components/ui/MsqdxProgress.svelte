<script lang="ts">
  import { MSQDX_COLORS } from '$lib/design-tokens';
  import { theme } from '$lib/stores/theme.store';

  interface Props {
    value?: number;
    label?: string;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
    height?: number;
    showValue?: boolean;
    class?: string;
  }

  let {
    value = 0,
    label = undefined,
    color = 'primary' as const,
    height = 6,
    showValue = false,
    class: className = '',
  }: Props = $props();

  let currentTheme: 'light' | 'dark' = 'dark';

  $effect(() => {
    const unsubscribe = theme.subscribe(value => {
      currentTheme = value;
    });
    return unsubscribe;
  });

  function getThemeColor(): string {
    switch (color) {
      case 'primary':
        return MSQDX_COLORS.brand.green;
      case 'secondary':
        return MSQDX_COLORS.brand.yellow;
      case 'success':
        return MSQDX_COLORS.status.success;
      case 'warning':
        return MSQDX_COLORS.status.warning;
      case 'error':
        return MSQDX_COLORS.status.error;
      case 'info':
        return MSQDX_COLORS.status.info;
      default:
        return MSQDX_COLORS.brand.green;
    }
  }

  function getBackgroundColor(): string {
    return currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
  }

  const clampedValue = $derived(Math.min(100, Math.max(0, value)));
  const borderRadius = $derived(height / 2);
</script>

<div class="msqdx-progress {className}">
  {#if label || showValue}
    <div class="progress-header">
      {#if label}
        <span class="progress-label">{label}</span>
      {/if}
      {#if showValue}
        <span class="progress-value">{Math.round(clampedValue)}%</span>
      {/if}
    </div>
  {/if}

  <div
    class="progress-track"
    style="
      height: {height}px;
      border-radius: {borderRadius}px;
      background-color: {getBackgroundColor()};
    "
  >
    <div
      class="progress-bar"
      style="
        width: {clampedValue}%;
        height: {height}px;
        border-radius: {borderRadius}px;
        background: {getThemeColor()};
      "
    ></div>
  </div>
</div>

<style>
  .msqdx-progress {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .progress-label {
    font-size: 0.75rem;
    font-weight: 600;
    opacity: 0.8;
    color: inherit;
  }

  .progress-value {
    font-size: 0.75rem;
    font-weight: 800;
    color: inherit;
  }

  .progress-track {
    width: 100%;
    overflow: hidden;
    position: relative;
  }

  .progress-bar {
    transition: width 0.3s ease-out;
  }
</style>
