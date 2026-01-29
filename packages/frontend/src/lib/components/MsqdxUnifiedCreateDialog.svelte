<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { MaterialSymbol } from '$lib/components/ui';
  import { _ } from '$lib/i18n';
  import MsqdxGlassCard from '$lib/components/ui/MsqdxGlassCard.svelte';
  import MsqdxProgress from '$lib/components/msqdx-progress.svelte';
  import { videosApi } from '$lib/api/videos';
  import { projectsApi } from '$lib/api/projects';
  import { createFolder } from '$lib/stores/folders.store'; // Assuming you can import this action
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';

  export let open = false;
  export let currentFolderId: string | null = null;
  export let onUploadComplete: () => void = () => {};

  const dispatch = createEventDispatcher();

  // State: 'menu' | 'upload' | 'project' | 'folder'
  let mode = 'menu';

  // Upload State
  let files: FileList | null = null;
  let uploading = false;
  let progress = 0;
  let error: string | null = null;
  let dragOver = false;
  let currentFileIndex = 0;
  let totalFiles = 0;

  // Project/Folder State
  let newItemName = '';
  let creating = false;

  function close() {
    open = false;
    resetState();
    dispatch('close');
  }

  function resetState() {
    mode = 'menu';
    files = null;
    uploading = false;
    progress = 0;
    error = null;
    newItemName = '';
    creating = false;
  }

  function handleBack() {
    if (uploading) return; // Can't go back while uploading
    if (mode === 'menu') {
      close();
    } else {
      mode = 'menu';
      error = null;
    }
  }

  // --- Upload Logic ---
  async function handleUpload() {
    if (!files || files.length === 0) return;

    uploading = true;
    error = null;
    totalFiles = files.length;

    try {
      for (let i = 0; i < files.length; i++) {
        currentFileIndex = i;
        await videosApi.uploadVideo(
          files[i],
          p => {
            const filesCompleted = i;
            const currentFileProgress = p / 100;
            progress = ((filesCompleted + currentFileProgress) / totalFiles) * 100;
          },
          currentFolderId || undefined
        ); // Pass folder ID if API supports it (it should for this feature)
      }
      onUploadComplete();
      close();
    } catch (err: any) {
      error = err.message || _('errors.uploadError');
      uploading = false;
    }
  }

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files) files = target.files;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
    if (event.dataTransfer?.files) {
      files = event.dataTransfer.files;
    }
  }

  // --- Project Logic ---
  async function handleCreateProject() {
    if (!newItemName.trim()) return;
    creating = true;
    try {
      const project = await projectsApi.createProject({ name: newItemName });
      // Option 1: Redirect to project
      // goto(`${base}/projects/${project.id}`);
      // Option 2: Just notify and close (maybe user wants to stay on videos page)
      // For now, let's close. If projects are shown on this page, they should refresh.
      dispatch('projectCreated', project);
      close();
    } catch (err: any) {
      error = err.message;
    } finally {
      creating = false;
    }
  }

  // --- Folder Logic ---
  async function handleCreateFolder() {
    if (!newItemName.trim()) return;
    creating = true;
    try {
      await createFolder(newItemName, currentFolderId); // This store action usually updates the store automatically
      close();
    } catch (err: any) {
      error = err.message;
    } finally {
      creating = false;
    }
  }

  $: if (open && mode !== 'menu' && !uploading && !creating && !files) {
    // Focus input if applicable
    // setTimeout(() => document.getElementById('new-item-input')?.focus(), 100);
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    transition:fade={{ duration: 200 }}
    on:click|self={close}
  >
    <div
      class="w-full max-w-2xl relative"
      transition:scale={{ duration: 300, start: 0.95, easing: quintOut }}
    >
      <MsqdxGlassCard variant="default" className="overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div class="flex items-center gap-3">
            {#if mode !== 'menu'}
              <button
                class="p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                on:click={handleBack}
                disabled={uploading || creating}
              >
                <MaterialSymbol icon="arrow_back" fontSize={20} />
              </button>
            {/if}
            <h2 class="text-xl font-semibold text-white">
              {#if mode === 'menu'}Create New{/if}
              {#if mode === 'upload'}Upload Videos{/if}
              {#if mode === 'project'}New Project{/if}
              {#if mode === 'folder'}New Folder{/if}
            </h2>
          </div>
          <button
            class="p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            on:click={close}
            disabled={uploading || creating}
          >
            <MaterialSymbol icon="close" fontSize={24} />
          </button>
        </div>

        <!-- Content -->
        <div class="p-6">
          {#if mode === 'menu'}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Upload Option -->
              <button
                class="flex flex-col items-center justify-center p-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/50 transition-all duration-300 group gap-4 text-center h-48"
                on:click={() => (mode = 'upload')}
              >
                <div
                  class="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform"
                >
                  <MaterialSymbol icon="cloud_upload" fontSize={32} />
                </div>
                <div>
                  <span class="block font-medium text-white mb-1">Upload Video</span>
                  <span class="text-xs text-white/40">Drag & drop video files</span>
                </div>
              </button>

              <!-- Project Option -->
              <button
                class="flex flex-col items-center justify-center p-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/50 transition-all duration-300 group gap-4 text-center h-48"
                on:click={() => {
                  mode = 'project';
                  newItemName = '';
                }}
              >
                <div
                  class="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform"
                >
                  <MaterialSymbol icon="movie_edit" fontSize={32} />
                </div>
                <div>
                  <span class="block font-medium text-white mb-1">New Project</span>
                  <span class="text-xs text-white/40">Create a video project</span>
                </div>
              </button>

              <!-- Folder Option -->
              <button
                class="flex flex-col items-center justify-center p-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/50 transition-all duration-300 group gap-4 text-center h-48"
                on:click={() => {
                  mode = 'folder';
                  newItemName = '';
                }}
              >
                <div
                  class="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform"
                >
                  <MaterialSymbol icon="create_new_folder" fontSize={32} />
                </div>
                <div>
                  <span class="block font-medium text-white mb-1">New Folder</span>
                  <span class="text-xs text-white/40">Organize your files</span>
                </div>
              </button>
            </div>
          {:else if mode === 'upload'}
            {#if uploading}
              <div class="py-8 space-y-6">
                <div class="flex items-center justify-between text-sm text-white/60">
                  <span>Uploading {currentFileIndex + 1} of {totalFiles}...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <MsqdxProgress {progress} />
                <p class="text-center text-xs text-white/40 animate-pulse">
                  Processing and analyzing usually takes a moment...
                </p>
              </div>
            {:else}
              <div
                class="relative border-2 border-dashed border-white/10 rounded-xl p-12 text-center transition-all bg-white/5 hover:bg-white/10 {dragOver
                  ? 'border-primary scale-[1.02]'
                  : ''}"
                on:dragover|preventDefault={() => (dragOver = true)}
                on:dragleave|preventDefault={() => (dragOver = false)}
                on:drop={handleDrop}
                role="button"
                tabindex="0"
                on:click={() => document.getElementById('dialog-file-input')?.click()}
              >
                <input
                  id="dialog-file-input"
                  type="file"
                  multiple
                  accept="video/*"
                  class="hidden"
                  on:change={handleFileSelect}
                />

                <MaterialSymbol
                  icon="cloud_upload"
                  fontSize={48}
                  class="text-white/40 mb-4 mx-auto"
                />

                {#if files && files.length > 0}
                  <div class="space-y-2">
                    <p class="text-white font-medium">{files.length} file(s) selected</p>
                    <div class="max-h-32 overflow-y-auto space-y-1 text-sm text-white/60">
                      {#each Array.from(files) as file}
                        <p class="truncate">{file.name}</p>
                      {/each}
                    </div>
                  </div>
                  <div class="mt-6 flex justify-center gap-3">
                    <button
                      class="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm"
                      on:click|stopPropagation={() => (files = null)}>Clear</button
                    >
                    <button
                      class="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-500/20"
                      on:click|stopPropagation={handleUpload}
                    >
                      Start Upload
                    </button>
                  </div>
                {:else}
                  <p class="text-lg text-white/80 font-medium mb-1">Drop video files here</p>
                  <p class="text-sm text-white/40">or click to browse</p>
                {/if}
              </div>
            {/if}
          {:else if mode === 'project' || mode === 'folder'}
            <form
              on:submit|preventDefault={mode === 'project'
                ? handleCreateProject
                : handleCreateFolder}
              class="space-y-6 py-4"
            >
              <div class="space-y-2">
                <label for="item-name" class="block text-sm font-medium text-white/60">
                  {mode === 'project' ? 'Project Name' : 'Folder Name'}
                </label>
                <input
                  id="item-name"
                  type="text"
                  bind:value={newItemName}
                  placeholder={mode === 'project' ? 'My Awesome Project' : 'New Folder'}
                  class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  autofocus
                />
              </div>

              <div class="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={!newItemName.trim() || creating}
                  class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                >
                  {#if creating}
                    <div
                      class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    ></div>
                    <span>Creating...</span>
                  {:else}
                    <span>Create {mode === 'project' ? 'Project' : 'Folder'}</span>
                  {/if}
                </button>
              </div>
            </form>
          {/if}

          {#if error}
            <div
              class="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm flex items-center gap-2"
            >
              <MaterialSymbol icon="error" fontSize={16} />
              {error}
            </div>
          {/if}
        </div>
      </MsqdxGlassCard>
    </div>
  </div>
{/if}
