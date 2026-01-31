<script lang="ts">
  import { MSQDX_COLORS, MSQDX_TYPOGRAPHY, MSQDX_SPACING } from '$lib/design-tokens';
  import { theme } from '$lib/stores/theme.store';
  import MsqdxGlassCard from './MsqdxGlassCard.svelte';
  import MaterialSymbol from './MaterialSymbol.svelte';
  import MsqdxTypography from './MsqdxTypography.svelte';

  interface Props {
    title: string;
    description: string;
    icon: string;
    href?: string;
    count?: number;
    status?: 'active' | 'inactive' | 'error';
    accentColor?: string;
    class?: string;
    onClick?: () => void;
    [key: string]: any;
  }

  export let title: string;
  export let description: string;
  export let icon: string;
  export let href: string | undefined = undefined;
  export let count: number | undefined = undefined;
  export let status: 'active' | 'inactive' | 'error' | undefined = undefined;
  export let accentColor = MSQDX_COLORS.brand.green;
  let className = '';
  export { className as class };
  export let onClick: (() => void) | undefined = undefined;

  let currentTheme: 'light' | 'dark' = 'dark';

  const unsubscribe = theme.subscribe(t => {
    currentTheme = t;
  });

  onMount(() => {
    return unsubscribe;
  });

  $: statusColor = (() => {
    if (status === 'active') return MSQDX_COLORS.status.success;
    if (status === 'error') return MSQDX_COLORS.status.error;
    return currentTheme === 'dark'
      ? MSQDX_COLORS.dark.textSecondary
      : MSQDX_COLORS.light.textSecondary;
  })();

  function handleClick() {
    if (onClick) {
      onClick();
    }
  }
</script>

{#if href}
  <a
    {href}
    class="msqdx-settings-card-link {className}"
    style="text-decoration: none; color: inherit;"
  >
    <MsqdxGlassCard hoverable={true} {...$$restProps}>
      <div class="msqdx-settings-card-content">
        <div
          class="msqdx-settings-card-icon"
          style="
            background: {accentColor};
            box-shadow: 0 8px 24px {accentColor}40;
          "
        >
          <MaterialSymbol
            {icon}
            fontSize={28}
            weight={MSQDX_TYPOGRAPHY.fontWeight.regular}
            style="color: #ffffff;"
          />
        </div>

        <div class="msqdx-settings-card-text">
          <div class="msqdx-settings-card-header">
            <MsqdxTypography variant="h6" weight="extrabold" style="margin: 0;">
              {title}
            </MsqdxTypography>

            <div class="msqdx-settings-card-meta">
              {#if count !== undefined}
                <div class="msqdx-settings-card-count">
                  {count}
                </div>
              {/if}
              {#if status}
                <div
                  class="msqdx-settings-card-status"
                  class:active={status === 'active'}
                  style="
                    background-color: {statusColor};
                    box-shadow: {status === 'active'
                    ? `0 0 12px ${MSQDX_COLORS.status.success}`
                    : 'none'};
                  "
                ></div>
              {/if}
            </div>
          </div>

          <MsqdxTypography variant="body2" style="opacity: 0.6; line-height: 1.6;">
            {description}
          </MsqdxTypography>
        </div>

        <MaterialSymbol
          icon="chevron_right"
          fontSize={24}
          weight={MSQDX_TYPOGRAPHY.fontWeight.regular}
          style="color: var(--icon-color, rgba(255, 255, 255, 0.3)); flex-shrink: 0; margin-top: 0.5rem;"
        />
      </div>
    </MsqdxGlassCard>
  </a>
{:else}
  <MsqdxGlassCard
    hoverable={!!onClick}
    class={className}
    on:click={handleClick}
    role={onClick ? 'button' : undefined}
    tabindex={onClick ? 0 : undefined}
    {...$$restProps}
  >
    <div class="msqdx-settings-card-content">
      <div
        class="msqdx-settings-card-icon"
        style="
          background: {accentColor};
          box-shadow: 0 8px 24px {accentColor}40;
        "
      >
        <MaterialSymbol
          {icon}
          fontSize={28}
          weight={MSQDX_TYPOGRAPHY.fontWeight.regular}
          style="color: #ffffff;"
        />
      </div>

      <div class="msqdx-settings-card-text">
        <div class="msqdx-settings-card-header">
          <MsqdxTypography variant="h6" weight="extrabold" style="margin: 0;">
            {title}
          </MsqdxTypography>

          <div class="msqdx-settings-card-meta">
            {#if count !== undefined}
              <div class="msqdx-settings-card-count">
                {count}
              </div>
            {/if}
            {#if status}
              <div
                class="msqdx-settings-card-status"
                class:active={status === 'active'}
                style="
                  background-color: {statusColor};
                  box-shadow: {status === 'active'
                  ? `0 0 12px ${MSQDX_COLORS.status.success}`
                  : 'none'};
                "
              ></div>
            {/if}
          </div>
        </div>

        <MsqdxTypography variant="body2" style="opacity: 0.6; line-height: 1.6;">
          {description}
        </MsqdxTypography>
      </div>

      <MaterialSymbol
        icon="chevron_right"
        fontSize={24}
        weight={MSQDX_TYPOGRAPHY.fontWeight.regular}
        style="color: var(--icon-color, rgba(255, 255, 255, 0.3)); flex-shrink: 0; margin-top: 0.5rem;"
      />
    </div>
  </MsqdxGlassCard>
{/if}

<style>
  .msqdx-settings-card-link {
    display: block;
    height: 100%;
    text-decoration: none;
    color: inherit;
  }

  .msqdx-settings-card-content {
    display: flex;
    align-items: flex-start;
    gap: 24px;
  }

  .msqdx-settings-card-icon {
    width: 56px;
    height: 56px;
    border-radius: var(--msqdx-radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .msqdx-settings-card-text {
    flex: 1;
    min-width: 0;
  }

  .msqdx-settings-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--msqdx-spacing-xs);
  }

  .msqdx-settings-card-meta {
    display: flex;
    flex-direction: row;
    gap: var(--msqdx-spacing-sm);
    align-items: center;
  }

  .msqdx-settings-card-count {
    font-size: var(--msqdx-font-size-sm);
    font-weight: var(--msqdx-font-weight-bold);
    color: var(--count-color, rgba(255, 255, 255, 0.7));
    padding: 4px 12px;
    border-radius: var(--msqdx-radius-full);
    background-color: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-family: var(--msqdx-font-primary);
  }

  .msqdx-settings-card-status {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    transition: all var(--msqdx-transition-standard);
  }

  .msqdx-settings-card-status.active {
    animation: pulse-status 2s ease-in-out infinite;
  }

  @keyframes pulse-status {
    0%,
    100% {
      box-shadow: 0 0 12px var(--msqdx-color-status-success);
    }
    50% {
      box-shadow: 0 0 20px var(--msqdx-color-status-success);
    }
  }

  :global(.light) .msqdx-settings-card-count {
    --count-color: rgba(0, 0, 0, 0.7);
    background-color: rgba(0, 0, 0, 0.05);
    border-color: rgba(0, 0, 0, 0.1);
  }

  :global(.light) .msqdx-settings-card-content {
    --icon-color: rgba(0, 0, 0, 0.3);
  }

  :global(.dark) .msqdx-settings-card-count {
    --count-color: rgba(255, 255, 255, 0.7);
    background-color: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .msqdx-settings-card-content {
    --icon-color: rgba(255, 255, 255, 0.3);
  }
</style>
