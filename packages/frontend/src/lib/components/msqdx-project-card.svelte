<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { MsqdxGlassMenu, MaterialSymbol } from '$lib/components/ui';
  import { MSQDX_COLORS, MSQDX_TYPOGRAPHY } from '$lib/design-tokens';
  import { base } from '$app/paths';
  import { goto } from '$app/navigation';
  import type { Project } from '$lib/api/projects';
  import { _ } from '$lib/i18n';

  export let project: Project;

  const dispatch = createEventDispatcher();
  let showMenu = false;

  function handleClick() {
    console.log('Navigating to project:', project.id);
    goto(`${base}/projects/${project.id}`);
  }

  function handleMenuAction(action: string) {
    showMenu = false;
    dispatch(action, project);
  }
</script>

<div
  class="msqdx-glass-card cursor-pointer transition-transform hover:scale-105 relative group"
  on:click={handleClick}
  on:keydown={e => e.key === 'Enter' && handleClick()}
  role="button"
  tabindex="0"
  style="
    --blur: var(--msqdx-glass-blur);
    --background-color: var(--msqdx-color-dark-paper);
    --border-color: var(--msqdx-color-dark-border);
    border-radius: 40px;
  "
>
  <!-- Project Menu -->
  <div
    class="absolute top-2 right-2 z-10 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity"
  >
    <div class="relative">
      <button
        class="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors"
        on:click|stopPropagation={() => (showMenu = !showMenu)}
      >
        <MaterialSymbol icon="more_vert" fontSize={20} />
      </button>

      {#if showMenu}
        <MsqdxGlassMenu
          align="right"
          items={[
            { label: _('actions.rename'), icon: 'edit', action: () => handleMenuAction('rename') },
            {
              label: _('actions.share') ?? 'Share',
              icon: 'share',
              action: () => handleMenuAction('share'),
            },
            {
              label: _('actions.delete'),
              icon: 'delete',
              danger: true,
              action: () => handleMenuAction('delete'),
            },
          ]}
          on:close={() => (showMenu = false)}
        />
      {/if}
    </div>
  </div>

  <div class="flex flex-col items-center justify-center p-6 h-full text-center gap-3">
    <div
      class="w-12 h-12 rounded-full flex items-center justify-center"
      style="background-color: {MSQDX_COLORS.tints.purple};"
    >
      <MaterialSymbol icon="movie_edit" fontSize={24} style="color: {MSQDX_COLORS.brand.purple};" />
    </div>
    <h3
      class="font-semibold leading-tight line-clamp-2"
      style="
        color: {MSQDX_COLORS.dark.textPrimary};
        font-family: {MSQDX_TYPOGRAPHY.fontFamily.primary};
      "
    >
      {project.name}
    </h3>
    <span
      class="text-xs"
      style="
        color: {MSQDX_COLORS.dark.textSecondary};
        font-family: {MSQDX_TYPOGRAPHY.fontFamily.mono};
      ">{project.scenes?.length || 0} Scenes</span
    >
  </div>
</div>

<style>
  .msqdx-glass-card {
    position: relative;
    overflow: hidden;
    transition: all var(--msqdx-transition-slow);
    display: flex;
    flex-direction: column;
    /* Glass Effect properties */
    backdrop-filter: blur(var(--blur));
    -webkit-backdrop-filter: blur(var(--blur));
    background-color: var(--background-color);
    border: 1px solid var(--border-color);
  }
</style>
