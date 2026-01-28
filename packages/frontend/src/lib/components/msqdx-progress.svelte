<script lang="ts">
  import { MSQDX_COLORS } from '$lib/design-tokens';
  import { theme } from '$lib/stores/theme.store';
  
  interface Props {
    progress?: number;
    label?: string;
    showPercentage?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }
  
  let {
    progress = 0,
    label = 'Lädt...',
    showPercentage = true,
    size = 'md' as const
  }: Props = $props();

  let currentTheme: 'light' | 'dark' = 'dark';
  
  $effect(() => {
    const unsubscribe = theme.subscribe(value => {
      currentTheme = value;
    });
    return unsubscribe;
  });

  function getSizeClasses() {
    switch (size) {
      case 'sm': return 'h-1';
      case 'md': return 'h-2';
      case 'lg': return 'h-3';
      default: return 'h-2';
    }
  }
  
  function getProgressColor(): string {
    return MSQDX_COLORS.brand.green;
  }
</script>

<div class="w-full">
  {#if label}
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm {currentTheme === 'dark' ? 'text-white/70' : 'text-gray-600'}">{label}</span>
      {#if showPercentage}
        <span class="text-sm {currentTheme === 'dark' ? 'text-white/70' : 'text-gray-600'}">{Math.round(progress)}%</span>
      {/if}
    </div>
  {/if}
  
  <div class="w-full {currentTheme === 'dark' ? 'bg-white/20' : 'bg-gray-200'} rounded-full overflow-hidden">
    <div 
      class="transition-all duration-300 ease-out {getSizeClasses()} rounded-full"
      style="background: {getProgressColor()}; width: {progress}%"
    ></div>
  </div>
</div>
