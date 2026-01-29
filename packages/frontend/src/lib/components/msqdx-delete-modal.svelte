<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { MsqdxGlassCard, MsqdxButton, MsqdxChip } from '$lib/components/ui';
  import { MaterialSymbol } from '$lib/components/ui';
  import { _ } from '$lib/i18n';

  // Generic item type
  export let item: {
    id: string;
    name?: string;
    originalName?: string;
    filename?: string;
    fileSize?: number;
  } | null;
  export let type: 'video' | 'folder' | 'project' = 'video';
  export let open = false;

  const dispatch = createEventDispatcher();
  let deleting = false;

  // Reset deleting state when modal opens/closes
  $: if (open === false) {
    deleting = false;
  }

  // Reset deleting state when modal opens with new item
  $: if (open === true && item) {
    deleting = false;
  }

  function handleClose() {
    if (!deleting) {
      dispatch('close');
    }
  }

  async function handleDelete() {
    deleting = true;
    dispatch('confirm');
  }

  function formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Helper to get display name
  $: displayName = item ? item.name || item.originalName || item.filename || 'Item' : '';
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center"
    style="background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(var(--msqdx-glass-blur));"
  >
    <MsqdxGlassCard class="max-w-lg w-full mx-4">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white flex items-center gap-2">
          <MaterialSymbol icon="delete" fontSize={32} class="text-white" />
          {#if type === 'video'}
            {_('delete.videoTitle')}
          {:else if type === 'folder'}
            {_('delete.folderTitle') || 'Delete Folder'}
          {:else if type === 'project'}
            {_('delete.projectTitle') || 'Delete Project'}
          {/if}
        </h2>
        <button
          on:click={handleClose}
          class="text-white/60 hover:text-white transition-colors"
          disabled={deleting}
        >
          <MaterialSymbol icon="close" fontSize={24} />
        </button>
      </div>

      <div class="space-y-4 mb-6">
        <p class="text-white/80">
          {#if type === 'video'}
            {_('delete.videoConfirm')}
          {:else if type === 'folder'}
            {_('delete.folderConfirm') || 'Are you sure you want to delete this folder?'}
          {:else}
            {_('delete.projectConfirm') || 'Are you sure you want to delete this project?'}
          {/if}
        </p>

        <MsqdxGlassCard
          class="p-4"
          style="background-color: var(--msqdx-color-tint-pink); border-color: var(--msqdx-color-status-error);"
        >
          <p class="text-white/90 font-semibold mb-2">{displayName}</p>
          <p class="text-sm text-white/60">{_('delete.warning')}</p>
        </MsqdxGlassCard>

        {#if type === 'video'}
          <div class="text-sm text-white/70 space-y-1">
            <p><strong>{_('delete.dataDeleted')}</strong></p>
            <ul class="list-disc list-inside pl-2 space-y-1">
              <li>{_('delete.data.file', { size: formatFileSize(item?.fileSize || 0) })}</li>
              <li>{_('delete.data.scenes')}</li>
              <li>{_('delete.data.transcripts')}</li>
              <li>{_('delete.data.logs')}</li>
              <li>{_('delete.data.db')}</li>
            </ul>
          </div>
        {:else if type === 'folder'}
          <!-- Folder specific warning -->
          <div class="text-sm text-white/70">
            <p>
              {_('delete.folderWarning') ||
                'All videos and subfolders inside will be moved to root or deleted (depending on implementation).'}
            </p>
          </div>
        {/if}
      </div>

      <div class="flex gap-3 justify-end">
        <MsqdxButton variant="outlined" glass={true} disabled={deleting} onclick={handleClose}>
          {_('actions.cancel')}
        </MsqdxButton>
        <MsqdxButton
          variant="contained"
          disabled={deleting}
          onclick={handleDelete}
          style="background-color: var(--msqdx-color-status-error); border-color: var(--msqdx-color-status-error); color: var(--msqdx-color-brand-white);"
        >
          {deleting ? _('delete.deleting') : _('delete.finalConfirm')}
        </MsqdxButton>
      </div>
    </MsqdxGlassCard>
  </div>
{/if}
