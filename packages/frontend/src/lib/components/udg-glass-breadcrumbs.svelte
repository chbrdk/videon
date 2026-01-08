<script>
  import { breadcrumbs } from '$lib/stores/folders.store';
  import { currentLocale } from '$lib/i18n';

  export let className = '';
</script>

<nav class="breadcrumbs {className}">
  <a href="/videos" class="breadcrumb-item font-light text-xs">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z"/>
    </svg>
    {$currentLocale === 'en' ? 'Root' : 'Hauptordner'}
  </a>
  
  {#each $breadcrumbs as crumb}
    <svg class="breadcrumb-separator" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"/>
    </svg>
    <a href="/videos?folder={crumb.id}" class="breadcrumb-item">
      {crumb.name}
    </a>
  {/each}
</nav>

<style>
  .breadcrumbs {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0.5rem 0.75rem;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05), 0 10px 30px rgba(15, 23, 42, 0.25);
  }

  .breadcrumb-item {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: rgba(255, 255, 255, 0.75);
    text-decoration: none;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    transition: all 0.2s ease;
    font-size: 0.75rem;
    letter-spacing: 0.02em;
  }

  .breadcrumb-item:first-child {
    padding-left: 0.5rem;
  }

  .breadcrumb-item:hover {
    color: rgba(255, 255, 255, 0.95);
    background: rgba(255, 255, 255, 0.12);
    transform: translateY(-1px);
  }

  .breadcrumb-item svg {
    width: 14px;
    height: 14px;
    color: rgba(255, 255, 255, 0.8);
  }

  .breadcrumb-separator {
    opacity: 0.5;
    color: rgba(255, 255, 255, 0.6);
  }

  :global(html.light) .breadcrumbs {
    background: rgba(255, 255, 255, 0.85);
    border: 1px solid rgba(0, 0, 0, 0.08);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4), 0 12px 30px rgba(0, 0, 0, 0.08);
  }

  :global(html.light) .breadcrumb-item {
    color: rgba(17, 24, 39, 0.7);
  }

  :global(html.light) .breadcrumb-item:hover {
    color: rgba(17, 24, 39, 0.95);
    background: rgba(17, 24, 39, 0.08);
  }

  :global(html.light) .breadcrumb-item svg,
  :global(html.light) .breadcrumb-separator {
    color: rgba(17, 24, 39, 0.6);
  }
</style>
