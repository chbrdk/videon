<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { api } from '$lib/config/environment';

  let isExpanded = false;
  let services = {
    backend: { status: 'unknown', lastCheck: null as Date | null, running: false },
    analyzer: { status: 'unknown', lastCheck: null as Date | null, running: false },
    saliency: { status: 'unknown', lastCheck: null as Date | null, running: false },
    audioSeparation: { status: 'unknown', lastCheck: null as Date | null, running: false },
    frontend: { status: 'healthy', lastCheck: new Date() as Date | null, running: true },
  };

  let checkInterval: NodeJS.Timeout;
  let operating: Set<string> = new Set();

  async function checkServiceHealth() {
    const timestamp = new Date();

    // Show loading state briefly
    services.backend.status = 'checking';
    services.analyzer.status = 'checking';
    services.saliency.status = 'checking';
    services.audioSeparation.status = 'checking';

    try {
      // Single Backend Health Check (includes all services)
      const backendResponse = await fetch(`${api.baseUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (backendResponse.ok) {
        const data = await backendResponse.json();
        services.backend = {
          status: data.status === 'ok' ? 'healthy' : 'unhealthy',
          lastCheck: timestamp as Date | null,
          running: services.backend.running,
        };
        services.analyzer = {
          status: data.services?.analyzer === 'healthy' ? 'healthy' : 'unavailable',
          lastCheck: timestamp as Date | null,
          running: services.analyzer.running,
        };
        services.saliency = {
          status: data.services?.saliency === 'healthy' ? 'healthy' : 'unavailable',
          lastCheck: timestamp as Date | null,
          running: services.saliency.running,
        };
        services.audioSeparation = {
          status: data.services?.audioSeparation === 'healthy' ? 'healthy' : 'unavailable',
          lastCheck: timestamp as Date | null,
          running: services.audioSeparation.running,
        };
      } else {
        services.backend = {
          status: 'unhealthy',
          lastCheck: timestamp as Date | null,
          running: services.backend.running,
        };
        services.analyzer = {
          status: 'unavailable',
          lastCheck: timestamp as Date | null,
          running: services.analyzer.running,
        };
        services.saliency = {
          status: 'unavailable',
          lastCheck: timestamp as Date | null,
          running: services.saliency.running,
        };
        services.audioSeparation = {
          status: 'unavailable',
          lastCheck: timestamp as Date | null,
          running: services.audioSeparation.running,
        };
      }
    } catch (error) {
      services.backend = {
        status: 'unhealthy',
        lastCheck: timestamp as Date | null,
        running: services.backend.running,
      };
      services.analyzer = {
        status: 'unavailable',
        lastCheck: timestamp as Date | null,
        running: services.analyzer.running,
      };
      services.saliency = {
        status: 'unavailable',
        lastCheck: timestamp as Date | null,
        running: services.saliency.running,
      };
      services.audioSeparation = {
        status: 'unavailable',
        lastCheck: timestamp as Date | null,
        running: services.audioSeparation.running,
      };
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'healthy':
        return 'text-green-400';
      case 'unhealthy':
        return 'text-red-400';
      case 'unavailable':
        return 'text-yellow-400';
      case 'checking':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  }

  function getStatusIcon(status: string): string {
    switch (status) {
      case 'healthy':
        return '✓';
      case 'unhealthy':
        return '✗';
      case 'unavailable':
        return '⚠';
      case 'checking':
        return '⟳';
      default:
        return '?';
    }
  }

  function formatLastCheck(lastCheck: Date | null): string {
    if (!lastCheck) return 'Never';
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastCheck.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return lastCheck.toLocaleTimeString();
  }

  onMount(() => {
    checkServiceHealth();
    getServiceRunningStatus();
    checkInterval = setInterval(() => {
      checkServiceHealth();
      getServiceRunningStatus();
    }, 10000); // Check every 10 seconds
  });

  onDestroy(() => {
    if (checkInterval) clearInterval(checkInterval);
  });

  function toggleExpanded() {
    isExpanded = !isExpanded;
  }

  async function startService(serviceName: string) {
    if (operating.has(serviceName)) return;

    operating.add(serviceName);
    try {
      const response = await fetch(`${api.baseUrl}/services/${serviceName}/start`, {
        method: 'POST',
      });

      if (response.ok) {
        // Refresh status after a short delay
        setTimeout(checkServiceHealth, 1000);
      } else {
        const error = await response.json();
        console.error(`Failed to start service ${serviceName}:`, error);
        alert(`Failed to start ${serviceName}: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Error starting service ${serviceName}:`, error);
      alert(`Error starting ${serviceName}. Please check if the backend API is running.`);
    } finally {
      operating.delete(serviceName);
    }
  }

  async function stopService(serviceName: string) {
    if (operating.has(serviceName)) return;

    operating.add(serviceName);
    try {
      const response = await fetch(`${api.baseUrl}/services/${serviceName}/stop`, {
        method: 'POST',
      });

      if (response.ok) {
        // Refresh status after a short delay
        setTimeout(checkServiceHealth, 1000);
      } else {
        const error = await response.json();
        console.error(`Failed to stop service ${serviceName}:`, error);
        alert(`Failed to stop ${serviceName}: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Error stopping service ${serviceName}:`, error);
      alert(`Error stopping ${serviceName}. Please check if the backend API is running.`);
    } finally {
      operating.delete(serviceName);
    }
  }

  async function restartService(serviceName: string) {
    if (operating.has(serviceName)) return;

    operating.add(serviceName);
    try {
      const response = await fetch(`${api.baseUrl}/services/${serviceName}/restart`, {
        method: 'POST',
      });

      if (response.ok) {
        // Refresh status after a short delay
        setTimeout(checkServiceHealth, 1000);
      } else {
        const error = await response.json();
        console.error(`Failed to restart service ${serviceName}:`, error);
        alert(`Failed to restart ${serviceName}: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Error restarting service ${serviceName}:`, error);
      alert(`Error restarting ${serviceName}. Please check if the backend API is running.`);
    } finally {
      operating.delete(serviceName);
    }
  }

  function isOperating(serviceName: string): boolean {
    return operating.has(serviceName);
  }

  async function getServiceRunningStatus() {
    try {
      const response = await fetch(`${api.baseUrl}/services/status`);
      if (response.ok) {
        const data = await response.json();
        // Update running status from the API
        if (data.backend) services.backend.running = data.backend.running;
        if (data.analyzer) services.analyzer.running = data.analyzer.running;
        if (data.saliency) services.saliency.running = data.saliency.running;
        if (data.audioSeparation) services.audioSeparation.running = data.audioSeparation.running;
      }
    } catch (error) {
      console.error('Failed to get service status:', error);
    }
  }
</script>

<!-- Fixed Position Button -->
<div class="fixed bottom-4 right-4 z-50">
  <!-- Main Status Button -->
  <button
    on:click={toggleExpanded}
    class="glass-button flex items-center gap-2 px-3 py-2 rounded-full shadow-lg hover:scale-105 transition-all duration-200"
    title="Service Status"
  >
    <div class="w-2 h-2 rounded-full {getStatusColor(services.backend.status)} bg-current"></div>
    <span class="text-xs font-medium">Services</span>
    <svg
      class="w-3 h-3 transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"
      ></path>
    </svg>
  </button>

  <!-- Expanded Panel -->
  {#if isExpanded}
    <div class="glass-card mt-2 p-4 min-w-64 animate-in slide-in-from-bottom-2 duration-200">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Service Status</h3>
        <button
          on:click={checkServiceHealth}
          class="glass-button p-1 rounded"
          title="Refresh Status"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            ></path>
          </svg>
        </button>
      </div>

      <div class="space-y-2">
        <!-- Backend Service -->
        <div class="flex items-center justify-between py-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium text-gray-700 dark:text-gray-300">Backend</span>
            <span
              class="text-xs {getStatusColor(services.backend.status)} {services.backend.status ===
              'checking'
                ? 'animate-spin'
                : ''}"
            >
              {getStatusIcon(services.backend.status)}
            </span>
          </div>
          <button
            on:click={() => restartService('backend')}
            disabled={isOperating('backend')}
            class="glass-button p-1 text-xs w-6 h-6 flex items-center justify-center"
            title="Restart Backend"
          >
            {#if isOperating('backend')}
              <div class="animate-spin">⟳</div>
            {:else}
              ⟳
            {/if}
          </button>
        </div>

        <!-- Analyzer Service -->
        <div class="flex items-center justify-between py-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium text-gray-700 dark:text-gray-300">Analyzer</span>
            <span
              class="text-xs {getStatusColor(services.analyzer.status)} {services.analyzer
                .status === 'checking'
                ? 'animate-spin'
                : ''}"
            >
              {getStatusIcon(services.analyzer.status)}
            </span>
          </div>
          {#if services.analyzer.running}
            <button
              on:click={() => stopService('analyzer')}
              disabled={isOperating('analyzer')}
              class="glass-button p-1 text-xs w-6 h-6 flex items-center justify-center text-red-400"
              title="Stop Analyzer"
            >
              {#if isOperating('analyzer')}
                <div class="animate-spin">⟳</div>
              {:else}
                ⏸
              {/if}
            </button>
          {:else}
            <button
              on:click={() => startService('analyzer')}
              disabled={isOperating('analyzer')}
              class="glass-button p-1 text-xs w-6 h-6 flex items-center justify-center text-green-400"
              title="Start Analyzer"
            >
              {#if isOperating('analyzer')}
                <div class="animate-spin">⟳</div>
              {:else}
                ▶
              {/if}
            </button>
          {/if}
        </div>

        <!-- Saliency Service -->
        <div class="flex items-center justify-between py-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium text-gray-700 dark:text-gray-300">Saliency</span>
            <span
              class="text-xs {getStatusColor(services.saliency.status)} {services.saliency
                .status === 'checking'
                ? 'animate-spin'
                : ''}"
            >
              {getStatusIcon(services.saliency.status)}
            </span>
          </div>
          {#if services.saliency.running}
            <button
              on:click={() => stopService('saliency')}
              disabled={isOperating('saliency')}
              class="glass-button p-1 text-xs w-6 h-6 flex items-center justify-center text-red-400"
              title="Stop Saliency"
            >
              {#if isOperating('saliency')}
                <div class="animate-spin">⟳</div>
              {:else}
                ⏸
              {/if}
            </button>
          {:else}
            <button
              on:click={() => startService('saliency')}
              disabled={isOperating('saliency')}
              class="glass-button p-1 text-xs w-6 h-6 flex items-center justify-center text-green-400"
              title="Start Saliency"
            >
              {#if isOperating('saliency')}
                <div class="animate-spin">⟳</div>
              {:else}
                ▶
              {/if}
            </button>
          {/if}
        </div>

        <!-- Audio Separation Service -->
        <div class="flex items-center justify-between py-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium text-gray-700 dark:text-gray-300"
              >Audio Separation</span
            >
            <span
              class="text-xs {getStatusColor(services.audioSeparation.status)} {services
                .audioSeparation.status === 'checking'
                ? 'animate-spin'
                : ''}"
            >
              {getStatusIcon(services.audioSeparation.status)}
            </span>
          </div>
          {#if services.audioSeparation.running}
            <button
              on:click={() => stopService('audioSeparation')}
              disabled={isOperating('audioSeparation')}
              class="glass-button p-1 text-xs w-6 h-6 flex items-center justify-center text-red-400"
              title="Stop Audio Separation"
            >
              {#if isOperating('audioSeparation')}
                <div class="animate-spin">⟳</div>
              {:else}
                ⏸
              {/if}
            </button>
          {:else}
            <button
              on:click={() => startService('audioSeparation')}
              disabled={isOperating('audioSeparation')}
              class="glass-button p-1 text-xs w-6 h-6 flex items-center justify-center text-green-400"
              title="Start Audio Separation"
            >
              {#if isOperating('audioSeparation')}
                <div class="animate-spin">⟳</div>
              {:else}
                ▶
              {/if}
            </button>
          {/if}
        </div>

        <!-- Frontend Service -->
        <div class="flex items-center justify-between py-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium text-gray-700 dark:text-gray-300">Frontend</span>
            <span class="text-xs {getStatusColor(services.frontend.status)}">
              {getStatusIcon(services.frontend.status)}
            </span>
          </div>
          <span class="text-xs text-gray-500 dark:text-gray-400">
            {formatLastCheck(services.frontend.lastCheck)}
          </span>
        </div>
      </div>

      <!-- Status Legend -->
      <div class="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <div class="flex items-center gap-1">
            <span class="text-green-400">✓</span>
            <span>Healthy</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-red-400">✗</span>
            <span>Error</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-yellow-400">⚠</span>
            <span>Unavailable</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-blue-400">⟳</span>
            <span>Checking</span>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  @keyframes slide-in-from-bottom {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .animate-in {
    animation: slide-in-from-bottom 0.2s ease-out;
  }

  .spinning {
    animation: spin 1s linear infinite;
  }
</style>
