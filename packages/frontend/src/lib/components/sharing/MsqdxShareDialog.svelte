<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { createEventDispatcher } from 'svelte';
  import { MaterialSymbol, MsqdxFormField, MsqdxButton, MsqdxSelect } from '$lib/components/ui';
  import MsqdxGlassCard from '$lib/components/ui/MsqdxGlassCard.svelte';
  import MsqdxSpinner from '$lib/components/ui/MsqdxSpinner.svelte';
  import { _ } from '$lib/i18n';
  import { MSQDX_COLORS, MSQDX_TYPOGRAPHY } from '$lib/design-tokens';
  import { sharingApi, type Collaborator } from '$lib/api/sharing';

  export let open = false;
  export let itemId: string;
  export let itemType: 'project' | 'video' | 'folder';
  export let itemName: string = '';

  const dispatch = createEventDispatcher();

  let collaborators: Collaborator[] = [];
  let loading = false;
  let inviteLoading = false;
  let error: string | null = null;
  let successMessage: string | null = null;

  // Invite Form
  let email = '';
  let role: 'VIEWER' | 'EDITOR' = 'VIEWER';

  const roleOptions = [
    { value: 'VIEWER', label: 'Viewer' },
    { value: 'EDITOR', label: 'Editor' },
  ];

  $: if (open && itemId) {
    loadCollaborators();
    resetForm();
  }

  function resetForm() {
    email = '';
    role = 'VIEWER';
    error = null;
    successMessage = null;
  }

  async function loadCollaborators() {
    loading = true;
    try {
      if (itemType === 'project') {
        const res = await sharingApi.getProjectCollaborators(itemId);
        collaborators = res || [];
      } else if (itemType === 'folder') {
        const res = await sharingApi.getFolderCollaborators(itemId);
        collaborators = res || [];
      } else {
        const res = await sharingApi.getVideoCollaborators(itemId);
        collaborators = res || [];
      }
    } catch (err: any) {
      error = 'Failed to load collaborators';
      console.error(err);
    } finally {
      loading = false;
    }
  }

  async function handleInvite() {
    if (!email) return;
    inviteLoading = true;
    error = null;
    successMessage = null;

    try {
      if (itemType === 'project') {
        await sharingApi.shareProject(itemId, email, role);
      } else if (itemType === 'folder') {
        await sharingApi.shareFolder(itemId, email, role);
      } else {
        await sharingApi.shareVideo(itemId, email, role);
      }
      successMessage = 'Invitation sent successfully';
      email = ''; // Clear email on success
      loadCollaborators(); // Refresh list
    } catch (err: any) {
      error = err.message || 'Failed to send invitation';
    } finally {
      inviteLoading = false;
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm('Are you sure you want to remove this user?')) return;

    try {
      if (itemType === 'project') {
        await sharingApi.removeProjectShare(itemId, userId);
      } else if (itemType === 'folder') {
        await sharingApi.removeFolderShare(itemId, userId);
      } else {
        await sharingApi.removeVideoShare(itemId, userId);
      }
      loadCollaborators();
    } catch (err: any) {
      error = err.message || 'Failed to remove user';
    }
  }

  function close() {
    open = false;
    dispatch('close');
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/40 backdrop-blur-md"
    transition:fade={{ duration: 200 }}
    on:click|self={close}
  >
    <div
      class="w-full max-w-lg relative"
      transition:scale={{ duration: 300, start: 0.95, easing: quintOut }}
    >
      <MsqdxGlassCard variant="default" borderRadiusVariant="xl" className="overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold" style="color: {MSQDX_COLORS.dark.textPrimary};">
              Share "{itemName}"
            </h2>
            <p class="text-xs mt-1" style="color: {MSQDX_COLORS.dark.textSecondary};">
              Invite people to collaborate on this {itemType}
            </p>
          </div>
          <button
            class="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            on:click={close}
          >
            <MaterialSymbol icon="close" fontSize={20} />
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-6">
          <!-- Invite Section -->
          <div class="space-y-4">
            <div class="flex gap-3 items-end">
              <div class="flex-1">
                <MsqdxFormField
                  label="Email Address"
                  placeholder="user@example.com"
                  bind:value={email}
                  disabled={inviteLoading}
                />
              </div>
              <div class="w-32">
                <MsqdxSelect
                  label="Role"
                  options={roleOptions}
                  bind:value={role}
                  disabled={inviteLoading}
                  placeholder="Role"
                />
              </div>
            </div>
            <div class="flex justify-end">
              <MsqdxButton
                variant="primary"
                disabled={!email || inviteLoading}
                loading={inviteLoading}
                on:click={handleInvite}
              >
                Invite
              </MsqdxButton>
            </div>
          </div>

          {#if error}
            <div
              class="p-3 rounded-lg text-sm bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-2"
            >
              <MaterialSymbol icon="error" fontSize={16} />
              {error}
            </div>
          {/if}

          {#if successMessage}
            <div
              class="p-3 rounded-lg text-sm bg-green-500/10 border border-green-500/20 text-green-500 flex items-center gap-2"
            >
              <MaterialSymbol icon="check_circle" fontSize={16} />
              {successMessage}
            </div>
          {/if}

          <div class="h-px bg-white/10 w-full"></div>

          <!-- Collaborators List -->
          <div>
            <h3 class="text-sm font-medium mb-3" style="color: {MSQDX_COLORS.dark.textPrimary};">
              Who has access
            </h3>

            {#if loading}
              <div class="flex justify-center py-4">
                <MsqdxSpinner size="sm" />
              </div>
            {:else if collaborators.length === 0}
              <p class="text-sm text-center py-2" style="color: {MSQDX_COLORS.dark.textSecondary};">
                No one else has access yet.
              </p>
            {:else}
              <div class="space-y-3 max-h-60 overflow-y-auto pr-1">
                {#each collaborators as user}
                  <div
                    class="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div class="flex items-center gap-3">
                      <div
                        class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white uppercase"
                      >
                        {(user.name || user.email).substring(0, 2)}
                      </div>
                      <div>
                        <p
                          class="text-sm font-medium"
                          style="color: {MSQDX_COLORS.dark.textPrimary};"
                        >
                          {user.name || user.email}
                        </p>
                        <p class="text-xs" style="color: {MSQDX_COLORS.dark.textSecondary};">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div class="flex items-center gap-3">
                      <span
                        class="text-xs px-2 py-1 rounded bg-white/10"
                        style="color: {MSQDX_COLORS.dark.textSecondary};"
                      >
                        {user.role}
                      </span>
                      <button
                        class="text-red-400 hover:text-red-300 transition-colors p-1"
                        on:click={() => handleRemove(user.userId)}
                        title="Remove Access"
                      >
                        <MaterialSymbol icon="delete" fontSize={18} />
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </MsqdxGlassCard>
    </div>
  </div>
{/if}
