<script>
  import { searchQuery, searchAll } from '$lib/stores/folders.store';
  import {
    MSQDX_SPACING,
    MSQDX_COLORS,
    MSQDX_EFFECTS,
    MSQDX_TYPOGRAPHY,
    MSQDX_ICONS,
  } from '$lib/design-tokens';
  import { _ } from '$lib/i18n';
  import { MaterialSymbol } from '$lib/components/ui';

  let debounceTimer;
  export let className = '';

  function handleSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if ($searchQuery.trim()) {
        searchAll($searchQuery);
      }
    }, 300);
  }
</script>

<div
  class="search-bar {className}"
  style="
    border-radius: {MSQDX_SPACING.borderRadius.full}px;
    padding: {MSQDX_SPACING.scale.sm}px {MSQDX_SPACING.scale.md}px;
  "
>
  <MaterialSymbol
    icon="search"
    fontSize={MSQDX_ICONS.sizes.md}
    weight={MSQDX_ICONS.weights.regular}
    class="search-icon"
  />
  <input
    type="search"
    bind:value={$searchQuery}
    oninput={handleSearch}
    placeholder={_('search.placeholder')}
    class="search-input"
    style="
      font-family: {MSQDX_TYPOGRAPHY.fontFamily.primary};
      font-size: {MSQDX_TYPOGRAPHY.fontSize.body2};
      font-weight: {MSQDX_TYPOGRAPHY.fontWeight.medium};
    "
  />
  {#if $searchQuery}
    <button
      class="clear-button"
      onclick={() => searchQuery.set('')}
      title={_('search.clear')}
      style="
      width: {MSQDX_ICONS.sizes.lg}px;
      height: {MSQDX_ICONS.sizes.lg}px;
      border-radius: {MSQDX_SPACING.borderRadius.sm}px;
      transition: all 0.2s ease-in-out;
    "
    >
      <MaterialSymbol
        icon="close"
        fontSize={MSQDX_ICONS.sizes.sm}
        weight={MSQDX_ICONS.weights.regular}
      />
    </button>
  {/if}
</div>

<style>
  .search-bar {
    position: relative;
    display: flex;
    align-items: center;
    min-width: 300px;
    backdrop-filter: blur(var(--msqdx-glass-blur));
    transition: all var(--msqdx-transition-standard);
  }

  .search-bar:focus-within {
    /* Focus styles handled via tokens */
  }

  .search-icon {
    margin-right: var(--msqdx-spacing-sm);
    flex-shrink: 0;
    color: inherit;
  }

  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    width: 100%;
  }

  .search-input::placeholder {
    opacity: 0.5;
  }

  .clear-button {
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    cursor: pointer;
    margin-left: var(--msqdx-spacing-xs);
    flex-shrink: 0;
    color: inherit;
  }

  .clear-button:focus {
    outline: 2px solid currentColor;
    outline-offset: 2px;
    opacity: 0.3;
  }

  /* Dark theme styles using tokens */
  :global(html.dark) .search-bar {
    background: var(--msqdx-color-dark-paper);
    border: 1px solid var(--msqdx-color-dark-border);
    color: var(--msqdx-color-dark-text-primary);
  }

  :global(html.dark) .search-bar:focus-within {
    background: rgba(255, 255, 255, 0.15);
    border-color: var(--msqdx-color-brand-orange);
  }

  :global(html.dark) .search-icon {
    color: var(--msqdx-color-dark-text-secondary);
  }

  :global(html.dark) .search-input {
    color: var(--msqdx-color-dark-text-primary);
  }

  :global(html.dark) .search-input::placeholder {
    color: var(--msqdx-color-dark-text-secondary);
  }

  :global(html.dark) .clear-button {
    color: var(--msqdx-color-dark-text-secondary);
  }

  :global(html.dark) .clear-button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--msqdx-color-dark-text-primary);
  }

  /* Light theme styles using tokens */
  :global(html.light) .search-bar {
    background: var(--msqdx-color-light-paper);
    border: 1px solid var(--msqdx-color-light-border);
    color: var(--msqdx-color-light-text-primary);
  }

  :global(html.light) .search-bar:focus-within {
    background: #ffffff;
    border-color: var(--msqdx-color-brand-orange);
  }

  :global(html.light) .search-icon {
    color: var(--msqdx-color-light-text-secondary);
  }

  :global(html.light) .search-input {
    color: var(--msqdx-color-light-text-primary);
  }

  :global(html.light) .search-input::placeholder {
    color: var(--msqdx-color-light-text-secondary);
  }

  :global(html.light) .clear-button {
    color: var(--msqdx-color-light-text-secondary);
  }

  :global(html.light) .clear-button:hover {
    background: rgba(0, 0, 0, 0.05);
    color: var(--msqdx-color-light-text-primary);
  }
</style>
