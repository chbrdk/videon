<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { api } from '$lib/config/environment';
  import { MaterialSymbol, MsqdxButton, MsqdxFormField, MsqdxGlassCard } from '$lib/components/ui';
  import { userStore } from '$lib/stores/user.store';

  export let projectId: string | undefined = undefined;
  export let videoId: string | undefined = undefined;
  export let isOpen = false;

  const dispatch = createEventDispatcher();

  let email = '';
  let role = 'VIEWER';
  let isLoading = false;
  let message = '';
  let error = '';

  // Setup list of existing shares (mock or fetch)
  // For now, we don't have an endpoint to list shares per resource explicitly in sharing.routes.ts
  // We might need to add `GET /projects/:id/shares`?
  // Current implementation plan didn't specify it, but UX requires seeing who has access.
  // I'll skip listing existing shares for MVP step 1, or just assume we add it later.
  // Actually, I can add it to projectService/videoService response (we included it in getProjectById).
  // So if we pass existing shares as prop? Or fetch project details again.

  // For MVP, just the INVITE part.

  async function handleShare() {
    if (!email) {
      error = 'Email required';
      return;
    }

    isLoading = true;
    error = '';
    message = '';

    try {
      const endpoint = projectId
        ? `${api.baseUrl}/sharing/projects/${projectId}/share`
        : `${api.baseUrl}/sharing/videos/${videoId}/share`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json();

      if (res.ok) {
        message = 'Invitation sent successfully';
        email = '';
        setTimeout(() => dispatch('close'), 1500);
      } else {
        error = data.error || 'Failed to share';
      }
    } catch (e) {
      error = 'Network error';
    } finally {
      isLoading = false;
    }
  }

  function handleClose() {
    dispatch('close');
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    transition:fade={{ duration: 200 }}
    on:click|self={handleClose}
  >
    <div class="w-full max-w-md" transition:scale={{ start: 0.95, duration: 200 }}>
      <MsqdxGlassCard variant="default" borderRadiusVariant="xl" className="p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold text-white flex items-center gap-2">
            <MaterialSymbol icon="share" />
            Share Access
          </h3>
          <button on:click={handleClose} class="text-white/50 hover:text-white transition-colors">
            <MaterialSymbol icon="close" />
          </button>
        </div>

        <div class="space-y-4">
          <MsqdxFormField
            label="Email Address"
            type="email"
            placeholder="colleague@example.com"
            bind:value={email}
            icon="mail"
          />

          <div class="space-y-1">
            <label class="text-sm font-medium text-white/80">Permission</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                class="p-2 rounded-lg border text-sm transition-all {role === 'VIEWER'
                  ? 'bg-blue-500/20 border-blue-500 text-blue-200'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}"
                on:click={() => (role = 'VIEWER')}
              >
                Viewer
              </button>
              <button
                class="p-2 rounded-lg border text-sm transition-all {role === 'EDITOR'
                  ? 'bg-blue-500/20 border-blue-500 text-blue-200'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}"
                on:click={() => (role = 'EDITOR')}
              >
                Editor
              </button>
            </div>
            <p class="text-xs text-white/40 mt-1">
              {#if role === 'VIEWER'}
                Can view and play content. Cannot edit or delete.
              {:else}
                Can edit content, trim scenes, and change metadata. Cannot delete original.
              {/if}
            </p>
          </div>

          {#if error}
            <div class="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
              {error}
            </div>
          {/if}

          {#if message}
            <div
              class="p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg"
            >
              {message}
            </div>
          {/if}

          <div class="flex justify-end gap-3 pt-4">
            <MsqdxButton variant="ghost" on:click={handleClose}>Cancel</MsqdxButton>
            <MsqdxButton
              variant="primary"
              loading={isLoading}
              on:click={handleShare}
              disabled={!email}
            >
              Send Invite
            </MsqdxButton>
          </div>
        </div>
      </MsqdxGlassCard>
    </div>
  </div>
{/if}
