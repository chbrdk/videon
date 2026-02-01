<script lang="ts">
  import { contextMenuStore } from '$lib/stores/context-menu.store';
  import MsqdxRadialContextMenu from './msqdx-radial-context-menu.svelte';

  function handleAction(actionId: string, segment: any) {
    window.dispatchEvent(new CustomEvent(`contextmenu-${actionId}`, { detail: segment }));
    contextMenuStore.set(null);
  }

  $: items = $contextMenuStore
    ? [
        {
          label: 'Play Segment',
          icon: 'play_arrow',
          action: () => handleAction('play', $contextMenuStore?.segment),
        },
        {
          label: 'Edit Text',
          icon: 'edit',
          action: () => handleAction('edit', $contextMenuStore?.segment),
        },
        {
          label: 'Re-Voice',
          icon: 'mic',
          action: () => handleAction('revoice', $contextMenuStore?.segment),
        },
        {
          label: 'Delete',
          icon: 'delete',
          action: () => handleAction('delete', $contextMenuStore?.segment),
        },
      ]
    : [];
</script>

{#if $contextMenuStore}
  <MsqdxRadialContextMenu
    x={$contextMenuStore.x}
    y={$contextMenuStore.y}
    {items}
    onClose={() => contextMenuStore.set(null)}
  />
{/if}

<style>
  /* Styling is now handled by MsqdxRadialContextMenu */
</style>
