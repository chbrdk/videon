<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Scene } from '$lib/api/videos';
  import UdgGlassVisionTags from './udg-glass-vision-tags.svelte';
  import PlayIcon from '@material-icons/svg/svg/play_arrow/baseline.svg?raw';
  import ClockIcon from '@material-icons/svg/svg/schedule/baseline.svg?raw';

  export let scenes: Scene[] = [];
  export let visionData: any[] = [];

  const dispatch = createEventDispatcher<{
    sceneSelect: Scene;
  }>();

  function handleSceneClick(scene: Scene) {
    dispatch('sceneSelect', scene);
  }

  function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  function formatDuration(startTime: number, endTime: number): string {
    const duration = endTime - startTime;
    return formatTime(duration);
  }
</script>

<div class="glass-card">
  <h3 class="text-xl font-bold text-white mb-4">Erkannte Szenen ({scenes.length})</h3>
  
  {#if scenes.length === 0}
    <div class="text-center py-8 text-white/60">
      <div class="w-12 h-12 mx-auto mb-4 opacity-50" innerHTML={ClockIcon}></div>
      <p>Noch keine Szenen analysiert</p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each scenes as scene, index (scene.id)}
        <div 
          class="flex items-center gap-4 p-4 bg-white/5 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white/10 hover:scale-[1.02]"
          role="button"
          tabindex="0"
          on:click={() => handleSceneClick(scene)}
          on:keydown={(e) => e.key === 'Enter' && handleSceneClick(scene)}
        >
          <!-- Scene Thumbnail -->
          <div class="flex-shrink-0 w-20 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded flex items-center justify-center">
            {#if scene.keyframePath}
              <img 
                src={scene.keyframePath} 
                alt="Scene {index + 1}" 
                class="w-full h-full object-cover rounded"
                loading="lazy"
              />
            {:else}
              <div class="w-6 h-6 text-white/60" innerHTML={PlayIcon}></div>
            {/if}
          </div>

          <!-- Scene Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <h4 class="font-medium text-white">Szene {index + 1}</h4>
              <span class="text-sm text-white/70">{formatDuration(scene.startTime, scene.endTime)}</span>
            </div>
            <div class="flex items-center gap-4 mt-1 text-sm text-white/60">
              <span>Start: {formatTime(scene.startTime)}</span>
              <span>Ende: {formatTime(scene.endTime)}</span>
            </div>
          </div>

          <!-- Play Button -->
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
              <div class="w-4 h-4 text-white" innerHTML={PlayIcon}></div>
            </div>
          </div>
        </div>
        
        <!-- Vision Analysis Tags -->
        {#if visionData[index]}
          <UdgGlassVisionTags 
            objects={visionData[index].objects || []}
            faces={visionData[index].faces || []}
            sceneClassification={visionData[index].sceneClassification || []}
            customObjects={visionData[index].customObjects || []}
            aiDescription={visionData[index].aiDescription || null}
            qwenVLDescription={visionData[index].qwenVLDescription || null}
          />
        {/if}
      {/each}
    </div>
  {/if}
</div>
