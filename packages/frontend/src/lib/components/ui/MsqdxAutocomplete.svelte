<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  import { MSQDX_COLORS, MSQDX_TYPOGRAPHY } from '$lib/design-tokens';
  import { theme } from '$lib/stores/theme.store';
  import MaterialSymbol from './MaterialSymbol.svelte';

  export let label = '';
  export let value = '';
  export let placeholder = '';
  export let items: any[] = [];
  export let loading = false;
  export let disabled = false;
  export let required = false;
  export let error = false;
  export let icon = 'person';

  const dispatch = createEventDispatcher();

  let currentTheme: 'light' | 'dark' = 'dark';
  let isFocused = false;
  let showSuggestions = false;
  let inputElement: HTMLInputElement;
  let wrapperElement: HTMLElement;

  const unsubscribe = theme.subscribe(t => {
    currentTheme = t;
  });

  onMount(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperElement && !wrapperElement.contains(event.target as Node)) {
        showSuggestions = false;
      }
    }

    document.addEventListener('click', handleClickOutside);
    return () => {
      unsubscribe();
      document.removeEventListener('click', handleClickOutside);
    };
  });

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    value = target.value;
    showSuggestions = true;
    dispatch('input', value);
  }

  function handleSelect(item: any) {
    value = item.email || item.name;
    showSuggestions = false;
    dispatch('select', item);
  }

  function handleFocus() {
    isFocused = true;
    if (value.length > 0) showSuggestions = true;
  }

  $: borderColor = (() => {
    if (error) return MSQDX_COLORS.status.error;
    if (isFocused) return MSQDX_COLORS.brand.green;
    return currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  })();

  $: backgroundColor = (() => {
    if (isFocused) {
      return currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    }
    return currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  })();
</script>

<div class="msqdx-autocomplete-wrapper" bind:this={wrapperElement}>
  {#if label}
    <label class="msqdx-label">
      {label}
      {#if required}*{/if}
    </label>
  {/if}

  <div
    class="msqdx-input-container"
    class:focused={isFocused}
    class:error
    class:disabled
    style="background-color: {backgroundColor}; border-color: {borderColor};"
  >
    {#if icon}
      <div class="icon-start">
        <MaterialSymbol {icon} fontSize={20} />
      </div>
    {/if}

    <input
      bind:this={inputElement}
      type="text"
      {value}
      {placeholder}
      {disabled}
      on:input={handleInput}
      on:focus={handleFocus}
      on:blur={() => setTimeout(() => (isFocused = false), 200)}
      autocomplete="off"
    />

    {#if loading}
      <div class="loader" transition:fade></div>
    {/if}
  </div>

  {#if showSuggestions && (loading || items.length > 0)}
    <div class="suggestions-dropdown" transition:slide={{ duration: 200 }}>
      {#if loading}
        <div class="dropdown-item loading">Searching...</div>
      {:else}
        {#each items as item}
          <button class="dropdown-item" on:click={() => handleSelect(item)}>
            <div class="item-icon">
              <MaterialSymbol icon="account_circle" fontSize={24} />
            </div>
            <div class="item-info">
              <span class="item-name">{item.name}</span>
              <span class="item-email">{item.email}</span>
            </div>
          </button>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .msqdx-autocomplete-wrapper {
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .msqdx-label {
    font-size: var(--msqdx-font-size-sm);
    font-weight: var(--msqdx-font-weight-bold);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(var(--msqdx-color-brand-orange-rgb), 0.8);
    margin-left: var(--msqdx-spacing-xs);
    font-family: var(--msqdx-font-primary);
  }

  .msqdx-input-container {
    display: flex;
    align-items: center;
    border: 1px solid;
    border-radius: var(--msqdx-radius-lg);
    padding: 2px 12px;
    transition: all 0.3s ease;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    height: 44px;
  }

  input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: inherit;
    font-family: var(--msqdx-font-primary);
    font-size: 14px;
    padding: 8px;
  }

  .icon-start {
    margin-right: 4px;
    opacity: 0.6;
    display: flex;
    align-items: center;
  }

  .loader {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(var(--msqdx-color-brand-orange-rgb), 0.2);
    border-top-color: var(--msqdx-color-brand-orange);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .suggestions-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(var(--msqdx-color-brand-orange-rgb), 0.2);
    border-radius: var(--msqdx-radius-lg);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    overflow: hidden;
    backdrop-filter: blur(16px);
  }

  :global(.dark) .suggestions-dropdown {
    background: rgba(30, 41, 59, 0.95);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .dropdown-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    transition: background 0.2s ease;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  }

  :global(.dark) .dropdown-item {
    border-bottom-color: rgba(255, 255, 255, 0.05);
  }

  .dropdown-item:last-child {
    border-bottom: none;
  }

  .dropdown-item:hover {
    background: rgba(var(--msqdx-color-brand-orange-rgb), 0.05);
  }

  .item-icon {
    opacity: 0.5;
    color: var(--msqdx-color-brand-orange);
  }

  .item-info {
    display: flex;
    flex-direction: column;
  }

  .item-name {
    font-weight: 600;
    font-size: 14px;
    color: #0f172a;
  }

  :global(.dark) .item-name {
    color: white;
  }

  .item-email {
    font-size: 12px;
    opacity: 0.6;
    color: #475569;
  }

  :global(.dark) .item-email {
    color: #94a3b8;
  }

  .dropdown-item.loading {
    justify-content: center;
    padding: 20px;
    color: var(--msqdx-color-brand-orange);
    font-style: italic;
  }
</style>
