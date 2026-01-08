<script lang="ts">
  export let progress: number = 0;
  export let label: string = 'Lädt...';
  export let showPercentage: boolean = true;
  export let size: 'sm' | 'md' | 'lg' = 'md';

  function getSizeClasses() {
    switch (size) {
      case 'sm': return 'h-1';
      case 'md': return 'h-2';
      case 'lg': return 'h-3';
      default: return 'h-2';
    }
  }
</script>

<div class="w-full">
  {#if label}
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm text-white/70">{label}</span>
      {#if showPercentage}
        <span class="text-sm text-white/70">{Math.round(progress)}%</span>
      {/if}
    </div>
  {/if}
  
  <div class="w-full bg-white/20 rounded-full overflow-hidden">
    <div 
      class="transition-all duration-300 ease-out {getSizeClasses()}"
      style="background: linear-gradient(to right, #3b82f6, #2a343c); width: {progress}%"
    ></div>
  </div>
</div>
