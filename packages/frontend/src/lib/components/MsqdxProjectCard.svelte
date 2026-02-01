<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { MsqdxBaseItemCard } from '$lib/components/ui';
  import MsqdxRadialContextMenu from '$lib/components/msqdx-radial-context-menu.svelte';

  export let project;
  export let selected = false;

  const dispatch = createEventDispatcher();

  let showMenu = false;
  let menuX = 0;
  let menuY = 0;

  function handleMenuToggle(event: CustomEvent<{ x: number; y: number }>) {
    menuX = event.detail.x;
    menuY = event.detail.y;
    showMenu = !showMenu;
  }

  function handleClick() {
    dispatch('select', project);
  }
</script>

<MsqdxBaseItemCard
  title={project.name || 'Untitled Project'}
  subtitle="Project"
  type="project"
  {selected}
  on:click={handleClick}
  on:menuToggle={handleMenuToggle}
>
  <div slot="overlay">
    {#if showMenu}
      <MsqdxRadialContextMenu
        x={menuX}
        y={menuY}
        items={[
          {
            label: 'Rename',
            icon: 'edit',
            action: () => dispatch('rename', project),
          },
          {
            label: 'Share',
            icon: 'share',
            action: () => dispatch('share', project),
          },
          {
            label: 'Delete',
            icon: 'delete',
            action: () => dispatch('delete', project),
          },
        ]}
        onClose={() => (showMenu = false)}
      />
    {/if}
  </div>
</MsqdxBaseItemCard>
