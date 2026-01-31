<script lang="ts">
  import { onMount } from 'svelte';
  import { MSQDX_COLORS, MSQDX_TYPOGRAPHY } from '$lib/design-tokens';
  import { theme } from '$lib/stores/theme.store';

  interface Props {
    variant?: 'contained' | 'outlined' | 'text';
    glass?: boolean;
    loading?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    href?: string;
    class?: string;
    [key: string]: any;
  }

  export let variant: 'contained' | 'outlined' | 'text' = 'contained';
  export let glass = false;
  export let loading = false;
  export let disabled = false;
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let href: string | undefined = undefined;
  let className = '';
  export { className as class };

  let currentTheme: 'light' | 'dark' = 'dark';

  const unsubscribe = theme.subscribe(value => {
    currentTheme = value;
  });

  onMount(() => {
    return unsubscribe;
  });

  function getButtonStyles(): string {
    if (glass) {
      const bgColor = currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
      const borderColor = `rgba(${MSQDX_COLORS.brand.green
        .replace('#', '')
        .match(/.{2}/g)
        ?.map(x => parseInt(x, 16))
        .join(', ')}, 0.3)`;
      return `
        background: ${bgColor};
        backdrop-filter: blur(12px);
        border: 1px solid ${borderColor};
        color: ${currentTheme === 'dark' ? '#ffffff' : '#0f172a'};
      `;
    }

    if (variant === 'contained') {
      return `
        background: ${MSQDX_COLORS.brand.green};
        color: #ffffff;
        border: none;
      `;
    }

    if (variant === 'outlined') {
      return `
        background: transparent;
        border: 1px solid ${MSQDX_COLORS.brand.orange};
        color: ${MSQDX_COLORS.brand.orange};
      `;
    }

    return `
      background: transparent;
      border: none;
      color: ${MSQDX_COLORS.brand.orange};
    `;
  }
</script>

{#if href}
  <a
    {href}
    class="msqdx-button {className}"
    class:glass
    class:loading
    class:disabled={disabled || loading}
    style={getButtonStyles()}
    {...$$restProps}
  >
    {#if loading}
      <span class="spinner"></span>
    {/if}
    <slot />
  </a>
{:else}
  <button
    class="msqdx-button {className}"
    class:glass
    class:loading
    class:disabled={disabled || loading}
    {type}
    disabled={disabled || loading}
    style={getButtonStyles()}
    on:click
    {...$$restProps}
  >
    {#if loading}
      <span class="spinner"></span>
    {/if}
    <slot />
  </button>
{/if}

<style>
  .msqdx-button {
    border-radius: 999px;
    text-transform: none;
    font-weight: 600; /* MSQDX_TYPOGRAPHY.fontWeight.semibold */
    padding: 8px 24px;
    transition: all 0.2s ease-in-out;
    box-shadow: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 0.875rem;
    line-height: 1.5;
    border: none;
    text-decoration: none;
  }

  .msqdx-button:hover:not(.disabled) {
    box-shadow: none;
  }

  .msqdx-button.glass:hover:not(.disabled) {
    background: rgba(255, 255, 255, 0.2) !important;
    border-color: var(--msqdx-color-brand-orange) !important;
  }

  .msqdx-button:not(.glass).variant-contained:hover:not(.disabled) {
    background: rgba(var(--msqdx-color-brand-orange-rgb), 0.9) !important;
  }

  .msqdx-button.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
