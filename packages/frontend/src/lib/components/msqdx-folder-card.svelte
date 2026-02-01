<script>
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { MsqdxBaseItemCard } from '$lib/components/ui';
  import MsqdxRadialContextMenu from '$lib/components/msqdx-radial-context-menu.svelte';
  import { createEventDispatcher } from 'svelte';

  export let folder;
  export let selected = false;
  export let className = '';

  const dispatch = createEventDispatcher();
  let showMenu = false;
  let menuX = 0;
  let menuY = 0;

  function handleMenuToggle(event) {
    menuX = event.detail.x;
    menuY = event.detail.y;
    showMenu = !showMenu;
  }

  function handleClick() {
    goto(resolve(`/videos?folder=${folder.id}`));
  }
</script>

<MsqdxBaseItemCard
  title={folder.name}
  subtitle="{folder.videoCount} {folder.videoCount === 1 ? 'Video' : 'Videos'}"
  type="folder"
  {selected}
  {className}
  on:click={handleClick}
  on:menuToggle={handleMenuToggle}
  {...$$restProps}
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
            action: () => dispatch('rename', folder),
          },
          {
            label: 'Delete',
            icon: 'delete',
            action: () => dispatch('delete', folder),
          },
        ]}
        onClose={() => (showMenu = false)}
      />
    {/if}
  </div>
</MsqdxBaseItemCard>
