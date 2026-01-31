<script lang="ts">
  import { MSQDX_TYPOGRAPHY, MSQDX_COLORS } from '$lib/design-tokens';
  import { theme } from '$lib/stores/theme.store';

  export type FontWeightVariant = 
    | "thin" 
    | "extralight" 
    | "light" 
    | "regular" 
    | "medium" 
    | "semibold" 
    | "bold" 
    | "extrabold" 
    | "black"
    | number;

  export type TypographyVariant = 
    | "h1" 
    | "h2" 
    | "h3" 
    | "h4" 
    | "h5" 
    | "h6" 
    | "subtitle1" 
    | "subtitle2" 
    | "body1" 
    | "body2" 
    | "button" 
    | "caption" 
    | "overline";

  interface Props {
    variant?: TypographyVariant;
    weight?: FontWeightVariant;
    eyebrow?: boolean;
    class?: string;
    [key: string]: any;
  }

  let {
    variant = 'body1',
    weight,
    eyebrow = false,
    class: className = '',
    children,
    ...rest
  }: Props & { children?: any } = $props();

  let currentTheme = $derived($theme);

  

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
  // Priority: explicit weight prop > variant default > regular
  const computedWeight = $derived(() => {
    if (weight) {
      // Explicit weight prop takes precedence
      if (typeof weight === 'number') {
        return weight;
      } else if (weight in MSQDX_TYPOGRAPHY.fontWeight) {
        return MSQDX_TYPOGRAPHY.fontWeight[weight as keyof typeof MSQDX_TYPOGRAPHY.fontWeight];
      }
    }
    // Use variant-specific default weight
    return VARIANT_WEIGHTS[variant] || MSQDX_TYPOGRAPHY.fontWeight.regular;
  });

  // Determine font size based on variant
  const computedFontSize = $derived(() => {
    const sizeMap: Record<string, string> = {
      h1: MSQDX_TYPOGRAPHY.fontSize['4xl'], // 2.5rem
      h2: MSQDX_TYPOGRAPHY.fontSize['3xl'], // 2rem
      h3: MSQDX_TYPOGRAPHY.fontSize['2xl'], // 1.5rem
      h4: MSQDX_TYPOGRAPHY.fontSize.xl, // 1.25rem
      h5: MSQDX_TYPOGRAPHY.fontSize.lg, // 1.125rem
      h6: MSQDX_TYPOGRAPHY.fontSize.base, // 1rem
      subtitle1: MSQDX_TYPOGRAPHY.fontSize.lg, // 1.125rem
      subtitle2: MSQDX_TYPOGRAPHY.fontSize.base, // 1rem
      body1: MSQDX_TYPOGRAPHY.fontSize.body1, // 0.875rem
      body2: MSQDX_TYPOGRAPHY.fontSize.body2, // 0.8125rem
      button: MSQDX_TYPOGRAPHY.fontSize.body1, // 0.875rem
      caption: MSQDX_TYPOGRAPHY.fontSize.sm, // 0.75rem
      overline: MSQDX_TYPOGRAPHY.fontSize.xs, // 0.625rem
    };
    return sizeMap[variant] || MSQDX_TYPOGRAPHY.fontSize.body1;
  });

  // Determine HTML element based on variant
  const elementTag = $derived(() => {
    if (eyebrow) return 'span';
    if (variant.startsWith('h')) return variant;
    if (variant === 'body1' || variant === 'body2') return 'p';
    if (variant === 'button') return 'span';
    return 'span';
  });

  // Get text color based on theme and eyebrow
  const textColor = $derived(() => {
    if (eyebrow) {
      return currentTheme === 'dark' 
        ? MSQDX_COLORS.dark.textSecondary 
        : MSQDX_COLORS.light.textSecondary;
    }
    return currentTheme === 'dark' 
      ? MSQDX_COLORS.dark.textPrimary 
      : MSQDX_COLORS.light.textPrimary;
  });
</script>

{#if true}
  {@const Tag = elementTag()}
  {@const styles = {
    fontFamily: MSQDX_TYPOGRAPHY.fontFamily.primary,
    fontWeight: eyebrow ? MSQDX_TYPOGRAPHY.fontWeight.bold : computedWeight(),
    fontSize: eyebrow ? MSQDX_TYPOGRAPHY.fontSize.sm : computedFontSize(),
    lineHeight: MSQDX_TYPOGRAPHY.lineHeight.normal,
    color: textColor(),
    margin: 0,
    textTransform: eyebrow ? 'uppercase' : 'none',
    letterSpacing: eyebrow ? '0.12em' : 'normal',
    marginBottom: eyebrow ? '0.5rem' : '0',
  }}

  <Tag
    class="msqdx-typography {className} {eyebrow ? 'eyebrow' : ''}"
    style="
      font-family: {styles.fontFamily};
      font-weight: {styles.fontWeight};
      font-size: {styles.fontSize};
      line-height: {styles.lineHeight};
      color: {styles.color};
      margin: {styles.margin};
      text-transform: {styles.textTransform};
      letter-spacing: {styles.letterSpacing};
      margin-bottom: {styles.marginBottom};
    "
    {...rest}
  >
      {#if children}{@render children()}{/if}
    </Tag>
{/if}

<style>
  .msqdx-typography {
    display: block;
  }
  
  .msqdx-typography.eyebrow {
    display: block;
  }
</style>
