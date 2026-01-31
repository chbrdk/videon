<script lang="ts">
  import { MSQDX_COLORS, MSQDX_TYPOGRAPHY } from '$lib/design-tokens';
  import { theme } from '$lib/stores/theme.store';
  import MsqdxTypography from './MsqdxTypography.svelte';

  interface Props {
    label?: string;
    helperText?: string;
    showValue?: boolean;
    valueLabel?: string;
    value?: number | number[];
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    onChange?: (event: Event) => void;
    onInput?: (event: Event) => void;
    class?: string;
    [key: string]: any;
  }

  let {
    label,
    helperText,
    showValue = false,
    valueLabel,
    value = 0,
    min = 0,
    max = 100,
    step = 1,
    disabled = false,
    onChange,
    onInput,
    class: className = '',
    ...rest
  }: Props = $props();

  let currentTheme: 'light' | 'dark' = $state('dark');
  let internalValue = $state(
    typeof value === 'number' ? value : Array.isArray(value) ? value[0] : 0
  );

  $effect(() => {
    const unsubscribe = theme.subscribe(t => {
      currentTheme = t;
    });
    return unsubscribe;
  });

  $effect(() => {
    if (value !== undefined) {
      internalValue = typeof value === 'number' ? value : Array.isArray(value) ? value[0] : 0;
    }
  });

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    internalValue = Number(target.value);
    onInput?.(event);
    onChange?.(event);
  }

  const displayValue = $derived(() => {
    return valueLabel || (showValue ? String(internalValue) : undefined);
  });

  const percentage = $derived(() => {
    return ((internalValue - min) / (max - min)) * 100;
  });

  const railColor = $derived(() => {
    return currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  });
</script>

<div class="msqdx-slider-wrapper {className}">
  {#if label || displayValue}
    <div class="msqdx-slider-header">
      {#if label}
        <MsqdxTypography variant="body2" weight="semibold">
          {label}
        </MsqdxTypography>
      {/if}
      {#if displayValue}
        <MsqdxTypography
          variant="body2"
          weight="bold"
          style="color: var(--msqdx-color-brand-orange);"
        >
          {displayValue}
        </MsqdxTypography>
      {/if}
    </div>
  {/if}

  <div class="msqdx-slider-container" class:disabled>
    <div class="msqdx-slider-rail" style="background-color: {railColor};"></div>
    <div
      class="msqdx-slider-track"
      style="
        width: {percentage}%;
        background-color: var(--msqdx-color-brand-orange);
      "
    ></div>
    <input
      type="range"
      class="msqdx-slider-input"
      {min}
      {max}
      {step}
      value={internalValue}
      {disabled}
      oninput={handleInput}
      onchange={handleInput}
      style="
        --thumb-size: 20px;
        --track-height: 6px;
        --thumb-color: var(--msqdx-color-brand-orange);
        --thumb-border: {currentTheme === 'dark' ? '#0f0f0f' : '#ffffff'};
      "
      {...rest}
    />
  </div>

  {#if helperText}
    <MsqdxTypography
      variant="caption"
      style="margin-top: 0.5rem; margin-left: 0.5rem; opacity: 0.7; display: block;"
    >
      {helperText}
    </MsqdxTypography>
  {/if}
</div>

<style>
  .msqdx-slider-wrapper {
    width: 100%;
  }

  .msqdx-slider-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .msqdx-slider-container {
    position: relative;
    height: 6px;
    padding: 13px 0;
    width: 100%;
  }

  .msqdx-slider-container.disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .msqdx-slider-rail {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 6px;
    border-radius: 3px;
    transform: translateY(-50%);
  }

  .msqdx-slider-track {
    position: absolute;
    top: 50%;
    left: 0;
    height: 6px;
    border-radius: 3px;
    transform: translateY(-50%);
    transition: width 0.2s ease-in-out;
  }

  .msqdx-slider-input {
    position: relative;
    width: 100%;
    height: 6px;
    margin: 0;
    padding: 0;
    background: transparent;
    outline: none;
    -webkit-appearance: none;
    appearance: none;
    cursor: pointer;
    z-index: 2;
  }

  .msqdx-slider-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: var(--thumb-size, 20px);
    height: var(--thumb-size, 20px);
    border-radius: 50%;
    background-color: var(--thumb-color, var(--msqdx-color-brand-orange));
    border: 2px solid var(--thumb-border, #0f0f0f);
    box-shadow: 0 0 0 4px rgba(var(--msqdx-color-brand-orange-rgb), 0.16);
    cursor: pointer;
    transition: all 0.2s ease-in-out;
  }

  .msqdx-slider-input::-webkit-slider-thumb:hover {
    box-shadow: 0 0 0 8px rgba(var(--msqdx-color-brand-orange-rgb), 0.16);
  }

  .msqdx-slider-input::-webkit-slider-thumb:active {
    box-shadow: 0 0 0 12px rgba(var(--msqdx-color-brand-orange-rgb), 0.16);
  }

  .msqdx-slider-input::-moz-range-thumb {
    width: var(--thumb-size, 20px);
    height: var(--thumb-size, 20px);
    border-radius: 50%;
    background-color: var(--thumb-color, var(--msqdx-color-brand-orange));
    border: 2px solid var(--thumb-border, #0f0f0f);
    box-shadow: 0 0 0 4px rgba(var(--msqdx-color-brand-orange-rgb), 0.16);
    cursor: pointer;
    transition: all 0.2s ease-in-out;
  }

  .msqdx-slider-input::-moz-range-thumb:hover {
    box-shadow: 0 0 0 8px rgba(var(--msqdx-color-brand-orange-rgb), 0.16);
  }

  .msqdx-slider-input::-moz-range-thumb:active {
    box-shadow: 0 0 0 12px rgba(var(--msqdx-color-brand-orange-rgb), 0.16);
  }

  .msqdx-slider-input:disabled {
    cursor: not-allowed;
  }

  .msqdx-slider-input:disabled::-webkit-slider-thumb {
    background-color: rgba(var(--msqdx-color-brand-orange-rgb), 0.3);
    cursor: not-allowed;
  }

  .msqdx-slider-input:disabled::-moz-range-thumb {
    background-color: rgba(var(--msqdx-color-brand-orange-rgb), 0.3);
    cursor: not-allowed;
  }
</style>
