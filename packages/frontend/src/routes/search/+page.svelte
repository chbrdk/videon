<script lang="ts">
  import { searchApi, type SearchResult } from '$lib/api/search';
  import { projectsApi } from '$lib/api/projects';
  import { currentLocale, _ } from '$lib/i18n';
  import { getVideoUrl, getCoverImageUrl } from '$lib/config/environment';
  import SearchIcon from '@material-icons/svg/svg/search/baseline.svg?raw';
  import PlayArrowIcon from '@material-icons/svg/svg/play_arrow/baseline.svg?raw';
  import PauseIcon from '@material-icons/svg/svg/pause/baseline.svg?raw';
  
  let searchQuery = '';
  let results: SearchResult[] = [];
  let searching = false;
  let hasSearched = false;
  let playingVideoId: string | null = null;
  
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
    
    // Stoppe alle anderen Videos
    document.querySelectorAll('video').forEach(v => {
      if (v !== video) {
        v.pause();
        v.currentTime = 0;
      }
    });
    
    // Setze Video auf Startzeit und spiele ab
    video.currentTime = result.startTime;
    video.play();
    playingVideoId = result.videoId;
    
    // Stoppe nach 5 Sekunden
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
    const video = event.target as HTMLVideoElement;
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
      endTime: selectedScene.endTime
    });
    showProjectModal = false;
    // Success notification could be added here
  }
  
  async function createNewProject() {
    const name = prompt(_('search.projectName'));
    if (name) {
      const project = await projectsApi.createProject({ name });
      await addToProject(project.id);
    }
  }
</script>

<div class="max-w-7xl mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold mb-8 text-gradient">
    {_('search.title')}
  </h1>
  
  <!-- Search Input -->
  <div class="mb-8">
    <div class="flex gap-4">
      <div class="flex-1 relative">
        <input
          type="text"
          bind:value={searchQuery}
          on:keydown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={_('search.placeholder')}
          class="w-full px-4 py-3 pl-12 glass-effect rounded-xl border border-gray-300 dark:border-gray-600"
        />
        <div class="absolute left-4 top-1/2 transform -translate-y-1/2 icon-18px text-current">
          {@html SearchIcon}
        </div>
      </div>
      <button
        on:click={handleSearch}
        disabled={searching || !searchQuery.trim()}
        class="glass-button px-8"
      >
        {searching ? _('search.searching') : _('search.button')}
      </button>
    </div>
  </div>
  
  <!-- Results -->
  {#if searching}
    <div class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
      <p class="mt-4 text-gray-600 dark:text-gray-400">{_('search.searching')}</p>
    </div>
  {:else if hasSearched}
    {#if results.length === 0}
      <div class="text-center py-12">
        <p class="text-gray-600 dark:text-gray-400">
          {_('search.noResults')}
        </p>
      </div>
    {:else}
      <div class="mb-6">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {results.length} {_('search.resultsFound')}
        </p>
      </div>
      
      <!-- Video Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each results as result}
          <div class="glass-card hover:scale-[1.02] transition-transform overflow-hidden" style="padding: 0;">
            <!-- Video Player -->
            <div class="relative">
              <video
                class="w-full h-48 bg-gray-900 object-cover"
                preload="metadata"
                poster={getCoverImageUrl(result.videoId, result.startTime)}
                on:play={(e) => handleVideoPlay(e, result)}
                on:pause={handleVideoPause}
                muted
              >
                <source src={getVideoUrl(result.videoId)} type="video/mp4" />
                {_('search.videoNotSupported')}
              </video>
              
              <!-- Play Overlay -->
              <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                <button
                  on:click={(e) => {
                    const video = e.target.closest('.relative').querySelector('video');
                    handleVideoPlay({ target: video }, result);
                  }}
                  class="glass-button rounded-full p-3 hover:scale-110 transition-transform"
                >
                  <div class="icon-18px text-current">
                    {@html (playingVideoId === result.videoId ? PauseIcon : PlayArrowIcon)}
                  </div>
                </button>
              </div>
              
              <!-- Time Badge -->
              <div class="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                {formatTime(result.startTime)}
              </div>
            </div>
            
            <!-- Content -->
            <div class="p-4 space-y-2">
              <div class="flex items-center justify-between">
                <h3 class="font-semibold text-sm truncate">{result.videoTitle}</h3>
                <div class="text-xs text-gray-500 flex-shrink-0">
                  {Math.round(result.score * 100)}% match
                </div>
              </div>
              
              <p class="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                {result.content}
              </p>
              
              <!-- Duration Info -->
              <div class="text-xs text-purple-600 dark:text-purple-400">
                {_('search.playsFrom')} {formatTime(result.startTime)}
              </div>
              
              <!-- Action Buttons -->
              <div class="flex gap-2 mt-2">
                <button class="glass-button text-xs flex-1" on:click={() => openAddToProjectModal(result)}>
                  {_('search.addToProject')}
                </button>
                <button class="glass-button text-xs" on:click={() => window.location.href = `/videos/${result.videoId}`}>
                  {_('search.viewVideo')}
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<!-- Project Selection Modal -->
{#if showProjectModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="glass-card p-6 max-w-md w-full">
      <h3 class="text-xl font-bold mb-4">
        {_('search.addToProject')}
      </h3>
      
      <div class="space-y-2 max-h-60 overflow-y-auto">
        {#each projects as project}
          <button 
            class="w-full glass-button text-left p-3"
            on:click={() => addToProject(project.id)}
          >
            {project.name}
            <span class="text-xs text-gray-500">({project.scenes.length} scenes)</span>
          </button>
        {/each}
      </div>
      
      <div class="flex gap-2 mt-4">
        <button class="glass-button flex-1" on:click={createNewProject}>
          {_('search.createNewProject')}
        </button>
        <button class="glass-button" on:click={() => showProjectModal = false}>
          {_('actions.cancel')}
        </button>
      </div>
    </div>
  </div>
{/if}
