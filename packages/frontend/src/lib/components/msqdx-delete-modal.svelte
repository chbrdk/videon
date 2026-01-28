<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { MsqdxGlassCard, MsqdxButton, MsqdxChip } from '$lib/components/ui';
  import DeleteIcon from '@material-icons/svg/svg/delete/baseline.svg?raw';
  import CloseIcon from '@material-icons/svg/svg/close/baseline.svg?raw';
  
  export let video: { id: string; filename: string; originalName: string } | null;
  export let open = false;
  
  const dispatch = createEventDispatcher();
  let deleting = false;
  
  // Reset deleting state when modal opens/closes
  $: if (open === false) {
    deleting = false;
  }
  
  // Reset deleting state when modal opens with new video
  $: if (open === true && video) {
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
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center" style="background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(var(--msqdx-glass-blur));">
    <MsqdxGlassCard class="max-w-lg w-full mx-4">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-white flex items-center gap-2">
          {@html DeleteIcon}
          Video löschen
        </h2>
        <button 
          on:click={handleClose}
          class="text-white/60 hover:text-white transition-colors"
          disabled={deleting}
        >
          {@html CloseIcon}
        </button>
      </div>
      
      <div class="space-y-4 mb-6">
        <p class="text-white/80">
          Möchten Sie dieses Video wirklich löschen?
        </p>
        
        <MsqdxGlassCard class="p-4" style="background-color: var(--msqdx-color-tint-pink); border-color: var(--msqdx-color-status-error);">
          <p class="text-white/90 font-semibold mb-2">{video?.originalName}</p>
          <p class="text-sm text-white/60">Diese Aktion kann nicht rückgängig gemacht werden.</p>
        </MsqdxGlassCard>
        
        <div class="text-sm text-white/70 space-y-1">
          <p><strong>Folgende Daten werden gelöscht:</strong></p>
          <ul class="list-disc list-inside pl-2 space-y-1">
            <li>Video-Datei ({formatFileSize(video?.fileSize || 0)})</li>
            <li>Alle Szenen und Keyframes</li>
            <li>Transkriptionen (falls vorhanden)</li>
            <li>Analyse-Logs</li>
            <li>Alle Datenbankeinträge</li>
          </ul>
        </div>
      </div>
      
      <div class="flex gap-3 justify-end">
        <MsqdxButton 
          variant="outlined"
          glass={true}
          disabled={deleting}
          onclick={handleClose}
        >
          Abbrechen
        </MsqdxButton>
        <MsqdxButton 
          variant="contained"
          disabled={deleting}
          onclick={handleDelete}
          style="background-color: var(--msqdx-color-status-error); border-color: var(--msqdx-color-status-error); color: var(--msqdx-color-brand-white);"
        >
          {deleting ? 'Wird gelöscht...' : 'Endgültig löschen'}
        </MsqdxButton>
      </div>
    </MsqdxGlassCard>
  </div>
{/if}
