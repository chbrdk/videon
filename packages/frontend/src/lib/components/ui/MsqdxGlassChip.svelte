<script lang="ts">
  import { MSQDX_COLORS, MSQDX_SPACING, MSQDX_TYPOGRAPHY } from '$lib/design-tokens';
  import { theme } from '$lib/stores/theme.store';

  export type MsqdxGlassChipVariant = 
    | "trait" 
    | "vocab" 
    | "pain" 
    | "goal" 
    | "value" 
    | "interest" 
    | "social"
    | "draft"
    | "published"
    | "archived"
    | "success"
    | "processing"
    | "error"
    | "pending"
    | "critical"
    | "urgent"
    | "high"
    | "medium"
    | "low";

  export type MsqdxGlassChipSize = "small" | "medium" | "large";

  interface Props {
    children: any;
    variant?: MsqdxGlassChipVariant;
    size?: MsqdxGlassChipSize;
    highlighted?: boolean;
    priority?: "high" | "medium" | "low";
    dashboard?: boolean;
    onClick?: () => void;
    class?: string;
    [key: string]: any;
  }

  let {
    children,
    variant = "trait",
    size = "small",
    highlighted = false,
    priority,
    dashboard = false,
    onClick,
    class: className = '',
    ...rest
  }: Props = $props();

  let currentTheme: 'light' | 'dark' = 'dark';

  $effect(() => {
    const unsubscribe = theme.subscribe(t => {
      currentTheme = t;
    });
    return unsubscribe;
  });

  const chipColor = $derived(() => {
    const colorMap: Record<string, string> = {
      trait: MSQDX_COLORS.brand.purple,
      vocab: MSQDX_COLORS.brand.blue,
      pain: MSQDX_COLORS.status.error,
      goal: MSQDX_COLORS.status.success,
      value: MSQDX_COLORS.brand.yellow,
      interest: MSQDX_COLORS.brand.orange,
      social: MSQDX_COLORS.brand.pink,
      draft: MSQDX_COLORS.dark.textSecondary,
      published: MSQDX_COLORS.status.success,
      archived: MSQDX_COLORS.dark.textSecondary,
      success: MSQDX_COLORS.status.success,
      processing: MSQDX_COLORS.status.info,
      error: MSQDX_COLORS.status.error,
      pending: MSQDX_COLORS.status.warning,
      critical: MSQDX_COLORS.status.error,
      urgent: MSQDX_COLORS.status.warning,
      high: MSQDX_COLORS.status.error,
      medium: MSQDX_COLORS.status.warning,
      low: MSQDX_COLORS.status.info,
    };
    return colorMap[variant] || MSQDX_COLORS.brand.green;
  });

  const padding = $derived(() => {
    const sizeMap = {
      small: `${MSQDX_SPACING.scale.xxs}px ${MSQDX_SPACING.scale.xs}px`,
      medium: `${MSQDX_SPACING.scale.xs}px ${MSQDX_SPACING.scale.sm}px`,
      large: `${MSQDX_SPACING.scale.sm}px ${MSQDX_SPACING.scale.md}px`,
    };
    return sizeMap[size];
  });

  const fontSize = $derived(() => {
    const sizeMap = {
      small: MSQDX_TYPOGRAPHY.fontSize.xs,
      medium: MSQDX_TYPOGRAPHY.fontSize.sm,
      large: MSQDX_TYPOGRAPHY.fontSize.body2,
    };
    return sizeMap[size];
  });
</script>

<span
  class="msqdx-glass-chip {className} variant-{variant} size-{size}"
  class:highlighted={highlighted}
  class:dashboard={dashboard}
  class:clickable={!!onClick}
  class:priority-high={priority === 'high'}
  class:priority-medium={priority === 'medium'}
  class:priority-low={priority === 'low'}
  class:variant-trait-high={variant === 'trait' && priority === 'high'}
  class:variant-trait-medium={variant === 'trait' && priority === 'medium'}
  class:variant-trait-low={variant === 'trait' && priority === 'low'}
  class:variant-vocab-high={variant === 'vocab' && priority === 'high'}
  class:variant-vocab-medium={variant === 'vocab' && priority === 'medium'}
  class:variant-vocab-low={variant === 'vocab' && priority === 'low'}
  class:variant-pain-high={variant === 'pain' && priority === 'high'}
  class:variant-pain-medium={variant === 'pain' && priority === 'medium'}
  class:variant-pain-low={variant === 'pain' && priority === 'low'}
  class:variant-goal-high={variant === 'goal' && priority === 'high'}
  class:variant-goal-medium={variant === 'goal' && priority === 'medium'}
  class:variant-goal-low={variant === 'goal' && priority === 'low'}
  class:variant-value-high={variant === 'value' && priority === 'high'}
  class:variant-value-medium={variant === 'value' && priority === 'medium'}
  class:variant-value-low={variant === 'value' && priority === 'low'}
  class:variant-interest-high={variant === 'interest' && priority === 'high'}
  class:variant-interest-medium={variant === 'interest' && priority === 'medium'}
  class:variant-interest-low={variant === 'interest' && priority === 'low'}
  style="
    padding: {padding};
    font-size: {fontSize};
    --chip-color: {chipColor};
  "
  on:click={onClick}
  role={onClick ? 'button' : undefined}
  tabindex={onClick ? 0 : undefined}
  {...rest}
