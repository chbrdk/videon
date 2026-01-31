<script lang="ts">
  import { MSQDX_COLORS, MSQDX_TYPOGRAPHY } from '$lib/design-tokens';

  interface Props {
    label: string | number;
    sublabel?: string;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
    size?: 'small' | 'medium';
  }

  export let label: string | number;
  export let sublabel: string | undefined = undefined;
  export let color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' = 'primary';
  export let size: 'small' | 'medium' = 'medium';

  function getBaseColor(): string {
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

  function getBadgeStyles(): string {
    const baseColor = getBaseColor();
    const rgb =
      baseColor
        .replace('#', '')
        .match(/.{2}/g)
        ?.map(x => parseInt(x, 16))
        .join(', ') || '0, 202, 85';
    const padding = size === 'small' ? '2px 8px' : '4px 12px';

    return `
      padding: ${padding};
      background-color: rgba(${rgb}, 0.1);
      border-right: 3px solid ${baseColor};
    `;
  }
</script>

<div class="msqdx-badge" style={getBadgeStyles()}>
  <span class="label">{label}</span>
  {#if sublabel}
    <span class="sublabel">{sublabel}</span>
  {/if}
</div>

<style>
  .msqdx-badge {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-end;
    border-radius: 6px;
    min-width: 60px;
  }

  .label {
    font-size: 0.875rem;
    font-weight: 800; /* MSQDX_TYPOGRAPHY.fontWeight.extrabold */
    line-height: 1;
    color: inherit;
  }

  .sublabel {
    font-size: 0.625rem;
    font-weight: 500; /* MSQDX_TYPOGRAPHY.fontWeight.medium */
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.8;
    margin-top: 2px;
    color: inherit;
  }
</style>
