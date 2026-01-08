<script>
  import { searchQuery, searchAll } from '$lib/stores/folders.store';
  import { _ } from '$lib/i18n';
  
  let debounceTimer;
  export let className = '';
  
  function handleSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if ($searchQuery.trim()) {
        searchAll($searchQuery);
      }
    }, 300);
  }
</script>

<div class="search-bar {className}">
  <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
  </svg>
  <input 
    type="search" 
    bind:value={$searchQuery}
    oninput={handleSearch}
    placeholder={_('search.placeholder')}
    class="search-input"
  />
  {#if $searchQuery}
    <button 
      class="clear-button"
      onclick={() => searchQuery.set('')}
      title="Suche löschen"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
      </svg>
    </button>
  {/if}
</div>

<style>
  .search-bar {
    position: relative;
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 32px;
    padding: 12px 16px;
    transition: all 0.2s ease;
    min-width: 300px;
  }

  .search-bar:focus-within {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
  }

  .search-icon {
    color: rgba(255, 255, 255, 0.6);
    margin-right: 12px;
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
    font-weight: 500;
    width: 100%;
  }

  .search-input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  .clear-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    transition: all 0.2s ease;
    margin-left: 8px;
    flex-shrink: 0;
  }

:global(html.light) .search-bar {
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(0, 0, 0, 0.12);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

:global(html.light) .search-bar:focus-within {
    background: #ffffff;
    border-color: rgba(0, 0, 0, 0.2);
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.08);
}

:global(html.light) .search-icon {
    color: rgba(17, 24, 39, 0.65);
}

:global(html.light) .search-input {
    color: rgba(17, 24, 39, 0.9);
}

:global(html.light) .search-input::placeholder {
    color: rgba(55, 65, 81, 0.45);
}

:global(html.light) .clear-button {
    background: rgba(17, 24, 39, 0.05);
    color: rgba(17, 24, 39, 0.6);
}

:global(html.light) .clear-button:hover {
    background: rgba(17, 24, 39, 0.1);
    color: rgba(17, 24, 39, 0.8);
}

  .clear-button:hover {
    background: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.8);
  }

  .clear-button:focus {
    outline: 2px solid rgba(255, 255, 255, 0.3);
    outline-offset: 2px;
  }
</style>
