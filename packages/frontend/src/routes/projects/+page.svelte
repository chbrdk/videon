<script lang="ts">
  import { onMount } from 'svelte';
  import { projectsApi, type Project } from '$lib/api/projects';
  import { _, currentLocale } from '$lib/i18n';
  
  let projects: Project[] = [];
  let loading = true;
  
  onMount(async () => {
    projects = await projectsApi.getProjects();
    loading = false;
  });
  
  async function createNewProject() {
    const name = prompt($currentLocale === 'en' ? 'Project name:' : 'Projektname:');
    if (name) {
      const project = await projectsApi.createProject({ name });
      window.location.href = `/projects/${project.id}`;
    }
  }
  
  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
</script>

<div class="max-w-7xl mx-auto px-4 py-8">
  <div class="flex justify-between items-center mb-8">
    <h1 class="text-3xl font-bold text-gradient">
      {$currentLocale === 'en' ? 'My Projects' : 'Meine Projekte'}
    </h1>
    <button class="glass-button" on:click={createNewProject}>
      {$currentLocale === 'en' ? 'New Project' : 'Neues Projekt'}
    </button>
  </div>
  
  {#if loading}
    <div class="text-center py-12">{$currentLocale === 'en' ? 'Loading...' : 'Lädt...'}</div>
  {:else if projects.length === 0}
    <div class="text-center py-12 glass-card">
      <p class="text-gray-600 dark:text-gray-400 mb-4">
        {$currentLocale === 'en' ? 'No projects yet' : 'Noch keine Projekte'}
      </p>
      <button class="glass-button" on:click={createNewProject}>
        {$currentLocale === 'en' ? 'Create your first project' : 'Erstelle dein erstes Projekt'}
      </button>
    </div>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {#each projects as project}
        <a href="/projects/{project.id}" class="glass-card hover:scale-[1.02] transition-transform p-6">
          <h3 class="text-xl font-semibold mb-2">{project.name}</h3>
          {#if project.description}
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">{project.description}</p>
          {/if}
          <div class="flex justify-between text-sm text-gray-500">
            <span>{project.scenes.length} scenes</span>
            {#if project.duration}
              <span>{formatDuration(project.duration)}</span>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
