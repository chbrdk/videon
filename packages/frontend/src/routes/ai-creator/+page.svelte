<script lang="ts">
  import { goto } from '$app/navigation';
  import { aiCreatorApi, type VideoSuggestion, type SelectedScene } from '$lib/api/ai-creator';
  import { currentLocale, _ } from '$lib/i18n';
  import { onMount } from 'svelte';

  // State
  let query = '';
  let variantCount = 1;
  let loading = false;
  let loadingStep = '';
  let suggestions: VideoSuggestion[] = [];
  let selectedSuggestionIndex = 0;
  let error = '';
  let isAvailable = false;
  let checkingHealth = true;

  // Example queries
  const exampleQueries = {
    en: [
      'Create a 60 second video about management presentations with professional tone',
      'Find funny moments with reactions',
      'Create an energetic product showcase',
    ],
    de: [
      'Erstelle ein 60 Sekunden Video über Management-Präsentationen mit professionellem Ton',
      'Finde lustige Momente mit Reaktionen',
      'Erstelle eine energiegeladene Produktvorstellung',
    ],
  };

  onMount(async () => {
    // Check if AI Creator service is available
    try {
      const health = await aiCreatorApi.health();
      isAvailable = health.available;
    } catch (err) {
      console.error('Health check failed:', err);
      isAvailable = false;
    } finally {
      checkingHealth = false;
    }
  });

  async function handleAnalyze() {
    if (!query.trim()) {
      error = $currentLocale === 'en' ? 'Please enter a query' : 'Bitte geben Sie eine Anfrage ein';
      return;
    }

    loading = true;
    error = '';
    suggestions = [];

    try {
      // Step 1: Analyzing
      loadingStep =
        $currentLocale === 'en'
          ? 'Analyzing your request with GPT-5-mini...'
          : 'Analysiere Ihre Anfrage mit GPT-5-mini...';

      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for UX

      // Step 2: Searching
      loadingStep =
        $currentLocale === 'en'
          ? 'Searching for relevant scenes...'
          : 'Suche nach relevanten Szenen...';

      // Step 3: Evaluating
      setTimeout(() => {
        loadingStep =
          $currentLocale === 'en'
            ? 'Evaluating and ranking scenes...'
            : 'Bewerte und sortiere Szenen...';
      }, 2000);

      // Step 4: Creating
      setTimeout(() => {
        loadingStep =
          $currentLocale === 'en'
            ? 'Creating video suggestions...'
            : 'Erstelle Video-Vorschläge...';
      }, 4000);

      const result = await aiCreatorApi.analyzeQuery(query, variantCount);
      suggestions = result;
      selectedSuggestionIndex = 0;
    } catch (err: any) {
      console.error('Analysis error:', err);
      error =
        err.message ||
        ($currentLocale === 'en'
          ? 'Failed to analyze query. Please try again.'
          : 'Analyse fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      loading = false;
      loadingStep = '';
    }
  }

  async function handleCreateProject() {
    const suggestion = suggestions[selectedSuggestionIndex];
    if (!suggestion) return;

    loading = true;
    error = '';

    try {
      loadingStep = $currentLocale === 'en' ? 'Creating project...' : 'Erstelle Projekt...';

      const projectId = await aiCreatorApi.createProject(suggestion.id);

      // Redirect to project page
      goto(`/projects/${projectId}`);
    } catch (err: any) {
      console.error('Create project error:', err);
      error =
        err.message ||
        ($currentLocale === 'en'
          ? 'Failed to create project. Please try again.'
          : 'Projekt-Erstellung fehlgeschlagen. Bitte versuchen Sie es erneut.');
      loading = false;
      loadingStep = '';
    }
  }

  async function handleRegenerate() {
    await handleAnalyze();
  }

  function useExample(example: string) {
    query = example;
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  $: selectedSuggestion = suggestions[selectedSuggestionIndex];
  $: examples = $currentLocale === 'en' ? exampleQueries.en : exampleQueries.de;
</script>

<div class="max-w-6xl mx-auto">
  <!-- Header -->
  <div class="mb-8">
    <p class="text-gray-600 dark:text-gray-400">
      {$currentLocale === 'en'
        ? 'Describe your video idea and let AI find the perfect scenes'
        : 'Beschreiben Sie Ihre Video-Idee und lassen Sie KI die perfekten Szenen finden'}
    </p>
  </div>

  <!-- Health Check Warning -->
  {#if checkingHealth}
    <div class="glass-card p-4 mb-6 text-center">
      <p class="text-gray-600 dark:text-gray-400">
        {$currentLocale === 'en' ? 'Checking AI service...' : 'Prüfe KI-Service...'}
      </p>
    </div>
  {:else if !isAvailable}
    <div
      class="glass-card p-4 mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
    >
      <p class="text-yellow-800 dark:text-yellow-200">
        ⚠️ {$currentLocale === 'en'
          ? 'AI Creator service is not available. Please configure OPENAI_API_KEY.'
          : 'KI Creator Service ist nicht verfügbar. Bitte konfigurieren Sie OPENAI_API_KEY.'}
      </p>
    </div>
  {/if}

  <!-- Query Input Section -->
  <div class="glass-card p-6 mb-6">
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {$currentLocale === 'en' ? 'Describe your video' : 'Beschreiben Sie Ihr Video'}
      </label>
      <textarea
        bind:value={query}
        disabled={loading || !isAvailable}
        placeholder={$currentLocale === 'en'
          ? 'e.g., Create a 60 second video about management presentations with professional tone'
          : 'z.B. Erstelle ein 60 Sekunden Video über Management-Präsentationen mit professionellem Ton'}
        rows="4"
        class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>

    <!-- Examples -->
    <div class="mb-4">
      <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
        {$currentLocale === 'en' ? 'Try an example:' : 'Versuchen Sie ein Beispiel:'}
      </p>
      <div class="flex flex-wrap gap-2">
        {#each examples as example}
          <button
            on:click={() => useExample(example)}
            disabled={loading || !isAvailable}
            class="text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {example.substring(0, 50)}...
          </button>
        {/each}
      </div>
    </div>

    <!-- Variant Count -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {$currentLocale === 'en' ? 'Number of variants' : 'Anzahl der Varianten'}
      </label>
      <div class="flex gap-2">
        {#each [1, 2, 3] as count}
          <button
            on:click={() => (variantCount = count)}
            disabled={loading || !isAvailable}
            class="px-4 py-2 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed {variantCount ===
            count
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}"
          >
            {count}
          </button>
        {/each}
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-3">
      <button
        on:click={handleAnalyze}
        disabled={loading || !isAvailable || !query.trim()}
        class="flex-1 glass-button px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading
          ? $currentLocale === 'en'
            ? 'Analyzing...'
            : 'Analysiere...'
          : $currentLocale === 'en'
            ? 'Generate Video Ideas'
            : 'Generiere Video-Ideen'}
      </button>
    </div>
  </div>

  <!-- Error Message -->
  {#if error}
    <div
      class="glass-card p-4 mb-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
    >
      <p class="text-red-800 dark:text-red-200">
        ❌ {error}
      </p>
    </div>
  {/if}

  <!-- Loading State -->
  {#if loading}
    <div class="glass-card p-8 text-center">
      <div class="flex flex-col items-center gap-4">
        <div
          class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"
        ></div>
        <p class="text-gray-700 dark:text-gray-300 font-medium">{loadingStep}</p>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {$currentLocale === 'en'
            ? 'This may take a few moments...'
            : 'Dies kann einige Momente dauern...'}
        </p>
      </div>
    </div>
  {/if}

  <!-- Suggestions View -->
  {#if !loading && suggestions.length > 0}
    <div class="space-y-6">
      <!-- Variant Selector (if multiple) -->
      {#if suggestions.length > 1}
        <div class="flex gap-3 overflow-x-auto pb-2">
          {#each suggestions as suggestion, i}
            <button
              on:click={() => (selectedSuggestionIndex = i)}
              class="flex-shrink-0 glass-card p-4 rounded-lg transition-all {selectedSuggestionIndex ===
              i
                ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600'}"
            >
              <p class="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {$currentLocale === 'en' ? 'Variant' : 'Variante'}
                {i + 1}
              </p>
              <p class="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                {suggestion.title}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {suggestion.scenes.length}
                {$currentLocale === 'en' ? 'scenes' : 'Szenen'} • {formatDuration(
                  suggestion.totalDuration
                )}
              </p>
            </button>
          {/each}
        </div>
      {/if}

      <!-- Selected Suggestion Detail -->
      {#if selectedSuggestion}
        <div class="glass-card p-6">
          <div class="mb-6">
            <h2 class="text-2xl font-light text-gray-900 dark:text-white mb-2">
              {selectedSuggestion.title}
            </h2>
            <p class="text-gray-600 dark:text-gray-400 mb-4">
              {selectedSuggestion.description}
            </p>
            <div class="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>
                📹 {selectedSuggestion.scenes.length}
                {$currentLocale === 'en' ? 'scenes' : 'Szenen'}
              </span>
              <span>
                ⏱️ {formatDuration(selectedSuggestion.totalDuration)}
              </span>
              <span>
                🎨 {selectedSuggestion.tone}
              </span>
            </div>
          </div>

          <!-- Scenes Timeline -->
          <div class="space-y-3 mb-6">
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {$currentLocale === 'en' ? 'Scene Timeline' : 'Szenen-Timeline'}
            </h3>
            {#each selectedSuggestion.scenes as scene, i}
              <div
                class="glass-card p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div class="flex items-start gap-4">
                  <div
                    class="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-sm font-medium"
                  >
                    {i + 1}
                  </div>
                  <div class="flex-1">
                    <div class="flex items-start justify-between mb-2">
                      <div>
                        <p class="text-sm font-medium text-gray-900 dark:text-white">
                          {$currentLocale === 'en' ? 'Scene' : 'Szene'}
                          {i + 1}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                          {formatDuration(scene.startTime)} - {formatDuration(scene.endTime)}
                          ({formatDuration(scene.endTime - scene.startTime)})
                        </p>
                      </div>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                      {scene.reasoning}
                    </p>
                  </div>
                </div>
              </div>
            {/each}
          </div>

          <!-- Actions -->
          <div class="flex gap-3">
            <button
              on:click={handleCreateProject}
              class="flex-1 glass-button px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              {$currentLocale === 'en' ? '✓ Create Project' : '✓ Projekt erstellen'}
            </button>
            <button
              on:click={handleRegenerate}
              class="glass-button px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {$currentLocale === 'en' ? '↻ Regenerate' : '↻ Neu generieren'}
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Empty State (when no suggestions yet) -->
  {#if !loading && suggestions.length === 0 && !error}
    <div class="glass-card p-12 text-center">
      <div class="text-6xl mb-4">🎬</div>
      <h3 class="text-xl font-light text-gray-900 dark:text-white mb-2">
        {$currentLocale === 'en'
          ? 'Create Your First AI Video'
          : 'Erstellen Sie Ihr erstes KI-Video'}
      </h3>
      <p class="text-gray-600 dark:text-gray-400">
        {$currentLocale === 'en'
          ? 'Describe what you want and let AI do the magic'
          : 'Beschreiben Sie, was Sie wollen, und lassen Sie KI die Magie wirken'}
      </p>
    </div>
  {/if}
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
