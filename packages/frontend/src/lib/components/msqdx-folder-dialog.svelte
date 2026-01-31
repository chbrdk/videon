<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { _ } from '$lib/i18n';

  let {
    open = false,
    mode = 'create',
    initialName = '',
    className = '',
    title = '',
    label = '',
    onconfirm = null as ((data: { name: string }) => void) | null,
    oncancel = null as (() => void) | null,
  } = $props();

  const dispatch = createEventDispatcher();

  let name = $state(initialName);
  let dialogElement: HTMLDialogElement | undefined = $state();
  let nameInput: HTMLInputElement | undefined = $state();

  // Handle dialog open/close
  $effect(() => {
    if (open && dialogElement) {
      dialogElement.showModal();
      name = initialName;
      setTimeout(() => {
        if (nameInput) {
          nameInput.focus();
          nameInput.select();
        }
      }, 100);
    } else if (!open && dialogElement) {
      dialogElement.close();
    }
  });

  function handleSubmit() {
    if (name.trim()) {
      const data = { name: name.trim() };
      dispatch('confirm', data);
      if (onconfirm) onconfirm(data);
    }
  }

  function handleCancel() {
    dispatch('cancel');
    if (oncancel) oncancel();
  }

  function handleKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  }

  // Derived values for display
  let displayTitle = $derived(
    title || (mode === 'create' ? _('folder.create') : _('folder.rename'))
  );
  let displayLabel = $derived(label || _('folder.name'));
</script>

<dialog bind:this={dialogElement} class="folder-dialog {className}" onclose={handleCancel}>
  <div class="dialog-content glass-card">
    <h2 class="dialog-title">
      {displayTitle}
    </h2>

    <div class="dialog-body">
      <label for="folder-name" class="input-label">{displayLabel}</label>
      <input
        id="folder-name"
        bind:this={nameInput}
        bind:value={name}
        onkeydown={handleKeydown}
        placeholder={_('folder.namePlaceholder')}
        class="name-input"
        maxlength="100"
      />
    </div>

    <div class="dialog-actions">
      <button class="glass-button secondary" onclick={handleCancel} type="button">
        {_('actions.cancel')}
      </button>
      <button
        class="glass-button primary"
        onclick={handleSubmit}
        type="submit"
        disabled={!name.trim()}
      >
        {mode === 'create' ? _('actions.create') : _('actions.save')}
      </button>
    </div>
  </div>
</dialog>

<style>
  .folder-dialog {
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    border: none;
    border-radius: 16px;
    padding: 0;
    max-width: 90vw;
    width: 400px;
    box-shadow: 0 16px 64px rgba(0, 0, 0, 0.3);
  }

  .folder-dialog::backdrop {
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
  }

  .dialog-content {
    padding: 24px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 16px;
  }

  .dialog-title {
    margin: 0 0 20px 0;
    font-size: 20px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.9);
  }

  html.dark .dialog-title {
    color: rgba(255, 255, 255, 0.9);
  }

  .dialog-body {
    margin-bottom: 24px;
  }

  .input-label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.8);
  }

  html.dark .input-label {
    color: rgba(255, 255, 255, 0.8);
  }

  .name-input {
    width: 100%;
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    color: rgba(0, 0, 0, 0.9);
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
    box-sizing: border-box;
  }

  html.dark .name-input {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.9);
  }

  .name-input::placeholder {
    color: rgba(0, 0, 0, 0.5);
  }

  html.dark .name-input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  .name-input:focus {
    outline: none;
    background: rgba(0, 0, 0, 0.08);
    border-color: rgba(0, 0, 0, 0.2);
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
  }

  html.dark .name-input:focus {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
  }

  .dialog-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .glass-button {
    padding: 12px 24px;
    background: rgba(0, 0, 0, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    color: rgba(0, 0, 0, 0.9);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 100px;
  }

  html.dark .glass-button {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.9);
  }

  .glass-button:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.08);
    border-color: rgba(0, 0, 0, 0.2);
  }

  html.dark .glass-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .glass-button:focus {
    outline: 2px solid rgba(0, 0, 0, 0.3);
    outline-offset: 2px;
  }

  html.dark .glass-button:focus {
    outline: 2px solid rgba(255, 255, 255, 0.3);
  }

  .glass-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .glass-button.primary {
    background: rgba(76, 175, 80, 0.8);
    border-color: rgba(76, 175, 80, 1);
    color: white;
  }

  .glass-button.primary:hover:not(:disabled) {
    background: rgba(76, 175, 80, 0.9);
  }

  .glass-button.secondary {
    background: rgba(0, 0, 0, 0.02);
    border-color: rgba(0, 0, 0, 0.05);
  }

  .glass-button.secondary:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.05);
    border-color: rgba(0, 0, 0, 0.1);
  }

  html.dark .glass-button.secondary {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }

  html.dark .glass-button.secondary:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }
</style>
