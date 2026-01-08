<script lang="ts">
  export let title: string;
  export let tokens: Record<string, any>;
</script>

<div class="space-y-4">
  <h3 class="text-lg font-semibold">{title}</h3>
  <div class="overflow-x-auto">
    <table class="min-w-full border-collapse">
      <thead>
        <tr class="border-b border-white/10">
          <th class="text-left p-3 font-medium text-white/80">Token</th>
          <th class="text-left p-3 font-medium text-white/80">Value</th>
        </tr>
      </thead>
      <tbody>
        {#each Object.entries(tokens) as [key, value]}
          {@const displayValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
          <tr class="border-b border-white/5">
            <td class="p-3 font-mono text-sm text-white/90">{key}</td>
            <td class="p-3 font-mono text-sm text-white/70">{displayValue}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .space-y-4 > * + * {
    margin-top: 1rem;
  }
</style>

