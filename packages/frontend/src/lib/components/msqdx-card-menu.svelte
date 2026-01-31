<script lang="ts">
  import { MsqdxGlassMenu, MaterialSymbol } from '$lib/components/ui';

  let {
    items = [],
  }: {
    items: Array<{
      label: string;
      icon: string;
      action: () => void;
      danger?: boolean;
    }>;
  } = $props();

  let showMenu = $state(false);
</script>

<div class="absolute bottom-4 right-2 z-10 pointer-events-auto">
  <div class="relative">
    <button
      class="flex items-center justify-center w-8 h-8 rounded-full border border-[var(--msqdx-color-brand-orange)] text-[var(--msqdx-color-brand-orange)] bg-black/20 hover:bg-[var(--msqdx-color-brand-orange)] hover:text-white transition-colors backdrop-blur-sm"
      onclick={e => {
        e.stopPropagation();
        showMenu = !showMenu;
      }}
    >
      <MaterialSymbol icon="more_vert" fontSize={20} />
    </button>

    {#if showMenu}
      <MsqdxGlassMenu align="right" {items} onclose={() => (showMenu = false)} />
    {/if}
  </div>
</div>
