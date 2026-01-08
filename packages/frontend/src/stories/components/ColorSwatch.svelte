<script lang="ts">
  import type { ColorTokens } from '$lib/design-tokens';

  export let colors: ColorTokens;
</script>

<div class="space-y-6">
  {#each Object.entries(colors) as [name, scale]}
    <div>
      <h3 class="text-lg font-semibold mb-2 capitalize">{name}</h3>
      <div class="grid grid-cols-10 gap-2">
        {#each Object.entries(scale) as [key, value]}
          <div class="space-y-1">
            <div
              class="h-16 rounded-lg border border-white/20"
              style="background-color: {value};"
              title="{name}-{key}: {value}"
            ></div>
            <div class="text-xs text-center text-gray-400">{key}</div>
            <div class="text-xs text-center text-gray-500 font-mono">{value}</div>
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  .space-y-6 > * + * {
    margin-top: 1.5rem;
  }
  .space-y-1 > * + * {
    margin-top: 0.25rem;
  }
</style>

