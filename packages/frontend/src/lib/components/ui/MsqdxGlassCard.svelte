<script lang="ts">
  import { onMount } from 'svelte';
  import { theme } from '$lib/stores/theme.store';
  import { MSQDX_COLORS, MSQDX_SPACING, MSQDX_EFFECTS } from '$lib/design-tokens';

  interface Props {
    blur?: number;
    opacity?: number;
    hoverable?: boolean;
    noPadding?: boolean;
    accent?: 'purple' | 'yellow' | 'none';
    borderRadiusVariant?: keyof typeof MSQDX_SPACING.borderRadius;
    class?: string;
    [key: string]: any; // For rest props
  }

  let {
    blur = 12,
    opacity = 0.05,
    hoverable = false,
    noPadding = false,
    accent = 'none' as const,
    borderRadiusVariant = undefined,
    class: className = '',
    children,
    ...rest
  }: Props & { children?: any } = $props();

  let currentTheme: 'light' | 'dark' = 'dark';
  let isHovered = $state(false);

  $effect(() => {
    const unsubscribe = theme.subscribe(value => {
      currentTheme = value;
    });
    return unsubscribe;
  });

  onMount(() => {
    currentTheme = document.documentElement.classList.contains('light') ? 'light' : 'dark';
  });

  function getBorderRadius(): string {
    if (borderRadiusVariant) {
      return `${MSQDX_SPACING.borderRadius[borderRadiusVariant]}px`;
    }
    // Responsive: xxl (40px) on mobile, lg (24px) on desktop (md+)
    // Default to xxl, CSS media query will override for desktop
    return `${MSQDX_SPACING.borderRadius.xxl}px`;
  }

  function getPadding(): string {
    if (noPadding) return '0';
    // Responsive: md (16px) on mobile, lg (24px) on desktop
    return `${MSQDX_SPACING.scale.md}px`;
  }

  function getBackgroundColor(): string {
    const baseColor = currentTheme === 'dark' ? '#000000' : '#ffffff';
    const alphaValue = opacity + (isHovered && hoverable ? 0.05 : 0);
    return `rgba(${currentTheme === 'dark' ? '0, 0, 0' : '255, 255, 255'}, ${alphaValue})`;
  }

  function getBorderColor(): string {
    if (isHovered && hoverable) {
      return `rgba(${MSQDX_COLORS.brand.green
        .replace('#', '')
        .match(/.{2}/g)
        ?.map(x => parseInt(x, 16))
        .join(', ')}, 0.4)`;
    }
    const borderColor = currentTheme === 'dark' ? '255, 255, 255' : '0, 0, 0';
    return `rgba(${borderColor}, 0.12)`;
  }

  function getBorderTopColor(): string {
    const borderColor = currentTheme === 'dark' ? '255, 255, 255' : '0, 0, 0';
    return `rgba(${borderColor}, 0.18)`;
  }

  function getAccentColor(): string {
    if (accent === 'purple') return MSQDX_COLORS.brand.green;
    if (accent === 'yellow') return MSQDX_COLORS.brand.yellow;
    return 'transparent';
  }
</script>

  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <!-- svelte-ignore a11y_role_has_required_aria_props -->
<div
  class="msqdx-glass-card {className}"
  class:hoverable
  class:no-padding={noPadding}
  data-radius-variant={borderRadiusVariant}
  style="
      --blur: {blur}px;
      --opacity: {opacity};
      --border-radius: {getBorderRadius()};
      --padding: {getPadding()};
      --background-color: {getBackgroundColor()};
      --border-color: {getBorderColor()};
      --border-top-color: {getBorderTopColor()};
      --accent-color: {getAccentColor()};
    "
  onmouseenter={() => (isHovered = true)}
  onmouseleave={() => (isHovered = false)}
  role={hoverable ? 'button' : undefined}
  tabindex={hoverable ? 0 : undefined}
  {...rest}
>
  {#if accent !== 'none'}
    <div class="accent-border" style="background: {getAccentColor()};"></div>
  {/if}
  {#if children}{@render children()}{/if}
</div>

<style>
  .msqdx-glass-card {
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;

    border-radius: var(--border-radius);
    padding: var(--padding);

    background-color: var(--background-color);
    backdrop-filter: blur(var(--blur));
    -webkit-backdrop-filter: blur(var(--blur));

    border: 1px solid var(--border-color);
    border-top: 1px solid var(--border-top-color);
    border-left: 1px solid var(--border-top-color);

    box-shadow: var(--shadow, none);
  }

  .msqdx-glass-card.hoverable {
    cursor: pointer;
  }

  .msqdx-glass-card.hoverable:hover {
    background-color: rgba(var(--background-rgb, 0, 0, 0), calc(var(--opacity) + 0.05));
    border-color: rgba(var(--msqdx-color-brand-orange-rgb), 0.4);
  }

  .accent-border {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    z-index: 1;
  }

  /* Responsive adjustments - matching ECHON behavior */
  @media (min-width: 768px) {
    .msqdx-glass-card:not([data-radius-variant]):not(.no-padding) {
      /* Override border-radius for desktop: lg (24px) instead of xxl (40px) */
      /* Only if not explicitly set via borderRadiusVariant and not no-padding */
      border-radius: var(--msqdx-radius-lg) !important;
    }

    .msqdx-glass-card:not(.no-padding):not([style*='padding: 0']) {
      /* Override padding for desktop: lg (24px) instead of md (16px) */
      padding: var(--msqdx-spacing-lg) !important;
    }
  }
</style>
