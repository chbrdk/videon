<script lang="ts">
  import { searchApi, type SearchResult } from '$lib/api/search';
  import { projectsApi } from '$lib/api/projects';
  import { currentLocale, _ } from '$lib/i18n';
  import { base } from '$app/paths';
  import { getVideoUrl, getCoverImageUrl } from '$lib/config/environment';

  import MsqdxGlassCard from '$lib/components/ui/MsqdxGlassCard.svelte';
  import { MaterialSymbol } from '$lib/components/ui';

  let searchQuery = '';
  let searching = false;
  let hasSearched = false;
  let results: SearchResult[] = [];
  // ... (keep existing imports and logic, replace SVGs with Symbols)

  // Project modal state
  let showProjectModal = false;
  let projects: any[] = [];
  let selectedScene: SearchResult | null = null;

  async function handleSearch() {
    if (!searchQuery.trim()) return;

    searching = true;
    hasSearched = true;

    try {
      results = await searchApi.search(searchQuery);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      searching = false;
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function handleVideoPlay(event: Event, result: SearchResult) {
    const video = event.target as HTMLVideoElement;

    // Stop other videos
    document.querySelectorAll('video').forEach(v => {
      if (v !== video) {
        v.pause();
        v.currentTime = 0;
      }
    });

    // Play video
    video.currentTime = result.startTime;
    video.play();
    playingVideoId = result.videoId;

    // Stop after 5s
    const stopTime = result.startTime + 5;
    const checkInterval = setInterval(() => {
      if (video.currentTime >= stopTime || video.paused) {
        video.pause();
        playingVideoId = null;
        clearInterval(checkInterval);
      }
    }, 100);
  }

  function handleVideoPause(event: Event) {
    playingVideoId = null;
  }

  async function loadProjects() {
    projects = await projectsApi.getProjects();
  }

  function openAddToProjectModal(result: SearchResult) {
    selectedScene = result;
    loadProjects();
    showProjectModal = true;
  }

  async function addToProject(projectId: string) {
    if (!selectedScene) return;

    await projectsApi.addSceneToProject(projectId, {
      videoId: selectedScene.videoId,
      startTime: selectedScene.startTime,
      endTime: selectedScene.endTime,
    });
    showProjectModal = false;
  }

  async function createNewProject() {
    const name = prompt(_('search.projectName'));
    if (name) {
      const project = await projectsApi.createProject({ name });
      await addToProject(project.id);
    }
  }
</script>

<svelte:head>
  <title>{_('search.title')} - Videon</title>
</svelte:head>

<div class="space-y-8 pb-12">
  <!-- Search Input Area -->
  <div class="max-w-2xl mx-auto">
    <div class="relative group">
      <div
        class="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-50"
      ></div>

      <div class="relative flex gap-2">
        <div class="relative flex-1">
          <input
            type="text"
            bind:value={searchQuery}
            on:keydown={e => e.key === 'Enter' && handleSearch()}
            placeholder={_('search.placeholder')}
            class="
              w-full pl-12 pr-4 py-4
              bg-gray-900/60 backdrop-blur-xl
              border border-white/10 focus:border-indigo-500/50
              rounded-xl
              text-white placeholder-white/30
              outline-none
              shadow-lg shadow-black/20
              transition-all duration-300
            "
          />
          <div class="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/30">
            <MaterialSymbol icon="search" fontSize={24} />
          </div>
        </div>

        <button
          on:click={handleSearch}
          disabled={searching || !searchQuery.trim()}
          class="
            px-6 rounded-xl
            bg-white/10 hover:bg-white/20 disabled:bg-white/5
            border border-white/10 disabled:border-transparent
            text-white disabled:text-white/20
            transition-all duration-200
            flex items-center justify-center
          "
        >
          {#if searching}
            <div
              class="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"
            ></div>
          {:else}
            <MaterialSymbol icon="arrow_forward" fontSize={24} />
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if hasSearched && !searching}
    <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {#if results.length === 0}
        <MsqdxGlassCard variant="default">
          <div class="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div class="p-4 rounded-full bg-white/5 border border-white/10">
              <MaterialSymbol icon="search_off" fontSize={32} class="text-white/40" />
            </div>
            <p class="text-white/50">{_('search.noResults')}</p>
          </div>
        </MsqdxGlassCard>
      {:else}
        <div class="flex items-center justify-between mb-6 px-2">
          <p class="text-sm text-white/50">
            {results.length}
            {_('search.resultsFound')}
          </p>
        </div>

        <!-- Video Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each results as result}
            <MsqdxGlassCard
              variant="default"
              className="!p-0 overflow-hidden group hover:border-indigo-500/30 transition-colors duration-300"
            >
              <!-- Video Player -->
              <div class="relative aspect-video bg-black/40">
                <video
                  class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                  preload="metadata"
                  poster={getCoverImageUrl(result.videoId, result.startTime)}
                  on:play={e => handleVideoPlay(e, result)}
                  on:pause={handleVideoPause}
                  muted
                >
                  <source src={getVideoUrl(result.videoId)} type="video/mp4" />
                </video>

                <!-- Play Overlay -->
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    class="
                    w-12 h-12 rounded-full
                    bg-white/10 backdrop-blur-sm border border-white/20
                    flex items-center justify-center
                    opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110
                  "
                  >
                    <MaterialSymbol
                      icon={playingVideoId === result.videoId ? 'pause' : 'play_arrow'}
                      fontSize={24}
                      class="text-white"
                    />
                  </div>
                </div>

                <!-- Time Badge -->
                <div
                  class="absolute top-3 right-3 px-2 py-1 rounded bg-black/60 backdrop-blur-md border border-white/10 text-xs font-mono text-white/80"
                >
                  {formatTime(result.startTime)}
                </div>

                <!-- Match Score -->
                <div
                  class="absolute top-3 left-3 px-2 py-1 rounded bg-indigo-500/80 backdrop-blur-md border border-indigo-400/20 text-xs font-bold text-white shadow-lg"
                >
                  {Math.round(result.score * 100)}% Match
                </div>
              </div>

              <!-- Content -->
              <div class="p-5 space-y-4">
                <div>
                  <h3 class="font-medium text-white mb-1 truncate" title={result.videoTitle}>
                    {result.videoTitle}
                  </h3>
                  <div class="text-xs text-indigo-300 font-medium">
                    {_('search.playsFrom')}
                    {formatTime(result.startTime)}
                  </div>
                </div>

                <p class="text-sm text-white/60 line-clamp-3 leading-relaxed">
                  {result.content}
                </p>

                <!-- Action Buttons -->
                <div class="flex gap-2 pt-2">
                  <button
                    class="
                      flex-1 py-2 px-3 rounded-lg
                      bg-white/5 hover:bg-white/10
                      border border-white/5 hover:border-white/10
                      text-xs text-white/70 hover:text-white
                      transition-all duration-200
                      flex items-center justify-center gap-2
                    "
                    on:click={() => openAddToProjectModal(result)}
                  >
                    <MaterialSymbol icon="playlist_add" fontSize={16} />
                    {_('search.addToProject')}
                  </button>
                  <button
                    class="
                      py-2 px-3 rounded-lg
                      bg-white/5 hover:bg-white/10
                      border border-white/5 hover:border-white/10
                      text-white/70 hover:text-white
                      transition-all duration-200
                    "
                    on:click={() => {
                      window.location.href = `${base}/videos/${result.videoId}`;
                    }}
                    title={_('search.viewVideo')}
                  >
                    <MaterialSymbol icon="open_in_new" fontSize={16} />
                  </button>
                </div>
              </div>
            </MsqdxGlassCard>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Project Selection Modal -->
{#if showProjectModal}
  <div
    class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200"
  >
    <div class="w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
      <MsqdxGlassCard variant="default" className="!p-0 overflow-hidden">
        <div class="p-6 border-b border-white/10">
          <h3 class="text-lg font-semibold text-white">
            {_('search.addToProject')}
          </h3>
        </div>

        <div class="p-2 max-h-60 overflow-y-auto space-y-1">
          {#each projects as project}
            <button
              class="w-full text-left p-3 rounded-lg hover:bg-white/5 transition-colors group"
              on:click={() => addToProject(project.id)}
            >
              <div class="flex items-center justify-between">
                <span class="text-white/80 group-hover:text-white">{project.name}</span>
                <span class="text-xs text-white/30 group-hover:text-white/50"
                  >{project.scenes.length} {_('projects.scenes')}</span
                >
              </div>
            </button>
          {/each}
        </div>

        <div class="p-4 bg-black/20 border-t border-white/5 flex gap-3">
          <button
            class="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            on:click={createNewProject}
          >
            {_('search.createNewProject')}
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm transition-colors"
            on:click={() => (showProjectModal = false)}
          >
            {_('actions.cancel')}
          </button>
        </div>
      </MsqdxGlassCard>
    </div>
  </div>
{/if}
