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
  import { createFolder } from '$lib/stores/folders.store';
  import { MSQDX_COLORS, MSQDX_TYPOGRAPHY } from '$lib/design-tokens';

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
    if (uploading) return;
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
        );
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
      await createFolder(newItemName, currentFolderId);
      close();
    } catch (err: any) {
      error = err.message;
    } finally {
      creating = false;
    }
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
                style="color: {MSQDX_COLORS.dark.textPrimary};"
              >
                <MaterialSymbol icon="arrow_back" fontSize={20} />
              </button>
            {/if}
            <h2
              class="text-xl font-semibold"
              style="
                 color: {MSQDX_COLORS.dark.textPrimary};
                 font-family: {MSQDX_TYPOGRAPHY.fontFamily.primary};
              "
            >
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
            style="color: {MSQDX_COLORS.dark.textPrimary};"
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
                class="flex flex-col items-center justify-center p-6 rounded-xl transition-all duration-300 group gap-4 text-center h-48"
                style="
                  background-color: {MSQDX_COLORS.dark.paper};
                  border: 1px solid {MSQDX_COLORS.dark.border};
                "
                on:click={() => (mode = 'upload')}
              >
                <div
                  class="w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
                  style="background-color: {MSQDX_COLORS.tints.blue};"
                >
                  <MaterialSymbol
                    icon="cloud_upload"
                    fontSize={32}
                    style="color: {MSQDX_COLORS.brand.blue};"
                  />
                </div>
                <div>
                  <span
                    class="block font-medium mb-1"
                    style="color: {MSQDX_COLORS.dark.textPrimary}; font-family: {MSQDX_TYPOGRAPHY
                      .fontFamily.primary};">Upload Video</span
                  >
                  <span
                    class="text-xs"
                    style="color: {MSQDX_COLORS.dark.textSecondary}; font-family: {MSQDX_TYPOGRAPHY
                      .fontFamily.mono};">Drag & drop files</span
                  >
                </div>
              </button>

              <!-- Project Option -->
              <button
                class="flex flex-col items-center justify-center p-6 rounded-xl transition-all duration-300 group gap-4 text-center h-48"
                style="
                  background-color: {MSQDX_COLORS.dark.paper};
                  border: 1px solid {MSQDX_COLORS.dark.border};
                "
                on:click={() => {
                  mode = 'project';
                  newItemName = '';
                }}
              >
                <div
                  class="w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
                  style="background-color: {MSQDX_COLORS.tints.purple};"
                >
                  <MaterialSymbol
                    icon="movie_edit"
                    fontSize={32}
                    style="color: {MSQDX_COLORS.brand.purple};"
                  />
                </div>
                <div>
                  <span
                    class="block font-medium mb-1"
                    style="color: {MSQDX_COLORS.dark.textPrimary}; font-family: {MSQDX_TYPOGRAPHY
                      .fontFamily.primary};">New Project</span
                  >
                  <span
                    class="text-xs"
                    style="color: {MSQDX_COLORS.dark.textSecondary}; font-family: {MSQDX_TYPOGRAPHY
                      .fontFamily.mono};">Create a project</span
                  >
                </div>
              </button>

              <!-- Folder Option -->
              <button
                class="flex flex-col items-center justify-center p-6 rounded-xl transition-all duration-300 group gap-4 text-center h-48"
                style="
                  background-color: {MSQDX_COLORS.dark.paper};
                  border: 1px solid {MSQDX_COLORS.dark.border};
                "
                on:click={() => {
                  mode = 'folder';
                  newItemName = '';
                }}
              >
                <div
                  class="w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
                  style="background-color: {MSQDX_COLORS.tints.orange};"
                >
                  <MaterialSymbol
                    icon="create_new_folder"
                    fontSize={32}
                    style="color: {MSQDX_COLORS.brand.orange};"
                  />
                </div>
                <div>
                  <span
                    class="block font-medium mb-1"
                    style="color: {MSQDX_COLORS.dark.textPrimary}; font-family: {MSQDX_TYPOGRAPHY
                      .fontFamily.primary};">New Folder</span
                  >
                  <span
                    class="text-xs"
                    style="color: {MSQDX_COLORS.dark.textSecondary}; font-family: {MSQDX_TYPOGRAPHY
                      .fontFamily.mono};">Organize files</span
                  >
                </div>
              </button>
            </div>
          {:else if mode === 'upload'}
            {#if uploading}
              <div class="py-8 space-y-6">
                <div
                  class="flex items-center justify-between text-sm"
                  style="color: {MSQDX_COLORS.dark.textSecondary};"
                >
                  <span style="font-family: {MSQDX_TYPOGRAPHY.fontFamily.mono};"
                    >Uploading {currentFileIndex + 1} of {totalFiles}...</span
                  >
                  <span style="font-family: {MSQDX_TYPOGRAPHY.fontFamily.mono};"
                    >{Math.round(progress)}%</span
                  >
                </div>
                <!-- MsqdxProgress handles its own colors usually, ensuring it's brand aligned -->
                <MsqdxProgress {progress} />
                <p
                  class="text-center text-xs animate-pulse"
                  style="color: {MSQDX_COLORS.dark.textSecondary}; font-family: {MSQDX_TYPOGRAPHY
                    .fontFamily.mono};"
                >
                  Processing and analyzing...
                </p>
              </div>
            {:else}
              <div
                class="relative border-2 border-dashed rounded-xl p-12 text-center transition-all {dragOver
                  ? 'scale-[1.02]'
                  : ''}"
                style="
                   border-color: {dragOver ? MSQDX_COLORS.brand.blue : MSQDX_COLORS.dark.border};
                   background-color: {MSQDX_COLORS.dark.paper};
                "
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
                  style="color: {MSQDX_COLORS.dark.textSecondary}; margin-bottom: 2rem;"
                />

                {#if files && files.length > 0}
                  <div class="space-y-2">
                    <p class="font-medium" style="color: {MSQDX_COLORS.dark.textPrimary};">
                      {files.length} file(s) selected
                    </p>
                    <div
                      class="max-h-32 overflow-y-auto space-y-1 text-sm"
                      style="color: {MSQDX_COLORS.dark
                        .textSecondary}; font-family: {MSQDX_TYPOGRAPHY.fontFamily.mono};"
                    >
                      {#each Array.from(files) as file}
                        <p class="truncate">{file.name}</p>
                      {/each}
                    </div>
                  </div>
                  <div class="mt-6 flex justify-center gap-3">
                    <button
                      class="px-4 py-2 rounded-lg text-sm"
                      style="background-color: {MSQDX_COLORS.dark.border}; color: {MSQDX_COLORS.dark
                        .textPrimary};"
                      on:click|stopPropagation={() => (files = null)}>Clear</button
                    >
                    <button
                      class="px-6 py-2 rounded-lg text-sm font-medium shadow-lg"
                      style="background-color: {MSQDX_COLORS.brand.blue}; color: {MSQDX_COLORS.brand
                        .white};"
                      on:click|stopPropagation={handleUpload}
                    >
                      Start Upload
                    </button>
                  </div>
                {:else}
                  <p
                    class="text-lg font-medium mb-1"
                    style="color: {MSQDX_COLORS.dark.textPrimary};"
                  >
                    Drop video files here
                  </p>
                  <p class="text-sm" style="color: {MSQDX_COLORS.dark.textSecondary};">
                    or click to browse
                  </p>
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
                <label
                  for="item-name"
                  class="block text-sm font-medium"
                  style="color: {MSQDX_COLORS.dark.textSecondary};"
                >
                  {mode === 'project' ? 'Project Name' : 'Folder Name'}
                </label>
                <input
                  id="item-name"
                  type="text"
                  bind:value={newItemName}
                  placeholder={mode === 'project' ? 'My Awesome Project' : 'New Folder'}
                  class="w-full px-4 py-3 rounded-xl transition-all focus:outline-none"
                  style="
                    background-color: {MSQDX_COLORS.dark.paper};
                    border: 1px solid {MSQDX_COLORS.dark.border};
                    color: {MSQDX_COLORS.dark.textPrimary};
                    font-family: {MSQDX_TYPOGRAPHY.fontFamily.primary};
                  "
                  autofocus
                />
              </div>

              <div class="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={!newItemName.trim() || creating}
                  class="px-6 py-3 rounded-xl font-medium shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style="
                    background-color: {mode === 'project'
                    ? MSQDX_COLORS.brand.purple
                    : MSQDX_COLORS.brand.blue};
                    color: {MSQDX_COLORS.brand.white};
                  "
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
              class="mt-4 p-3 rounded-lg text-sm flex items-center gap-2"
              style="
                 background-color: {MSQDX_COLORS.tints.pink};
                 border: 1px solid {MSQDX_COLORS.status.error};
                 color: {MSQDX_COLORS.status.error};
              "
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
