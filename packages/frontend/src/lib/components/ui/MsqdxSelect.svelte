<script lang="ts">
  import { onMount } from 'svelte';
  import { MSQDX_COLORS, MSQDX_SPACING, MSQDX_TYPOGRAPHY, MSQDX_EFFECTS } from '$lib/design-tokens';
  import { theme } from '$lib/stores/theme.store';
  import MaterialSymbol from './MaterialSymbol.svelte';

  interface Option {
    value: string | number;
    label: string;
  }

  interface Props {
    label: string;
    options: Option[];
    helperText?: string;
    value?: string | number;
    onChange?: (event: Event) => void;
    error?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
    id?: string;
    class?: string;
    [key: string]: any;
  }

  export let label = '';
  export let options: Option[];
  export let helperText: string | undefined = undefined;
  export let value: string | number | undefined = undefined;
  export let onChange: ((event: Event) => void) | undefined = undefined;
  export let error = false;
  export let disabled = false;
  export let fullWidth = true;
  export let id: string | undefined = undefined;
  let className = '';
  export { className as class };

  let currentTheme: 'light' | 'dark' = 'dark';
  let internalValue = value ?? '';
  let isFocused = false;

  const unsubscribe = theme.subscribe(t => {
    currentTheme = t;
  });

  onMount(() => {
    return unsubscribe;
  });

  $: if (value !== undefined) {
    internalValue = value;
  }

  function handleChange(event: Event) {
    const target = event.target;
    internalValue = target.value;
    onChange?.(event);
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

  $: boxShadow = (() => {
    if (isFocused) {
      if (error) return `0 0 0 4px rgba(248, 113, 113, 0.1)`;
      return `0 0 0 4px rgba(${MSQDX_COLORS.brand.orangeRgb}, 0.1)`;
    }
    return 'none';
  })();

  $: iconColor = (() => {
    if (isFocused) return MSQDX_COLORS.brand.green;
    return `rgba(${MSQDX_COLORS.brand.orangeRgb}, 0.6)`;
  })();
</script>

<div class="msqdx-select-wrapper {className}" class:full-width={fullWidth}>
  <label
    class="msqdx-select-label"
    for={id || `select-${(label || '').toLowerCase().replace(/\s+/g, '-')}`}
  >
    {label}
  </label>

  <div class="msqdx-select-container" class:error class:focused={isFocused} class:disabled>
    <select
      id={id || `select-${(label || '').toLowerCase().replace(/\s+/g, '-')}`}
      class="msqdx-select"
      value={internalValue}
      {disabled}
      on:change={handleChange}
      on:focus={() => (isFocused = true)}
      on:blur={() => (isFocused = false)}
      style="
        background-color: {backgroundColor};
        border-color: {borderColor};
        box-shadow: {boxShadow};
      "
      {...$$restProps}
    >
      {#each options as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>

    <div class="msqdx-select-icon" style="color: {iconColor};">
      <MaterialSymbol
        icon="expand_more"
        fontSize={20}
        weight={MSQDX_TYPOGRAPHY.fontWeight.regular}
      />
    </div>
  </div>

  {#if helperText}
    <div class="msqdx-select-helper-text">
      {helperText}
    </div>
  {/if}
</div>

<style>
  .msqdx-select-wrapper {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 120px;
  }

  .msqdx-select-wrapper.full-width {
    width: 100%;
  }

  .msqdx-select-label {
    font-size: var(--msqdx-font-size-sm);
    font-weight: var(--msqdx-font-weight-bold);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(var(--msqdx-color-brand-orange-rgb), 0.8);
    margin-left: var(--msqdx-spacing-xs);
    font-family: var(--msqdx-font-primary);
  }

  .msqdx-select-container {
    position: relative;
    display: flex;
    align-items: center;
    border-radius: var(--msqdx-radius-lg);
    border: 1px solid;
    transition: all var(--msqdx-transition-standard);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .msqdx-select-container:hover:not(.disabled) {
    background-color: var(--select-hover-bg, rgba(255, 255, 255, 0.08));
    border-color: var(--select-hover-border, rgba(255, 255, 255, 0.2));
  }

  .msqdx-select-container.focused {
    background-color: var(--select-focus-bg, rgba(255, 255, 255, 0.1));
  }

  .msqdx-select-container.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .msqdx-select {
    flex: 1;
    padding: 8px 16px;
    padding-right: 40px; /* Space for icon */
    font-size: 0.875rem;
    font-family: var(--msqdx-font-primary);
    color: var(--select-text-color, rgba(255, 255, 255, 1));
    border: none;
    background: transparent;
    outline: none;
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    cursor: pointer;
    width: 100%;
  }

  .msqdx-select:disabled {
    cursor: not-allowed;
  }

  .msqdx-select-icon {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    display: flex;
    align-items: center;
    transition: color var(--msqdx-transition-standard);
  }

  .msqdx-select-container:hover:not(.disabled) .msqdx-select-icon {
    color: rgba(var(--msqdx-color-brand-orange-rgb), 0.8);
  }

  .msqdx-select-helper-text {
    font-size: var(--msqdx-font-size-sm);
    margin-left: var(--msqdx-spacing-md);
    opacity: 0.7;
    font-family: var(--msqdx-font-primary);
    color: var(--helper-text-color, rgba(255, 255, 255, 0.7));
  }

  :global(.light) .msqdx-select-container {
    --select-hover-bg: rgba(0, 0, 0, 0.08);
    --select-hover-border: rgba(0, 0, 0, 0.2);
    --select-focus-bg: rgba(0, 0, 0, 0.1);
    --select-text-color: rgba(15, 23, 42, 1);
  }

  :global(.light) .msqdx-select-helper-text {
    --helper-text-color: rgba(0, 0, 0, 0.7);
  }

  :global(.dark) .msqdx-select-container {
    --select-hover-bg: rgba(255, 255, 255, 0.08);
    --select-hover-border: rgba(255, 255, 255, 0.2);
    --select-focus-bg: rgba(255, 255, 255, 0.1);
    --select-text-color: rgba(255, 255, 255, 1);
  }

  :global(.dark) .msqdx-select-helper-text {
    --helper-text-color: rgba(255, 255, 255, 0.7);
  }
</style>
