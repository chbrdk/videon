<script lang="ts">
  import { onMount } from 'svelte';
  import { projectsApi, type Project } from '$lib/api/projects';
  import { _, currentLocale } from '$lib/i18n';
  import { base, resolve } from '$app/paths';

  let projects: Project[] = [];
  let loading = true;

  import MsqdxGlassCard from '$lib/components/ui/MsqdxGlassCard.svelte';
  import { MaterialSymbol } from '$lib/components/ui';

  onMount(async () => {
    projects = await projectsApi.getProjects();
    loading = false;
  });

  async function createNewProject() {
    const name = prompt($currentLocale === 'en' ? 'Project name:' : 'Projektname:');
    if (name) {
      const project = await projectsApi.createProject({ name });
      window.location.href = resolve(`/projects/${project.id}`);
    }
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
</script>

<svelte:head>
  <title>{$currentLocale === 'en' ? 'My Projects' : 'Meine Projekte'} - Videon</title>
</svelte:head>

<div class="space-y-8 pb-12">
  <!-- Actions -->
  <div class="flex justify-end">
    <button
      class="
        py-2 px-4 rounded-lg
        bg-white/10 hover:bg-white/20
        text-white font-medium text-sm
        flex items-center gap-2
        transition-colors duration-200
      "
      on:click={createNewProject}
    >
      <MaterialSymbol icon="add" fontSize={20} />
      <span>{$currentLocale === 'en' ? 'New Project' : 'Neues Projekt'}</span>
    </button>
  </div>

  {#if loading}
    <div class="flex flex-col items-center justify-center py-24 space-y-4">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white/50"></div>
      <p class="text-white/40 text-sm">
        {$currentLocale === 'en' ? 'Loading projects...' : 'Lade Projekte...'}
      </p>
    </div>
  {:else if projects.length === 0}
    <MsqdxGlassCard variant="default">
      <div class="flex flex-col items-center justify-center py-16 text-center space-y-6">
        <div class="p-4 rounded-full bg-white/5 border border-white/10">
          <MaterialSymbol icon="folder_open" fontSize={48} class="text-white/40" />
        </div>
        <div>
          <h3 class="text-xl text-white font-light tracking-wide mb-2">
            {$currentLocale === 'en' ? 'No projects yet' : 'Noch keine Projekte'}
          </h3>
          <p class="text-white/50 text-sm max-w-sm mx-auto">
            {$currentLocale === 'en'
              ? 'Create your first project to start organizing your videos and scenes.'
              : 'Erstelle dein erstes Projekt, um Videos und Szenen zu organisieren.'}
          </p>
        </div>
        <button
          class="
            py-3 px-6 rounded-xl
            bg-gradient-to-r from-indigo-500 to-purple-600
            hover:from-indigo-400 hover:to-purple-500
            text-white font-semibold tracking-wide text-sm
            shadow-lg shadow-indigo-500/20
            flex items-center gap-2
          "
          on:click={createNewProject}
        >
          <MaterialSymbol icon="add" fontSize={20} />
          <span>{$currentLocale === 'en' ? 'Create Project' : 'Projekt erstellen'}</span>
        </button>
      </div>
    </MsqdxGlassCard>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {#each projects as project}
        <a href={resolve(`/projects/${project.id}`)} class="block group relative">
          <div
            class="
            absolute -inset-0.5 bg-gradient-to-r from-indigo-500/0 via-purple-500/0 to-pink-500/0
            group-hover:from-indigo-500/50 group-hover:via-purple-500/50 group-hover:to-pink-500/50
            rounded-2xl opacity-0 group-hover:opacity-100 transition duration-500 blur-sm
          "
          ></div>

          <div
            class="
            relative h-full
            bg-gray-900/60 backdrop-blur-md
            border border-white/10 group-hover:border-white/20
            rounded-xl p-6
            flex flex-col justify-between
            transition-all duration-300
          "
          >
            <div>
              <div class="flex items-start justify-between mb-4">
                <div class="p-2 rounded-lg bg-white/5 text-indigo-300">
                  <MaterialSymbol icon="folder" fontSize={24} />
                </div>
                {#if project.duration}
                  <span class="text-xs font-mono text-white/40 bg-white/5 px-2 py-1 rounded">
                    {formatDuration(project.duration)}
                  </span>
                {/if}
              </div>

              <h3
                class="text-lg font-medium text-white mb-2 group-hover:text-indigo-300 transition-colors line-clamp-1"
              >
                {project.name}
              </h3>

              {#if project.description}
                <p class="text-sm text-white/50 line-clamp-2 mb-4">{project.description}</p>
              {/if}
            </div>

            <div
              class="flex items-center justify-between text-xs text-white/40 mt-4 pt-4 border-t border-white/5"
            >
              <span>{project.scenes.length} {$currentLocale === 'en' ? 'scenes' : 'Szenen'}</span>
              <span class="group-hover:translate-x-1 transition-transform">
                <MaterialSymbol icon="arrow_forward" fontSize={16} />
              </span>
            </div>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
