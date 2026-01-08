<script lang="ts">
import { onMount, tick, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { 
    folders, 
    currentFolder, 
    videosInFolder,
    viewMode, 
    selectedItems, 
    searchQuery, 
    searchResults,
    isLoading,
    error,
    loadFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    moveVideos,
    toggleSelection,
    selectAll,
    deselectAll,
    navigateToFolder,
    navigateToParent,
    getFolderContextMenuItems,
    getVideoContextMenuItems,
    searchAll,
    initializeFolders,
    moveVideoToFolder
  } from '$lib/stores/folders.store';
  import { videosApi } from '$lib/api/videos';
  import type { VideoResponse } from '$lib/types';
  import { _, currentLocale } from '$lib/i18n';
  import UdgGlassViewToggle from '$lib/components/udg-glass-view-toggle.svelte';
  import UdgGlassBreadcrumbs from '$lib/components/udg-glass-breadcrumbs.svelte';
  import UdgGlassSearchBar from '$lib/components/udg-glass-search-bar.svelte';
  import UdgGlassFolderCard from '$lib/components/udg-glass-folder-card.svelte';
  import UdgGlassVideoCard from '$lib/components/udg-glass-video-card.svelte';
  import UdgGlassContextMenu from '$lib/components/udg-glass-context-menu.svelte';
  import UdgGlassFolderDialog from '$lib/components/udg-glass-folder-dialog.svelte';
  import UdgGlassDeleteModal from '$lib/components/udg-glass-delete-modal.svelte';
  import DeleteIcon from '@material-icons/svg/svg/delete/baseline.svg?raw';

  // URL params
  $: folderId = $page.url.searchParams.get('folder') || null;
  $: searchQueryParam = $page.url.searchParams.get('q') || '';

  // State
  let contextMenu = { show: false, x: 0, y: 0, items: [] };
  let folderDialog = { open: false, mode: 'create' as 'create' | 'rename', folder: null };
  let deleteModalOpen = false;
  let videoToDelete: VideoResponse | null = null;
let revealMode = false;
let revealedCount = 0;
let revealedVideoIds = new Set<string>();
let totalVideos = 0;
let revealTimer: ReturnType<typeof setTimeout> | null = null;
const REVEAL_DELAY_MS = 400;
const MIN_SCROLL_DURATION = 4000;
let scrollAnimationId: number | null = null;

  // Initialize
  onMount(() => {
    if (searchQueryParam) {
      searchQuery.set(searchQueryParam);
      searchAll(searchQueryParam);
    } else {
      loadFolders(folderId);
    }
  });

  // React to URL changes
  $: if ($page.url.searchParams.get('folder') !== folderId) {
    const newFolderId = $page.url.searchParams.get('folder') || null;
    if (newFolderId !== folderId) {
      loadFolders(newFolderId);
    }
  }

  // Handle search query changes
  $: if ($searchQuery && $searchQuery !== searchQueryParam) {
    searchAll($searchQuery);
  }

  // Get current folder contents
  $: currentContents = $searchQuery ? $searchResults : { folders: $folders, videos: $videosInFolder };
  $: allItems = [
    ...currentContents.folders.map(folder => ({ ...folder, id: folder.id, type: 'folder' as const })),
    ...currentContents.videos.map(video => ({ ...video, id: video.id, type: 'video' as const }))
  ];
  $: totalVideos = currentContents.videos.length;

  $: {
    if (!revealMode) {
      if (revealedCount !== totalVideos) {
        revealedCount = totalVideos;
      }
    } else if (revealedCount > totalVideos) {
      revealedCount = totalVideos;
    }
  }

  $: revealedVideoIds = new Set(currentContents.videos.slice(0, revealedCount).map((video) => video.id));

  $: if (revealMode && totalVideos > 0 && revealedCount < totalVideos && !revealTimer) {
    startAutoReveal();
  }

  $: if ((!revealMode || totalVideos === 0) && revealTimer) {
    stopAutoReveal();
  }

  $: if (revealMode && totalVideos > 0 && revealedCount < totalVideos && !revealTimer) {
    startAutoReveal();
  }

  $: if ((!revealMode || totalVideos === 0) && revealTimer) {
    stopAutoReveal();
  }

  async function startAutoReveal() {
    await tick();
    stopAutoReveal();
    revealTimer = setTimeout(async function revealStep() {
      await revealNextVideo();
      if (revealMode && revealedCount < totalVideos) {
        revealTimer = setTimeout(revealStep, REVEAL_DELAY_MS);
      } else {
        revealTimer = null;
      }
    }, REVEAL_DELAY_MS);
  }

  function stopAutoReveal() {
    if (revealTimer) {
      clearTimeout(revealTimer);
      revealTimer = null;
    }
  }

  function startPageScroll(duration: number) {
    if (typeof window === 'undefined') return;
    stopPageScroll();
    const start = performance.now();
    const startY = window.scrollY;
    const target = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
    const distance = target - startY;

    const step = (now: number) => {
      if (!revealMode) {
        stopPageScroll();
        return;
      }
      const progress = Math.min((now - start) / duration, 1);
      const eased = progress * progress * (3 - 2 * progress);
      window.scrollTo(0, startY + distance * eased);
      if (progress < 1) {
        scrollAnimationId = requestAnimationFrame(step);
      } else {
        scrollAnimationId = null;
      }
    };

    scrollAnimationId = requestAnimationFrame(step);
  }

  function stopPageScroll() {
    if (scrollAnimationId !== null) {
      cancelAnimationFrame(scrollAnimationId);
      scrollAnimationId = null;
    }
  }

  onDestroy(() => {
    stopAutoReveal();
    stopPageScroll();
  });

  // Video handlers
  function handleVideoClick(videoId: string) {
    goto(`/videos/${videoId}`);
  }

  function toggleRevealMode() {
    revealMode = !revealMode;
    if (revealMode) {
      revealedCount = 0;
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'auto' });
        const duration = Math.max(totalVideos * REVEAL_DELAY_MS + 1000, MIN_SCROLL_DURATION);
        startPageScroll(duration);
      }
      startAutoReveal();
    } else {
      stopAutoReveal();
      stopPageScroll();
      revealedCount = totalVideos;
    }
  }

  async function revealNextVideo() {
    if (!revealMode) return;
    const nextCount = Math.min(revealedCount + 1, totalVideos);
    if (nextCount === revealedCount) return;
    revealedCount = nextCount;
    if (revealedCount >= totalVideos) {
      stopAutoReveal();
      stopPageScroll();
    }
  }

  function handleDeleteClick(event: Event, video: VideoResponse) {
    event.stopPropagation();
    videoToDelete = video;
    deleteModalOpen = true;
  }

  async function handleDeleteConfirm() {
    if (!videoToDelete) return;
    
    try {
      await videosApi.deleteVideo(videoToDelete.id);
      await loadFolders(folderId);
      deleteModalOpen = false;
      videoToDelete = null;
    } catch (error) {
      alert(`${_('delete.deleteError')}: ${error.message}`);
      deleteModalOpen = false;
      videoToDelete = null;
    }
  }

  // Drag & Drop handlers
  let draggedVideo: VideoResponse | null = null;
  let dragOverFolder: any = null;

  function handleVideoDragStart(event: DragEvent, video: VideoResponse) {
    draggedVideo = video;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', video.id);
    }
  }

  function handleFolderDragOver(event: DragEvent, folder: { id: string; name: string }) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    dragOverFolder = folder;
  }

  function handleFolderDragLeave(event: DragEvent) {
    dragOverFolder = null;
  }

  async function handleFolderDrop(event: DragEvent, folder: { id: string; name: string }) {
    event.preventDefault();
    
    if (!draggedVideo) return;
    
    try {
      await moveVideoToFolder(draggedVideo.id, folder.id);
      console.log(`Video "${draggedVideo.originalName}" moved to folder "${folder.name}"`);
    } catch (error) {
      alert(`${_('move.moveError')}: ${error.message}`);
    } finally {
      draggedVideo = null;
      dragOverFolder = null;
    }
  }

  async function handleRootDrop(event: DragEvent) {
    event.preventDefault();
    
    if (!draggedVideo) return;
    
    try {
      await moveVideoToFolder(draggedVideo.id, null);
      console.log(`Video "${draggedVideo.originalName}" moved to root folder`);
    } catch (error) {
      alert(`${_('move.moveError')}: ${error.message}`);
    } finally {
      draggedVideo = null;
      dragOverFolder = null;
    }
  }

  // Folder handlers
  function handleCreateFolder() {
    folderDialog = { open: true, mode: 'create', folder: null };
  }

  function handleRenameFolder(folder: { id: string; name: string }) {
    folderDialog = { open: true, mode: 'rename', folder };
  }

  async function handleFolderConfirm(event: CustomEvent) {
    const { name } = event.detail;
    
    try {
      if (folderDialog.mode === 'create') {
        await createFolder(name, folderId);
      } else if (folderDialog.folder) {
        await updateFolder(folderDialog.folder.id, name);
      }
      folderDialog = { open: false, mode: 'create', folder: null };
    } catch (error) {
      alert(`${_('delete.deleteError')}: ${error.message}`);
    }
  }

  async function handleDeleteFolder(folder: { id: string; name: string }) {
    if (confirm(_('errors.deleteConfirm', { name: folder.name }))) {
      try {
        await deleteFolder(folder.id);
      } catch (error) {
        alert(`${_('delete.deleteError')}: ${error.message}`);
      }
    }
  }

  // Context menu handlers
  function handleContextMenu(event, item) {
    event.preventDefault();
    const rect = event.target.getBoundingClientRect();
    contextMenu.x = rect.right;
    contextMenu.y = rect.bottom;
    
    if (item.type === 'folder') {
      contextMenu.items = [
        {
          label: _('actions.rename'),
          icon: 'edit',
          action: () => handleRenameFolder(item)
        },
        {
          label: _('actions.delete'),
          icon: 'delete',
          action: () => handleDeleteFolder(item)
        }
      ];
    } else {
      contextMenu.items = [
        {
          label: _('contextMenu.moveToFolder'),
          icon: 'folder',
          action: () => {
            // TODO: Implement folder selection dialog
            console.log('Move video to folder:', item.originalName);
          }
        },
        {
          label: _('actions.delete'),
          icon: 'delete',
          action: () => handleDeleteClick(event, item)
        }
      ];
    }
    contextMenu.show = true;
  }

  // Selection handlers
  function handleItemClick(event, item) {
    if (event.ctrlKey || event.metaKey) {
      toggleSelection(item.id);
    } else {
      if (item.type === 'folder') {
        navigateToFolder(item.id);
      } else {
        handleVideoClick(item.id);
      }
    }
  }

  // Drag & Drop handlers
  function handleDragStart(event, item) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', JSON.stringify({ id: item.id, type: item.type }));
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  function handleDragOver(event) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  function handleDrop(event, targetFolder) {
    event.preventDefault();
    
    if (!event.dataTransfer) return;
    
    const data = event.dataTransfer.getData('text/plain');
    if (!data) return;
    
    try {
      const draggedItem = JSON.parse(data);
      if (draggedItem.type === 'video') {
        moveVideos([draggedItem.id], targetFolder?.id || null);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  }

  // Utility functions
  function getStatusChipClass(status) {
    const normalized = status?.toUpperCase?.() ?? 'UNKNOWN';
    switch (normalized) {
      case 'UPLOADED': return 'chip chip-primary';
      case 'ANALYZING': return 'chip chip-warning';
      case 'ANALYZED':
      case 'COMPLETE': return 'chip chip-success';
      case 'ERROR': return 'chip chip-error';
      default: return 'chip chip-default';
    }
  }

  function getStatusText(status) {
    const normalized = status?.toUpperCase?.() ?? 'UNKNOWN';
    switch (normalized) {
      case 'UPLOADED': return _('status.uploaded');
      case 'ANALYZING': return _('status.analyzing');
      case 'ANALYZED': return _('status.analyzed');
      case 'COMPLETE': return _('status.complete');
      case 'ERROR': return _('status.error');
      default: return _('status.unknown');
    }
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return `0 ${_('units.bytes')}`;
    const k = 1024;
    const sizes = [_('units.bytes'), _('units.kb'), _('units.mb'), _('units.gb')];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatDate(dateString) {
    const currentLocaleValue = $currentLocale === 'en' ? 'en-US' : 'de-DE';
    const dateFormat = $currentLocale === 'en' ? 'en-US' : 'de-DE';
    return new Date(dateString).toLocaleDateString(dateFormat, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<svelte:head>
  <title>{_('pages.videoGallery.title')} - PrismVid</title>
  <meta name="description" content={_('pages.videoGallery.description')} />
</svelte:head>

<div class="max-w-7xl mx-auto space-y-8">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{_('pages.videoGallery.title')}</h1>
  </div>

  <!-- Breadcrumbs -->
  <UdgGlassBreadcrumbs />

  <!-- Toolbar -->
  <div class="flex items-center justify-between gap-4">
    <div class="flex items-center gap-4">
      <UdgGlassSearchBar />
      <UdgGlassViewToggle />
    </div>
    <div class="flex items-center gap-2 reveal-controls">
      <button 
        class="reveal-toggle-button"
        on:click={toggleRevealMode}
        title={revealMode ? 'Reveal-Modus beenden' : 'Reveal-Modus starten'}
      >
        {revealMode ? 'Reveal-Modus beenden' : 'Reveal-Modus'}
      </button>
      {#if revealMode}
        <span class="reveal-progress">{Math.min(revealedCount, totalVideos)}/{totalVideos}</span>
      {/if}
    </div>
    <!-- Action Buttons -->
    <div class="glass-button-group">
      <button 
        class="glass-button"
        on:click={handleCreateFolder}
        title={_('folder.create')}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19,12H16V9H14V12H11V14H14V17H16V14H19M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8A2,2 0 0,0 20,6H12M10,4V6H20V4H10Z"/>
        </svg>
      </button>
      <a 
        href="/upload" 
        class="glass-button"
        title={_('pages.videoGallery.newVideo')}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9,16V10H5L12,3L19,10H15V16H9M5,20V18H19V20H5Z"/>
        </svg>
      </a>
    </div>
  </div>

  <!-- Selection Toolbar -->
  {#if $selectedItems.size > 0}
    <div class="glass-card p-4">
      <div class="flex items-center justify-between">
        <span class="text-gray-700 dark:text-white/80">
          {$selectedItems.size} {_('selection.selected')}
        </span>
        <div class="flex items-center gap-2">
          <button 
            class="glass-button secondary "
            on:click={() => moveVideos(Array.from($selectedItems), null)}
          >
            {_('actions.move')}
          </button>
          <button 
            class="glass-button secondary "
            on:click={deselectAll}
          >
            {_('actions.deselect')}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Error State -->
  {#if $error}
    <div class="glass-card p-6">
      <div class="text-red-200">
        <h3 class="font-semibold mb-2">{_('errors.loadingError')}</h3>
        <p>{$error}</p>
        <button 
          class="glass-button mt-4 " 
          on:click={() => loadFolders(folderId)}
        >
          {_('actions.retry')}
        </button>
      </div>
    </div>
  {:else if $isLoading}
    <div class="glass-card text-center py-16">
      <div class="text-6xl text-gray-400 dark:text-white/40 mb-6">⏳</div>
      <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4">{_('loading.loading')}</h3>
    </div>
  {:else if currentContents.folders.length === 0 && currentContents.videos.length === 0}
    <div class="glass-card text-center py-16">
      <div class="text-6xl text-gray-400 dark:text-white/40 mb-6">📁</div>
      <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4">
        {#if $searchQuery}
          {$searchQuery ? _('pages.videoGallery.emptyState.noResults') : _('pages.videoGallery.emptyState.emptyFolder')}
        {:else}
          {_('pages.videoGallery.emptyState.emptyFolder')}
        {/if}
      </h3>
      <p class="text-gray-600 dark:text-white/70 mb-8">
        {#if $searchQuery}
          {_('pages.videoGallery.emptyState.noResultsMessage')}
        {:else}
          {_('pages.videoGallery.emptyState.emptyFolderMessage')}
        {/if}
      </p>
      {#if !$searchQuery}
        <div class="flex items-center justify-center gap-4">
          <button on:click={handleCreateFolder} class="glass-button ">
            {_('pages.videoGallery.emptyState.createFolder')}
          </button>
          <a href="/upload" class="glass-button ">
            {_('pages.videoGallery.emptyState.uploadVideo')}
          </a>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Content -->
    {#if $viewMode === 'grid'}
      <div 
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 {draggedVideo && !dragOverFolder ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}"
        on:dragover={(e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; }}
        on:drop={handleRootDrop}
      >
        <!-- Parent folder (if not root) -->
        {#if $currentFolder}
          <div 
            class="folder-card glass-card cursor-pointer"
            on:click={() => navigateToParent()}
          >
            <div class="folder-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20,6H12L10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6M20,18H4V8H20V18Z"/>
              </svg>
            </div>
            <div class="folder-content">
              <h3 class="folder-name">..</h3>
              <div class="folder-meta">{_('folder.parentFolder')}</div>
            </div>
          </div>
        {/if}
        
        <!-- Folders -->
        {#each currentContents.folders as folder (folder.id)}
          <div
            class="glass-card cursor-pointer transition-transform hover:scale-105 {dragOverFolder?.id === folder.id ? 'ring-2 ring-blue-400' : ''}"
            on:dragover={(e) => handleFolderDragOver(e, folder)}
            on:dragleave={handleFolderDragLeave}
            on:drop={(e) => handleFolderDrop(e, folder)}
          >
            <UdgGlassFolderCard 
              {folder} 
              selected={$selectedItems.has(folder.id)}
              onSelect={toggleSelection}
              onContextMenu={(e) => handleContextMenu(e, { ...folder, type: 'folder' })}
            />
          </div>
        {/each}
        
        <!-- Videos -->
        {#each currentContents.videos as video (video.id)}
          <div
            class="video-card-wrapper"
            style:opacity={revealedVideoIds.has(video.id) ? 1 : 0}
            style:pointer-events={revealedVideoIds.has(video.id) ? 'auto' : 'none'}
          >
            <UdgGlassVideoCard 
              video={video}
              on:select={(e) => handleVideoClick(e.detail.id)}
            />
          </div>
        {/each}
      </div>
    {:else}
      <!-- List View -->
      <div 
        class="glass-card {draggedVideo && !dragOverFolder ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}"
        on:dragover={(e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; }}
        on:drop={handleRootDrop}
      >
        <div class="space-y-2">
          {#each allItems as item (item.id)}
            <div 
              class="list-item flex items-center gap-4 p-4 hover:bg-white/5 rounded-lg cursor-pointer {dragOverFolder?.id === item.id ? 'bg-blue-500/20' : ''}"
              draggable={item.type === 'video'}
              on:click={(e) => handleItemClick(e, item)}
              on:contextmenu={(e) => handleContextMenu(e, item)}
              on:dragstart={item.type === 'video' ? (e) => handleVideoDragStart(e, item as VideoResponse) : undefined}
              on:dragover={item.type === 'folder' ? (e) => handleFolderDragOver(e, item) : undefined}
              on:dragleave={item.type === 'folder' ? handleFolderDragLeave : undefined}
              on:drop={item.type === 'folder' ? (e) => handleFolderDrop(e, item) : undefined}
              style:opacity={item.type === 'video' ? (revealedVideoIds.has(item.id) ? 1 : 0) : 1}
              style:pointer-events={item.type === 'video' && !revealedVideoIds.has(item.id) ? 'none' : 'auto'}
            >
              <input 
                type="checkbox" 
                checked={$selectedItems.has(item.id)}
                on:change={() => toggleSelection(item.id)}
                class="w-4 h-4"
              />
              
              {#if item.type === 'folder'}
                <div class="text-2xl">📁</div>
                <div class="flex-1">
                  <h3 class="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                  <p class=" text-gray-600 dark:text-white/60">{_('folder.type')}</p>
                </div>
              {:else}
                <div class="text-2xl">🎬</div>
                <div class="flex-1">
                  <h3 class="font-semibold text-gray-900 dark:text-white">{item.originalName}</h3>
                  <div class="flex items-center gap-2">
                    <span class=" text-gray-600 dark:text-white/60">{formatFileSize(item.fileSize)}</span>
                    <span class="{getStatusChipClass(item.status)}">
                      {getStatusText(item.status)}
                    </span>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- Context Menu -->
{#if contextMenu.show}
  <UdgGlassContextMenu 
    x={contextMenu.x}
    y={contextMenu.y}
    items={contextMenu.items}
    onClose={() => contextMenu.show = false}
  />
{/if}

<!-- Folder Dialog -->
<UdgGlassFolderDialog 
  bind:open={folderDialog.open}
  mode={folderDialog.mode}
  initialName={folderDialog.folder?.name || ''}
  on:confirm={handleFolderConfirm}
  on:cancel={() => folderDialog.open = false}
/>

<!-- Delete Modal -->
<UdgGlassDeleteModal 
  bind:open={deleteModalOpen}
  video={videoToDelete}
  on:close={() => { deleteModalOpen = false; videoToDelete = null; }}
  on:confirm={handleDeleteConfirm}
/>

<style>
  .glass-button-group {
    display: flex;
    gap: 8px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 32px;
    padding: 4px;
  }

  .glass-button-group .glass-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: transparent;
    border: none;
    border-radius: 28px;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .glass-button-group .glass-button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }

  .glass-button-group .glass-button:focus {
    outline: 2px solid rgba(255, 255, 255, 0.3);
    outline-offset: 2px;
  }

  .reveal-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .reveal-toggle-button {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.25);
    color: rgba(255, 255, 255, 0.6);
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    transition: all 0.2s ease;
  }

  .reveal-toggle-button:hover {
    color: rgba(255, 255, 255, 0.9);
    border-color: rgba(255, 255, 255, 0.45);
    transform: translateY(-1px);
  }

  .reveal-progress {
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.6);
  }

  .video-card-wrapper {
    position: relative;
    transition: opacity 0.9s ease;
  }

  .list-item {
    transition: opacity 0.9s ease;
  }

  :global(html.light) .reveal-toggle-button {
    border-color: rgba(17, 24, 39, 0.2);
    color: rgba(17, 24, 39, 0.6);
  }

  :global(html.light) .reveal-toggle-button:hover {
    color: rgba(17, 24, 39, 0.9);
    border-color: rgba(17, 24, 39, 0.4);
  }

  :global(html.light) .reveal-progress {
    color: rgba(17, 24, 39, 0.6);
  }

  :global(html.light) .video-card-wrapper,
  :global(html.light) .list-item {
    transition: opacity 0.9s ease;
  }
</style>