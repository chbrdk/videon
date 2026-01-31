<script lang="ts">
  import { breadcrumbs } from '$lib/stores/folders.store';
  import { currentLocale } from '$lib/i18n';
  import { resolve } from '$app/paths';
  import {
    MSQDX_SPACING,
    MSQDX_COLORS,
    MSQDX_EFFECTS,
    MSQDX_TYPOGRAPHY,
    MSQDX_ICONS,
  } from '$lib/design-tokens';
  import { MaterialSymbol } from '$lib/components/ui';

  export let className = '';
</script>

<nav
  class="breadcrumbs {className}"
  style="
    border-radius: {MSQDX_SPACING.borderRadius.full}px;
    padding: {MSQDX_SPACING.scale.xs}px {MSQDX_SPACING.scale.sm}px;
    gap: {MSQDX_SPACING.scale.xs}px;
  "
>
  <a
    href={resolve('/videos')}
    class="breadcrumb-item"
    style="
      font-family: {MSQDX_TYPOGRAPHY.fontFamily.primary};
      font-size: {MSQDX_TYPOGRAPHY.fontSize.xs};
      font-weight: {MSQDX_TYPOGRAPHY.fontWeight.light};
      padding: {MSQDX_SPACING.scale.xxs}px {MSQDX_SPACING.scale.sm}px;
      border-radius: {MSQDX_SPACING.borderRadius.full}px;
    "
  >
    <MaterialSymbol
      icon="home"
      fontSize={MSQDX_ICONS.sizes.sm}
      weight={MSQDX_ICONS.weights.regular}
      style="margin-right: 0.35rem;"
    />
    {$currentLocale === 'en' ? 'Root' : 'Hauptordner'}
  </a>

  {#each $breadcrumbs || [] as crumb}
    <MaterialSymbol
      icon="chevron_right"
      fontSize={MSQDX_ICONS.sizes.sm}
      weight={MSQDX_ICONS.weights.regular}
      class="breadcrumb-separator"
    />
    <a
      href={resolve(`/videos?folder=${crumb.id}`)}
      class="breadcrumb-item"
      style="
        font-family: {MSQDX_TYPOGRAPHY.fontFamily.primary};
        font-size: {MSQDX_TYPOGRAPHY.fontSize.xs};
        font-weight: {MSQDX_TYPOGRAPHY.fontWeight.regular};
        padding: {MSQDX_SPACING.scale.xxs}px {MSQDX_SPACING.scale.sm}px;
        border-radius: {MSQDX_SPACING.borderRadius.full}px;
      "
    >
      {crumb.name}
    </a>
  {/each}
</nav>

<style>
  .breadcrumbs {
    display: flex;
    align-items: center;
    backdrop-filter: blur(var(--msqdx-glass-blur));
    transition: all var(--msqdx-transition-standard);
  }

  .breadcrumb-item {
    display: inline-flex;
    align-items: center;
    text-decoration: none;
  }

  .breadcrumb-item:first-child {
    padding-left: var(--msqdx-spacing-xs);
  }

  .breadcrumb-separator {
    opacity: 0.5;
    color: inherit;
  }

  /* Dark theme styles using tokens */
  :global(html.dark) .breadcrumbs {
    background: var(--msqdx-color-dark-paper);
    border: 1px solid var(--msqdx-color-dark-border);
    color: var(--msqdx-color-dark-text-primary);
  }

  :global(html.dark) .breadcrumb-item {
    color: var(--msqdx-color-dark-text-primary);
  }

  :global(html.dark) .breadcrumb-item:hover {
    color: var(--msqdx-color-dark-text-primary);
    background: rgba(255, 255, 255, 0.12);
    transform: translateY(-1px);
  }

  :global(html.dark) .breadcrumb-separator {
    color: var(--msqdx-color-dark-text-secondary);
  }

  /* Light theme styles using tokens */
  :global(html.light) .breadcrumbs {
    background: var(--msqdx-color-light-paper);
    border: 1px solid var(--msqdx-color-light-border);
    color: var(--msqdx-color-light-text-primary);
  }

  :global(html.light) .breadcrumb-item {
    color: var(--msqdx-color-light-text-secondary);
  }

  :global(html.light) .breadcrumb-item:hover {
    color: var(--msqdx-color-light-text-primary);
    background: rgba(0, 0, 0, 0.05);
  }

  :global(html.light) .breadcrumb-separator {
    color: var(--msqdx-color-light-text-secondary);
  }
</style>
