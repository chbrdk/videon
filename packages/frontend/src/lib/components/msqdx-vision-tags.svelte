<script lang="ts">
  import { MaterialSymbol } from '$lib/components/ui';
  // Svelte 5 Props
  interface Props {
    objects?: Array<{ label: string; confidence: number }>;
    faces?: Array<{ confidence: number }>;
    sceneClassification?: Array<{ label: string; confidence: number; category: string }>;
    customObjects?: Array<{ label: string; confidence: number }>;
    aiDescription?: string | null;
    qwenVLDescription?: string | null;
  }

  let {
    objects = [],
    faces = [],
    sceneClassification = [],
    customObjects = [],
    aiDescription = null,
    qwenVLDescription = null,
  }: Props = $props();

  // Svelte 5 state for collapsible sections
  let summaryExpanded = $state(true);
  let detailsExpanded = $state(false);

  // Svelte 5 derived state
  let topObjects = $derived(objects.sort((a, b) => b.confidence - a.confidence).slice(0, 5));

  let topSceneClassification = $derived(
    sceneClassification.sort((a, b) => b.confidence - a.confidence).slice(0, 3)
  );

  let topCustomObjects = $derived(
    customObjects.sort((a, b) => b.confidence - a.confidence).slice(0, 3)
  );

  // Parse Qwen VL structured output
  interface ParsedQwenVL {
    sceneInfo: string | null;
    summary: string | null;
    detailsTitle: string;
    details: Array<{ title: string; content: string }>;
  }

  let parsedQwenVL = $derived(parseQwenVLDescription(qwenVLDescription));

  function parseQwenVLDescription(description: string | null): ParsedQwenVL {
    if (!description)
      return {
        sceneInfo: null,
        summary: null,
        detailsTitle: 'Detaillierte Beschreibung',
        details: [],
      };

    const result: ParsedQwenVL = {
      sceneInfo: null,
      summary: null,
      detailsTitle: 'Detaillierte Beschreibung',
      details: [],
    };

    // Extract scene info (first line with **Video-Szene:**)
    const sceneInfoMatch = description.match(/\*\*Video-Szene:([^*]+)\*\*/);
    if (sceneInfoMatch) {
      result.sceneInfo = sceneInfoMatch[1].trim();
    }

    // Extract summary (between **Zusammenfassung der Szene:** and ---)
    const summaryMatch = description.match(/\*\*Zusammenfassung der Szene:\*\*\s*(.+?)(?=---|$)/s);
    if (summaryMatch) {
      result.summary = summaryMatch[1].trim();
    }

    // Extract detailed description sections (numbered items)
    const detailsSection = description.match(/\*\*Detaillierte Beschreibung:\*\*\s*(.+)/s);
    if (detailsSection) {
      const detailsText = detailsSection[1];

      // Find all numbered sections (**1. Title:** content)
      const sectionRegex = /\*\*(\d+)\.\s*([^:*]+):\*\*\s*([^*]+?)(?=\*\*\d+\.|$)/g;
      let match;

      while ((match = sectionRegex.exec(detailsText)) !== null) {
        const [, number, title, content] = match;
        result.details.push({
          title: `${number}. ${title.trim()}`,
          content: content.trim(),
        });
      }
    }

    // Generic fallback: capture any bold headline sections
    const genericSections: Array<{ heading: string; content: string }> = [];
    const headingRegex = /\*\*(.+?)\*\*\s*([\s\S]*?)(?=\n\s*\*\*|$)/g;
    let headingMatch;

    while ((headingMatch = headingRegex.exec(description)) !== null) {
      const rawHeading = headingMatch[1].trim();
      const content = headingMatch[2].trim();
      if (!content) continue;

      const normalizedHeading = rawHeading.replace(/[:：\s]+$/, '').trim();
      const slug = normalizedHeading.toLowerCase();

      if (slug.includes('video-szene') || slug.includes('video scene')) {
        if (!result.sceneInfo) {
          result.sceneInfo = content.replace(/\*\*/g, '').trim();
        }
        continue;
      }

      if (slug.includes('zusammenfassung')) {
        if (!result.summary) {
          result.summary = content.replace(/\*\*/g, '').trim();
        }
        continue;
      }

      if (slug.includes('detaillierte beschreibung') || slug.includes('detailed description')) {
        // Already handled above via numbered sections; skip generic capture
        continue;
      }

      genericSections.push({
        heading: normalizedHeading,
        content: content.replace(/\*\*/g, '').trim(),
      });
    }

    if (result.details.length === 0 && genericSections.length > 0) {
      result.detailsTitle = 'Analyseabschnitte';
      result.details = genericSections.map(section => ({
        title: section.heading,
        content: section.content,
      }));
    }

    return result;
  }
