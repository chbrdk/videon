<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  import { MaterialSymbol } from '$lib/components/ui';
  import { _ } from '$lib/i18n';

  let isVisible = false;
  let timer: NodeJS.Timeout;

  function checkMaintenanceTime() {
    const now = new Date();
    // Use Intl to get Berlin hour regardless of local timezone
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Berlin',
      hour: '2-digit',
      hour12: false,
    });

    try {
      const parts = formatter.formatToParts(now);
      const hourPart = parts.find(p => p.type === 'hour');
      if (hourPart) {
        const hour = parseInt(hourPart.value);
        // Notice visible between 18:00 and 09:00
        isVisible = hour >= 18 || hour < 9;
      }
    } catch (e) {
      console.error('Failed to parse Berlin time:', e);
      // Fallback: check local hour if Intl fails
      const hour = now.getHours();
      isVisible = hour >= 18 || hour < 9;
    }
  }

  onMount(() => {
    checkMaintenanceTime();
    // Check every minute
    timer = setInterval(checkMaintenanceTime, 60000);
  });

  onDestroy(() => {
    if (timer) clearInterval(timer);
  });
</script>

{#if isVisible}
  <div
    class="fixed bottom-6 right-6 z-[9999] pointer-events-none"
    transition:fade={{ duration: 300 }}
  >
    <div
      class="glass-panel flex items-center gap-4 p-4 pr-6 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-xl pointer-events-auto max-w-sm animate-float"
      style="background: linear-gradient(135deg, rgba(255, 102, 0, 0.1) 0%, rgba(255, 102, 0, 0.05) 100%);"
    >
      <!-- Icon with Pulsing Effect -->
      <div class="relative flex-shrink-0">
        <div class="absolute inset-0 bg-orange-500/20 rounded-full animate-ping opacity-75"></div>
        <div
          class="relative w-12 h-12 flex items-center justify-center bg-orange-500/20 rounded-xl text-orange-500"
        >
          <MaterialSymbol icon="engineering" fontSize={28} />
        </div>
      </div>

      <!-- Text Content -->
      <div class="flex flex-col gap-0.5">
        <h3 class="text-sm font-bold text-white tracking-tight">
          {_('maintenance.notice.title') || 'Wartungsfenster'}
        </h3>
        <p class="text-xs text-white/60 leading-relaxed font-medium">
          {_('maintenance.notice.message') ||
            'Ab 18 Uhr arbeiten wir an neuen Features. Einige Funktionen können verzögert sein.'}
        </p>
      </div>

      <!-- Close Button (optional, but keep it for UX) -->
      <button
        on:click={() => (isVisible = false)}
        class="absolute top-2 right-2 text-white/30 hover:text-white transition-colors p-1"
        aria-label="Schließen"
      >
        <MaterialSymbol icon="close" fontSize={16} />
      </button>
    </div>
  </div>
{/if}

<style>
  .glass-panel {
    box-shadow:
      0 20px 50px rgba(0, 0, 0, 0.3),
      inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-5px);
    }
  }

  .animate-float {
    animation: float 4s ease-in-out infinite;
  }
</style>
