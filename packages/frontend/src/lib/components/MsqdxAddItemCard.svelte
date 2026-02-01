<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { MaterialSymbol, MsqdxGlassCard } from '$lib/components/ui';
  import { MSQDX_COLORS, MSQDX_TYPOGRAPHY } from '$lib/design-tokens';

  const dispatch = createEventDispatcher();
</script>

<MsqdxGlassCard
  hoverable
  noPadding={true}
  borderRadiusVariant="xxl"
  on:click={() => dispatch('click')}
  style="
    --border-color: var(--msqdx-color-brand-orange); 
    border-style: dashed !important;
    min-height: 200px;
    font-family: {MSQDX_TYPOGRAPHY.fontFamily.primary};
  "
>
  <div class="flex flex-col items-center justify-center p-8 gap-4 text-center h-full">
    <div
      class="w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-300"
      style="
        background-color: {MSQDX_COLORS.tints.orange};
        border: 1px solid {MSQDX_COLORS.brand.orange};
      "
    >
      <MaterialSymbol icon="add" fontSize={32} style="color: {MSQDX_COLORS.brand.orange};" />
    </div>
    <div>
      <h3
        class="font-medium text-lg mb-1"
        style="
          color: {MSQDX_COLORS.dark.textPrimary};
          font-family: {MSQDX_TYPOGRAPHY.fontFamily.primary};
        "
      >
        Add New
      </h3>
      <p
        class="text-sm"
        style="
          color: {MSQDX_COLORS.dark.textSecondary};
          font-family: {MSQDX_TYPOGRAPHY.fontFamily.mono};
        "
      >
        Upload video, create folder or project
      </p>
    </div>
  </div>
</MsqdxGlassCard>