</script>

<div class="vision-tags glass-card">
  <h3>Vision Analysis</h3>

  {#if faces.length > 0}
    <div class="tag-group">
      <span class="tag face-tag">
        <span class="w-4 h-4 flex items-center justify-center"
          ><MaterialSymbol icon="face" fontSize={16} /></span
        >
        {faces.length}
        {faces.length === 1 ? 'Person' : 'Persons'}
      </span>
    </div>
  {/if}

  {#if topObjects.length > 0}
    <!-- ... code ... -->
  {/if}

  <!-- ... code ... -->

  {#if qwenVLDescription}
    <div class="ai-description qwen-vl">
      <div class="ai-header">
        <span class="ai-label">Qwen VL Analyse:</span>
      </div>

      {#if parsedQwenVL && (parsedQwenVL.sceneInfo || parsedQwenVL.summary || parsedQwenVL.details.length > 0)}
        <!-- Scene Info -->
        {#if parsedQwenVL.sceneInfo}
          <div class="qwen-scene-info">
            <MaterialSymbol icon="videocam" fontSize={16} class="text-green-300/80 mr-2" />
            {parsedQwenVL.sceneInfo}
          </div>
        {/if}

        <!-- Summary (Collapsible) -->
        {#if parsedQwenVL.summary}
          <div class="qwen-section">
            <button
              class="qwen-section-header"
              onclick={() => (summaryExpanded = !summaryExpanded)}
            >
              <MaterialSymbol
                icon={summaryExpanded ? 'expand_more' : 'chevron_right'}
                fontSize={18}
                class="text-green-300/80"
              />
              <span class="section-title">Zusammenfassung</span>
            </button>

            {#if summaryExpanded}
              <div class="qwen-section-content">
                <p class="qwen-summary">{parsedQwenVL.summary}</p>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Detailed Description (Collapsible) -->
        {#if parsedQwenVL.details.length > 0}
          <div class="qwen-section">
            <button
              class="qwen-section-header"
              onclick={() => (detailsExpanded = !detailsExpanded)}
            >
              <MaterialSymbol
                icon={detailsExpanded ? 'expand_more' : 'chevron_right'}
                fontSize={18}
                class="text-green-300/80"
              />
              <span class="section-title">
                {parsedQwenVL.detailsTitle}
                {parsedQwenVL.details.length > 0 ? ` (${parsedQwenVL.details.length})` : ''}
              </span>
            </button>

            {#if detailsExpanded}
              <div class="qwen-section-content">
                {#each parsedQwenVL.details as detail}
                  <div class="qwen-detail-item">
                    <div class="detail-title">
                      <MaterialSymbol icon="label" fontSize={16} class="text-green-300/70" />
                      {detail.title}
                    </div>
                    <p class="detail-content">{detail.content}</p>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      {:else}
        <!-- Fallback: Show raw description if parsing failed -->
        <div class="ai-text-raw">
          <p
            style="white-space: pre-wrap; font-size: 0.875rem; line-height: 1.5; color: rgba(255, 255, 255, 0.9);"
          >
            {qwenVLDescription}
          </p>
        </div>
      {/if}
    </div>
  {:else if aiDescription}
    <div class="ai-description">
      <div class="ai-header">
        <span class="ai-label">AI Description:</span>
      </div>
      <p class="ai-text">{aiDescription}</p>
    </div>
  {/if}

  {#if faces.length === 0 && topObjects.length === 0 && topSceneClassification.length === 0 && topCustomObjects.length === 0 && !aiDescription}
    <div class="no-results">
      <p>No objects or faces detected</p>
    </div>
  {/if}
</div>

<style>
  .vision-tags {
    padding: 1rem;
    backdrop-filter: blur(10px);
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 0.75rem;
    margin-top: 1rem;
  }

  .vision-tags h3 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: white;
  }

  .tag-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    white-space: nowrap;
  }

  .face-tag {
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.4);
    color: #93c5fd;
  }

  .object-tag {
    background: rgba(16, 185, 129, 0.2);
    border: 1px solid rgba(16, 185, 129, 0.4);
    color: #6ee7b7;
  }

  .scene-tag {
    background: rgba(168, 85, 247, 0.2);
    border: 1px solid rgba(168, 85, 247, 0.4);
    color: #c4b5fd;
  }

  .custom-tag {
    background: rgba(245, 158, 11, 0.2);
    border: 1px solid rgba(245, 158, 11, 0.4);
    color: #fbbf24;
  }

  .tag-label {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.75rem;
    font-weight: 600;
    margin-right: 0.5rem;
  }

  .ai-description {
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgba(147, 51, 234, 0.1);
    border: 1px solid rgba(147, 51, 234, 0.3);
    border-radius: 0.5rem;
  }

  .ai-description.qwen-vl {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .ai-header {
    margin-bottom: 0.5rem;
  }

  .ai-label {
    color: rgba(196, 181, 253, 0.9);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .qwen-vl .ai-label {
    color: rgba(134, 239, 172, 0.9);
  }

  .ai-text {
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.875rem;
    line-height: 1.4;
    margin: 0;
    font-style: italic;
  }

  /* Qwen VL Structured Styles */
  .qwen-scene-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: rgba(34, 197, 94, 0.15);
    border-radius: 0.375rem;
    margin-bottom: 0.75rem;
    font-size: 0.8125rem;
    color: rgba(134, 239, 172, 0.95);
    font-weight: 500;
  }

  .qwen-scene-info .material-icons-outlined {
    font-size: 1rem;
    color: rgba(134, 239, 172, 0.8);
  }

  .qwen-section {
    margin-top: 0.75rem;
  }

  .qwen-section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s;
    color: white;
    font-size: 0.8125rem;
    font-weight: 600;
    text-align: left;
  }

  .qwen-section-header:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(34, 197, 94, 0.4);
  }

  .qwen-section-header .material-icons-outlined {
    font-size: 1.125rem;
    color: rgba(134, 239, 172, 0.8);
    transition: transform 0.2s;
  }

  .section-title {
    flex: 1;
  }

  .qwen-section-content {
    padding: 0.75rem;
    margin-top: 0.5rem;
    animation: slideDown 0.2s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .qwen-summary {
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.875rem;
    line-height: 1.6;
    margin: 0;
  }

  .qwen-detail-item {
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .qwen-detail-item:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }

  .detail-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: rgba(134, 239, 172, 0.95);
    font-size: 0.8125rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .detail-title .material-icons-outlined {
    font-size: 1rem;
    color: rgba(134, 239, 172, 0.7);
  }

  .detail-content {
    color: rgba(255, 255, 255, 0.85);
    font-size: 0.8125rem;
    line-height: 1.5;
    margin: 0;
    padding-left: 1.5rem;
    white-space: pre-line;
  }

  /* Material Icons Support */
  .material-icons-outlined {
    font-family: 'Material Icons Outlined';
    font-weight: normal;
    font-style: normal;
    font-size: 24px;
    display: inline-block;
    line-height: 1;
    text-transform: none;
    letter-spacing: normal;
    word-wrap: normal;
    white-space: nowrap;
    direction: ltr;
  }

  .no-results {
    text-align: center;
    padding: 1rem;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.875rem;
  }

  .no-results p {
    margin: 0;
  }
</style>