>
  <slot />
</span>

<style>
  .msqdx-glass-chip {
    display: inline-flex;
    align-items: center;
    border-radius: var(--msqdx-radius-full);
    font-family: var(--msqdx-font-primary);
    font-weight: var(--msqdx-font-weight-medium);
    background-color: var(--chip-bg, rgba(0, 0, 0, 0.05));
    border: 1px solid var(--chip-border, rgba(255, 255, 255, 0.12));
    color: var(--chip-color, rgba(255, 255, 255, 1));
    transition: all 0.2s ease-in-out;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .msqdx-glass-chip.clickable {
    cursor: pointer;
  }

  .msqdx-glass-chip.clickable:hover {
    background-color: var(--chip-hover-bg, rgba(0, 0, 0, 0.1));
    border-color: var(--chip-color, var(--msqdx-color-brand-orange));
  }

  .msqdx-glass-chip.highlighted {
    animation: pulse 2s ease-in-out infinite;
    box-shadow: 0 0 0 4px rgba(var(--msqdx-color-brand-orange-rgb), 0.2);
  }

  @keyframes pulse {
    0%, 100% {
      box-shadow: 0 0 0 4px rgba(var(--msqdx-color-brand-orange-rgb), 0.2);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(var(--msqdx-color-brand-orange-rgb), 0.1);
    }
  }

  /* Variant-specific colors */
  .msqdx-glass-chip.variant-trait {
    --chip-color: var(--msqdx-color-brand-purple);
    --chip-bg: var(--msqdx-color-tint-purple);
  }

  .msqdx-glass-chip.variant-vocab {
    --chip-color: var(--msqdx-color-brand-blue);
    --chip-bg: var(--msqdx-color-tint-blue);
  }

  .msqdx-glass-chip.variant-pain {
    --chip-color: var(--msqdx-color-status-error);
    --chip-bg: var(--msqdx-color-tint-pink);
  }

  .msqdx-glass-chip.variant-goal {
    --chip-color: var(--msqdx-color-status-success);
    --chip-bg: var(--msqdx-color-tint-green);
  }

  .msqdx-glass-chip.variant-value {
    --chip-color: var(--msqdx-color-brand-yellow);
    --chip-bg: var(--msqdx-color-tint-yellow);
  }

  .msqdx-glass-chip.variant-interest {
    --chip-color: var(--msqdx-color-brand-orange);
    --chip-bg: var(--msqdx-color-tint-orange);
  }

  .msqdx-glass-chip.variant-social {
    --chip-color: var(--msqdx-color-brand-pink);
    --chip-bg: var(--msqdx-color-tint-pink);
  }

  .msqdx-glass-chip.variant-success {
    --chip-color: var(--msqdx-color-status-success);
    --chip-bg: var(--msqdx-color-tint-green);
  }

  .msqdx-glass-chip.variant-error {
    --chip-color: var(--msqdx-color-status-error);
    --chip-bg: var(--msqdx-color-tint-pink);
  }

  .msqdx-glass-chip.variant-pending {
    --chip-color: var(--msqdx-color-status-warning);
    --chip-bg: var(--msqdx-color-tint-orange);
  }

  :global(.light) .msqdx-glass-chip {
    --chip-bg: rgba(0, 0, 0, 0.05);
    --chip-border: rgba(0, 0, 0, 0.12);
    --chip-hover-bg: rgba(0, 0, 0, 0.1);
    color: var(--chip-color, rgba(15, 23, 42, 1));
  }

  :global(.dark) .msqdx-glass-chip {
    --chip-bg: rgba(0, 0, 0, 0.05);
    --chip-border: rgba(255, 255, 255, 0.12);
    --chip-hover-bg: rgba(0, 0, 0, 0.1);
    color: var(--chip-color, rgba(255, 255, 255, 1));
  }
</style>
