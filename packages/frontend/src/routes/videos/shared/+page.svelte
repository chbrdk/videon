<script lang="ts">
  import { onMount } from 'svelte';
  import { sharingApi, type SharedItemsResponse } from '$lib/api/sharing';
  import { MSQDX_COLORS, MSQDX_TYPOGRAPHY } from '$lib/design-tokens';
  import { _ } from '$lib/i18n';
  import MsqdxVideoCard from '$lib/components/msqdx-video-card.svelte';
  import MsqdxProjectCard from '$lib/components/MsqdxProjectCard.svelte';
  import { MaterialSymbol } from '$lib/components/ui';
  import { goto } from '$app/navigation';

  let sharedData: SharedItemsResponse = { projects: [], videos: [] };
  let isLoading = true;
  let error: string | null = null;

  onMount(async () => {
    try {
      sharedData = await sharingApi.getSharedWithMe();
    } catch (e) {
      console.error('Failed to load shared items', e);
      error = 'Failed to load shared items';
    } finally {
      isLoading = false;
    }
  });

  function handleVideoClick(videoId: string) {
    goto(`/videos/${videoId}`);
  }

  function handleProjectClick(projectId: string) {
    goto(`/projects/${projectId}`);
  }
</script>

<div class="shared-page">
  <div class="header-section mb-8">
    <div class="flex items-center gap-3 mb-2">
      <div
        class="w-10 h-10 rounded-xl flex items-center justify-center"
        style="background: {MSQDX_COLORS.brand.orange}; color: white;"
      >
        <MaterialSymbol icon="share" fontSize={24} />
      </div>
      <h1
        style="
          font-family: {MSQDX_TYPOGRAPHY.fontFamily.primary};
          font-size: {MSQDX_TYPOGRAPHY.fontSize['4xl']};
          font-weight: 800;
          color: {MSQDX_COLORS.dark.textPrimary};
          letter-spacing: -1.5px;
        "
      >
        Shared with me
      </h1>
    </div>
    <p
      style="
        font-family: {MSQDX_TYPOGRAPHY.fontFamily.primary};
        color: {MSQDX_COLORS.dark.textSecondary};
      "
    >
      Items shared with you by other collaborators.
    </p>
  </div>

  {#if isLoading}
    <div class="flex items-center justify-center p-20">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
    </div>
  {:else if error}
    <div
      class="p-8 rounded-2xl text-center"
      style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2);"
    >
      <MaterialSymbol icon="error" fontSize={48} style="color: #ef4444;" />
      <p class="mt-4 text-red-500 font-medium">{error}</p>
    </div>
  {:else if sharedData.projects.length === 0 && sharedData.videos.length === 0}
    <div
      class="p-20 rounded-[40px] text-center flex flex-col items-center justify-center"
      style="background: rgba(255, 255, 255, 0.03); border: 2px dashed rgba(255, 255, 255, 0.1);"
    >
      <div
        class="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style="background: rgba(255, 255, 255, 0.05);"
      >
        <MaterialSymbol icon="share_off" fontSize={40} style="color: rgba(255, 255, 255, 0.3);" />
      </div>
      <h3 class="text-xl font-semibold mb-2" style="color: {MSQDX_COLORS.dark.textPrimary};">
        No shared items yet
      </h3>
      <p style="color: {MSQDX_COLORS.dark.textSecondary};">
        When someone shares a project or video with you, it will appear here.
      </p>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {#each sharedData.projects as project}
        <MsqdxProjectCard {project} on:click={() => handleProjectClick(project.id)} />
      {/each}

      {#each sharedData.videos as video}
        <MsqdxVideoCard {video} on:click={() => handleVideoClick(video.id)} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .shared-page {
    width: 100%;
    max-width: 100%;
  }
</style>
