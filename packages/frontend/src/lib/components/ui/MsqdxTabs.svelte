<script lang="ts">
  import { MSQDX_COLORS, MSQDX_TYPOGRAPHY, MSQDX_EFFECTS } from '$lib/design-tokens';
  import { theme } from '$lib/stores/theme.store';
  import MaterialSymbol from './MaterialSymbol.svelte';

  interface Tab {
    value: string | number;
    label: string;
    icon?: string;
  }

  interface Props {
    value: string | number;
    onChange?: (value: string | number) => void;
    tabs: Tab[];
    class?: string;
  }

  let { value, onChange, tabs, class: className = '' }: Props = $props();

  let currentTheme = $derived($theme);
  let internalValue = $state(value);

  

  $effect(() => {
    internalValue = value;
  });

  const activeIndex = $derived(() => {
    return tabs.findIndex(tab => tab.value === internalValue);
  });

  const indicatorWidth = $derived(() => {
    return `calc(100% / ${tabs.length})`;
  });

  const indicatorTransform = $derived(() => {
    return `translateX(${activeIndex * 100}%)`;
  });

  const borderColor = $derived(() => {
    return currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  });

  function handleTabClick(tabValue: string | number) {
    internalValue = tabValue;
    onChange?.(tabValue);
  }
</script>

<div class="msqdx-tabs-container {className}">
  <div class="msqdx-tabs-wrapper">
    {#each tabs as tab}
      <button
        class="msqdx-tab"
        class:active={internalValue === tab.value}
        onclick={() => handleTabClick(tab.value)}
        type="button"
      >
        {#if tab.icon}
          <MaterialSymbol
            icon={tab.icon}
            fontSize={20}
            weight={MSQDX_TYPOGRAPHY.fontWeight.regular}
            style="margin-right: 0.5rem;"
          />
        {/if}
        <span class="tab-label">{tab.label}</span>
      </button>
    {/each}
  </div>
  <div
    class="msqdx-tabs-indicator"
    style="
      width: {indicatorWidth};
      transform: {indicatorTransform};
      background-color: var(--msqdx-color-brand-orange);
    "
  ></div>
</div>

<style>
  .msqdx-tabs-container {
    position: relative;
    width: 100%;
  }

  .msqdx-tabs-wrapper {
    display: flex;
    min-height: auto;
    border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .msqdx-tabs-wrapper::-webkit-scrollbar {
    display: none;
  }

  .msqdx-tab {
    text-transform: none;
    min-width: 0;
    padding: 12px 20px;
    font-weight: var(--msqdx-font-weight-medium);
    font-size: var(--msqdx-font-size-body1);
    color: var(--tab-color, rgba(255, 255, 255, 0.6));
    transition: all var(--msqdx-transition-standard);
    min-height: auto;
    border: none;
    background: transparent;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    font-family: var(--msqdx-font-primary);
  }

  .msqdx-tab:hover {
    color: var(--tab-hover-color, rgba(255, 255, 255, 1));
    background-color: var(--tab-hover-bg, rgba(255, 255, 255, 0.03));
  }

  .msqdx-tab.active {
    color: var(--msqdx-color-brand-orange);
    font-weight: var(--msqdx-font-weight-semibold);
  }

  .tab-label {
    display: inline-block;
  }

  .msqdx-tabs-indicator {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    border-radius: 3px 3px 0 0;
    transition: transform var(--msqdx-transition-standard);
    z-index: 1;
  }

  :global(.light) .msqdx-tabs-wrapper {
    --border-color: rgba(0, 0, 0, 0.08);
    --tab-color: rgba(0, 0, 0, 0.6);
    --tab-hover-color: rgba(0, 0, 0, 1);
    --tab-hover-bg: rgba(0, 0, 0, 0.03);
  }

  :global(.dark) .msqdx-tabs-wrapper {
    --border-color: rgba(255, 255, 255, 0.08);
    --tab-color: rgba(255, 255, 255, 0.6);
    --tab-hover-color: rgba(255, 255, 255, 1);
    --tab-hover-bg: rgba(255, 255, 255, 0.03);
  }
</style>
