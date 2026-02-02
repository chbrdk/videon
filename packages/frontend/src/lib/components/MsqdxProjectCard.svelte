<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { MsqdxBaseItemCard } from '$lib/components/ui';
  import MsqdxRadialContextMenu from '$lib/components/msqdx-radial-context-menu.svelte';
  import { _ } from '$lib/i18n';

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

  function handleClick(event: MouseEvent) {
    dispatch('select', project);
    dispatch('click', event);
  }
</script>

<MsqdxBaseItemCard
  title={project.name || 'Untitled Project'}
  subtitle={_('project.type')}
  type="project"
  {selected}
  shared={!!project.sharedRole}
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
            label: _('actions.rename'),
            icon: 'edit',
            action: () => dispatch('rename', project),
          },
          {
            label: _('actions.share'),
            icon: 'share',
            action: () => dispatch('share', project),
          },
          {
            label: _('actions.delete'),
            icon: 'delete',
            action: () => dispatch('delete', project),
          },
        ]}
        onClose={() => (showMenu = false)}
      />
    {/if}
  </div>
</MsqdxBaseItemCard>
