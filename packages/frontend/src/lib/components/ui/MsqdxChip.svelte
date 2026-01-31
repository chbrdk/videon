<script lang="ts">
  import { MSQDX_COLORS, MSQDX_TYPOGRAPHY } from '$lib/design-tokens';
  import { theme } from '$lib/stores/theme.store';

  interface Props {
    variant?:
      | 'glass'
      | 'filled'
      | 'outlined'
      | 'purple'
      | 'yellow'
      | 'pink'
      | 'orange'
      | 'blue'
      | 'green';
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
    glow?: boolean;
    class?: string;
    [key: string]: any;
  }

  let {
    variant = 'glass' as const,
    color,
    glow = false,
    class: className = '',
    children,
    ...rest
  }: Props & { children?: any } = $props();

  let currentTheme = $derived($theme);

  const chipVariant = $derived.by(() => {
    // If variant is a color name, treat it as color and use glass style
    if (['purple', 'yellow', 'pink', 'orange', 'blue', 'green'].includes(variant || '')) {
      return 'glass';
    }
    return variant || 'glass';
  });

  const chipColor = $derived.by(() => {
    // If variant is a color name, use it as color
    if (variant === 'purple') return MSQDX_COLORS.brand.purple;
    if (variant === 'yellow') return MSQDX_COLORS.brand.yellow;
    if (variant === 'pink') return MSQDX_COLORS.brand.pink;
    if (variant === 'orange') return MSQDX_COLORS.brand.orange;
    if (variant === 'blue') return MSQDX_COLORS.brand.blue;
    if (variant === 'green') return MSQDX_COLORS.brand.green;

    // Otherwise use color prop
    if (color) {
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
    return MSQDX_COLORS.brand.green;
  });

  function getChipStyles(): string {
    const baseColor = chipColor;
    const rgb =
      baseColor
        .replace('#', '')
        .match(/.{2}/g)
        ?.map(x => parseInt(x, 16))
        .join(', ') || '0, 202, 85';

    if (chipVariant === 'glass') {
      return `
        background-color: rgba(${rgb}, 0.1);
        backdrop-filter: blur(4px);
        border: 1px solid rgba(${rgb}, 0.3);
        color: ${currentTheme === 'dark' ? '#ffffff' : baseColor};
        ${glow ? `box-shadow: 0 0 10px rgba(${rgb}, 0.3);` : ''}
      `;
    }

    if (chipVariant === 'filled') {
      return `
        background-color: ${baseColor};
        color: ${getContrastColor(baseColor)};
        border: none;
        ${glow ? `box-shadow: 0 0 10px rgba(${rgb}, 0.3);` : ''}
      `;
    }

    // outlined
    return `
      background-color: transparent;
      border: 1px solid rgba(${rgb}, 0.5);
      color: ${baseColor};
      ${glow ? `box-shadow: 0 0 10px rgba(${rgb}, 0.3);` : ''}
    `;
  }

  function getContrastColor(hex: string): string {
    // Simple contrast calculation
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  }
</script>

<span
  class="msqdx-chip {className}"
  class:glow
  class:filled={chipVariant === 'filled'}
  style={getChipStyles()}
  {...rest}
>
  {#if children}{@render children()}{/if}
</span>

<style>
  .msqdx-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border-radius: 8px;
    font-size: 0.75rem;
    height: 24px;
    padding: 0 8px;
    transition: all 0.2s ease-in-out;
    white-space: nowrap;
  }

  .msqdx-chip.filled {
    font-weight: 600; /* semibold */
  }

  .msqdx-chip:not(.filled) {
    font-weight: 500; /* medium */
  }

  .msqdx-chip:hover {
    opacity: 0.9;
  }

  .msqdx-chip :global(svg) {
    width: 14px;
    height: 14px;
    margin-left: -2px;
  }
</style>
