<script lang="ts">
  import { MSQDX_COLORS, MSQDX_SPACING, MSQDX_TYPOGRAPHY, MSQDX_EFFECTS } from '$lib/design-tokens';
  import { theme } from '$lib/stores/theme.store';
  import MaterialSymbol from './MaterialSymbol.svelte';

  interface Props {
    label: string;
    errorText?: string;
    icon?: string;
    success?: boolean;
    error?: boolean;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
    type?: string;
    value?: string | number;
    onInput?: (event: Event) => void;
    onChange?: (event: Event) => void;
    class?: string;
    [key: string]: any;
  }

  let {
    label,
    errorText,
    icon,
    success = false,
    error = false,
    required = false,
    disabled = false,
    placeholder,
    type = 'text',
    value,
    onInput,
    onChange,
    class: className = '',
    ...rest
  }: Props = $props();

  let currentTheme: 'light' | 'dark' = 'dark';
  let internalValue = $state(value ?? '');
  let isFocused = $state(false);

  $effect(() => {
    const unsubscribe = theme.subscribe(t => {
      currentTheme = t;
    });
    return unsubscribe;
  });

  $effect(() => {
    if (value !== undefined) {
      internalValue = value;
    }
  });

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    internalValue = target.value;
    onInput?.(event);
    onChange?.(event);
  }

  const borderColor = $derived(() => {
    if (error) return MSQDX_COLORS.status.error;
    if (success) return MSQDX_COLORS.status.success;
    // Always use brand orange as requested
    return MSQDX_COLORS.brand.orange;
  });

  const backgroundColor = $derived(() => {
    if (isFocused) {
      return currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    }
    return currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  });

  const boxShadow = $derived(() => {
    if (isFocused) {
      if (error) {
        return `0 0 0 4px rgba(248, 113, 113, 0.1)`;
      }
      if (success) {
        return `0 0 0 4px rgba(34, 197, 94, 0.1)`;
      }
      return `0 0 0 4px rgba(${MSQDX_COLORS.brand.orangeRgb}, 0.1)`;
    }
    return 'none';
  });
</script>

<div class="msqdx-form-field-wrapper {className}">
  <label class="msqdx-form-field-label">
    {label}
    {#if required}*{/if}
  </label>

  <div
    class="msqdx-form-field-input-wrapper"
    class:error
    class:success
    class:focused={isFocused}
    class:disabled
  >
    {#if icon}
      <div class="msqdx-form-field-icon-start">
        <MaterialSymbol {icon} fontSize={20} weight={MSQDX_TYPOGRAPHY.fontWeight.regular} />
      </div>
    {/if}

    <input
      {type}
      class="msqdx-form-field-input"
      {placeholder}
      value={internalValue}
      {disabled}
      on:input={handleInput}
      on:focus={() => (isFocused = true)}
      on:blur={() => (isFocused = false)}
      style="
        background-color: {backgroundColor};
        border-color: {borderColor};
        box-shadow: {boxShadow};
      "
      {...rest}
    />

    <div class="msqdx-form-field-icon-end">
      {#if error}
        <MaterialSymbol
          icon="error"
          fontSize={20}
          weight={MSQDX_TYPOGRAPHY.fontWeight.regular}
          style="color: {MSQDX_COLORS.status.error};"
        />
      {:else if success}
        <MaterialSymbol
          icon="check_circle"
          fontSize={20}
          weight={MSQDX_TYPOGRAPHY.fontWeight.regular}
          style="color: {MSQDX_COLORS.status.success};"
        />
      {/if}
    </div>
  </div>

  {#if errorText}
    <div class="msqdx-form-field-helper-text error">
      {errorText}
    </div>
  {/if}
</div>

<style>
  .msqdx-form-field-wrapper {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .msqdx-form-field-label {
    font-size: var(--msqdx-font-size-sm);
    font-weight: var(--msqdx-font-weight-regular);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #000000;
    margin-left: var(--msqdx-spacing-xs);
    font-family: var(--msqdx-font-mono);
  }

  .msqdx-form-field-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    border-radius: var(--msqdx-radius-lg);
    border: 1px solid;
    transition: all var(--msqdx-transition-standard);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .msqdx-form-field-input-wrapper:hover:not(.disabled) {
    background-color: var(--input-hover-bg, rgba(255, 255, 255, 0.08));
    border-color: var(--input-hover-border, rgba(255, 255, 255, 0.2));
  }

  .msqdx-form-field-input-wrapper.focused {
    background-color: var(--input-focus-bg, rgba(255, 255, 255, 0.1));
  }

  .msqdx-form-field-input-wrapper.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .msqdx-form-field-icon-start {
    display: flex;
    align-items: center;
    margin-right: 8px;
    margin-left: 16px;
    color: var(--icon-color, rgba(255, 255, 255, 0.5));
  }

  .msqdx-form-field-icon-end {
    display: flex;
    align-items: center;
    margin-left: 8px;
    margin-right: 16px;
  }

  .msqdx-form-field-input {
    flex: 1;
    padding: 12px 16px;
    font-size: var(--msqdx-font-size-body1);
    font-family: var(--msqdx-font-primary);
    color: var(--input-text-color, rgba(255, 255, 255, 1));
    border: none;
    background: transparent;
    outline: none;
    width: 100%;
  }

  .msqdx-form-field-input::placeholder {
    opacity: 0.5;
  }

  .msqdx-form-field-input:disabled {
    cursor: not-allowed;
  }

  .msqdx-form-field-helper-text {
    font-size: var(--msqdx-font-size-sm);
    font-weight: var(--msqdx-font-weight-medium);
    margin-left: var(--msqdx-spacing-md);
    font-family: var(--msqdx-font-primary);
  }

  .msqdx-form-field-helper-text.error {
    color: var(--msqdx-color-status-error);
  }

  :global(.light) .msqdx-form-field-input-wrapper {
    --input-hover-bg: rgba(0, 0, 0, 0.08);
    --input-hover-border: rgba(0, 0, 0, 0.2);
    --input-focus-bg: rgba(0, 0, 0, 0.1);
    --icon-color: rgba(0, 0, 0, 0.5);
    --input-text-color: rgba(15, 23, 42, 1);
  }

  :global(.dark) .msqdx-form-field-input-wrapper {
    --input-hover-bg: rgba(255, 255, 255, 0.08);
    --input-hover-border: rgba(255, 255, 255, 0.2);
    --input-focus-bg: rgba(255, 255, 255, 0.1);
    --icon-color: rgba(255, 255, 255, 0.5);
    --input-text-color: rgba(255, 255, 255, 1);
  }
</style>
