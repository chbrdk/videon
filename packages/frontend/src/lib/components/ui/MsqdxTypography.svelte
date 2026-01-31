<script lang="ts">
  import { MSQDX_TYPOGRAPHY, MSQDX_COLORS } from '$lib/design-tokens';
  import { theme } from '$lib/stores/theme.store';

  export type FontWeightVariant =
    | 'thin'
    | 'extralight'
    | 'light'
    | 'regular'
    | 'medium'
    | 'semibold'
    | 'bold'
    | 'extrabold'
    | 'black'
    | number;

  export type TypographyVariant =
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6'
    | 'subtitle1'
    | 'subtitle2'
    | 'body1'
    | 'body2'
    | 'button'
    | 'caption'
    | 'overline';

  interface Props {
    variant?: TypographyVariant;
    weight?: FontWeightVariant;
    eyebrow?: boolean;
    class?: string;
    [key: string]: any;
  }

  export let variant: TypographyVariant = 'body1';
  export let weight: FontWeightVariant | undefined = undefined;
  export let eyebrow = false;
  let className = '';
  export { className as class };

  let currentTheme: 'light' | 'dark' = 'dark';

  const unsubscribe = theme.subscribe(value => {
    currentTheme = value;
  });

  onMount(() => {
    return unsubscribe;
  });

  // Default font weights for different variants
  const VARIANT_WEIGHTS: Record<string, number> = {
    h1: MSQDX_TYPOGRAPHY.fontWeight.extrabold, // 800
    h2: MSQDX_TYPOGRAPHY.fontWeight.extrabold, // 800
    h3: MSQDX_TYPOGRAPHY.fontWeight.bold, // 700
    h4: MSQDX_TYPOGRAPHY.fontWeight.bold, // 700
    h5: MSQDX_TYPOGRAPHY.fontWeight.semibold, // 600
    h6: MSQDX_TYPOGRAPHY.fontWeight.semibold, // 600
    subtitle1: MSQDX_TYPOGRAPHY.fontWeight.medium, // 500
    subtitle2: MSQDX_TYPOGRAPHY.fontWeight.semibold, // 600
    body1: MSQDX_TYPOGRAPHY.fontWeight.regular, // 400
    body2: MSQDX_TYPOGRAPHY.fontWeight.regular, // 400
    button: MSQDX_TYPOGRAPHY.fontWeight.semibold, // 600
    caption: MSQDX_TYPOGRAPHY.fontWeight.regular, // 400
    overline: MSQDX_TYPOGRAPHY.fontWeight.medium, // 500
  };

  // Determine font weight
  $: computedWeight = (() => {
    if (weight) {
      if (typeof weight === 'number') return weight;
      if (weight in MSQDX_TYPOGRAPHY.fontWeight) {
        return MSQDX_TYPOGRAPHY.fontWeight[weight as keyof typeof MSQDX_TYPOGRAPHY.fontWeight];
      }
    }
    return VARIANT_WEIGHTS[variant] || MSQDX_TYPOGRAPHY.fontWeight.regular;
  })();

  // Determine font size based on variant
  $: computedFontSize = (() => {
    const sizeMap: Record<string, string> = {
      h1: MSQDX_TYPOGRAPHY.fontSize['4xl'],
      h2: MSQDX_TYPOGRAPHY.fontSize['3xl'],
      h3: MSQDX_TYPOGRAPHY.fontSize['2xl'],
      h4: MSQDX_TYPOGRAPHY.fontSize.xl,
      h5: MSQDX_TYPOGRAPHY.fontSize.lg,
      h6: MSQDX_TYPOGRAPHY.fontSize.base,
      subtitle1: MSQDX_TYPOGRAPHY.fontSize.lg,
      subtitle2: MSQDX_TYPOGRAPHY.fontSize.base,
      body1: MSQDX_TYPOGRAPHY.fontSize.body1,
      body2: MSQDX_TYPOGRAPHY.fontSize.body2,
      button: MSQDX_TYPOGRAPHY.fontSize.body1,
      caption: MSQDX_TYPOGRAPHY.fontSize.sm,
      overline: MSQDX_TYPOGRAPHY.fontSize.xs,
    };
    return sizeMap[variant] || MSQDX_TYPOGRAPHY.fontSize.body1;
  })();

  // Determine HTML element based on variant
  $: elementTag = (() => {
    if (eyebrow) return 'span';
    if (variant.startsWith('h')) return variant;
    if (variant === 'body1' || variant === 'body2') return 'p';
    return 'span';
  })();

  // Get text color based on theme and eyebrow
  $: textColor = (() => {
    if (eyebrow) {
      return currentTheme === 'dark'
        ? MSQDX_COLORS.dark.textSecondary
        : MSQDX_COLORS.light.textSecondary;
    }
    return currentTheme === 'dark' ? MSQDX_COLORS.dark.textPrimary : MSQDX_COLORS.light.textPrimary;
  })();
</script>

{#if true}
  <svelte:element
    this={elementTag}
    class="msqdx-typography {className} {eyebrow ? 'eyebrow' : ''}"
    style="
      font-family: {MSQDX_TYPOGRAPHY.fontFamily.primary};
      font-weight: {eyebrow ? MSQDX_TYPOGRAPHY.fontWeight.bold : computedWeight};
      font-size: {eyebrow ? MSQDX_TYPOGRAPHY.fontSize.sm : computedFontSize};
      line-height: {MSQDX_TYPOGRAPHY.lineHeight.normal};
      color: {textColor};
      margin: 0;
      text-transform: {eyebrow ? 'uppercase' : 'none'};
      letter-spacing: {eyebrow ? '0.12em' : 'normal'};
      margin-bottom: {eyebrow ? '0.5rem' : '0'};
    "
    {...$$restProps}
  >
    <slot />
  </svelte:element>
{/if}

<style>
  .msqdx-typography {
    display: block;
  }

  .msqdx-typography.eyebrow {
    display: block;
  }
</style>
