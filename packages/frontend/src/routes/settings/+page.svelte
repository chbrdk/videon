<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/config/environment';
  import { _, currentLocale, type Locale } from '$lib/i18n';
  import { MaterialSymbol, MsqdxFormField } from '$lib/components/ui';

  let user = {
    name: '',
    email: '',
    avatarUrl: '',
  };
  let isLoading = false;
  let isPasswordLoading = false;
  let message = '';

  let passwords = {
    current: '',
    new: '',
    confirm: '',
  };

  async function handleChangePassword() {
    if (passwords.new !== passwords.confirm) {
      message = _('settings.errorMatch');
      return;
    }
    if (passwords.new.length < 6) {
      message = _('settings.errorLength');
      return;
    }

    isPasswordLoading = true;
    message = '';

    try {
      const res = await fetch(`${api.baseUrl}/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        message = _('settings.successPassword');
        passwords = { current: '', new: '', confirm: '' };
      } else {
        message = 'Error: ' + data.message;
      }
    } catch (e) {
      message = _('settings.errorGeneric');
    } finally {
      isPasswordLoading = false;
    }
  }

  onMount(async () => {
    try {
      const res = await fetch(`${api.baseUrl}/auth/me`);
      const data = await res.json();
      if (data.isAuthenticated) {
        user = { ...user, ...data.user };
      }
    } catch (e) {
      console.error(e);
    }
  });

  async function handleLogout() {
    await fetch(`${api.baseUrl}/auth/logout`, { method: 'POST' });
    window.location.href = '/login';
  }

  async function handleSave() {
    isLoading = true;
    message = '';
    try {
      const res = await fetch(`${api.baseUrl}/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: user.name }),
      });
      const data = await res.json();
      if (res.ok) {
        message = _('settings.successSaved');
        user = { ...user, ...data.user };
      } else {
        message = 'Error: ' + data.message;
      }
    } catch (e) {
      message = _('settings.errorGeneric');
    } finally {
      isLoading = false;
    }
  }
  function setLanguage(lang: Locale) {
    currentLocale.set(lang);
  }
</script>

<div class="max-w-2xl mx-auto space-y-8 animate-fade-in p-4">
  <div class="glass-card p-6">
    <div class="space-y-6">
      <MsqdxFormField
        label={_('settings.email')}
        type="email"
        disabled={true}
        value={user.email}
        icon="mail"
        placeholder="your@email.com"
      />
      <p class="mt-1 text-xs text-white/40 ml-2">{_('settings.emailHelp')}</p>

      <MsqdxFormField
        label={_('settings.displayName')}
        type="text"
        bind:value={user.name}
        icon="person"
        placeholder="Your Name"
      />

      {#if message}
        <div
          class="p-3 rounded-lg text-sm {message.includes('Error') || message.includes('Fehler')
            ? 'bg-red-500/10 text-red-500 border border-red-500/20'
            : 'bg-green-500/10 text-green-500 border border-green-500/20'}"
        >
          {message}
        </div>
      {/if}

      <div class="flex items-center justify-between pt-6 border-t border-white/10">
        <button
          on:click={handleLogout}
          class="text-red-500 hover:text-red-400 text-sm font-medium transition-colors"
        >
          {_('settings.signOut')}
        </button>

        <button
          on:click={handleSave}
          disabled={isLoading}
          class="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
        >
          {isLoading ? _('settings.saving') : _('settings.saveProfile')}
        </button>
      </div>

      <!-- Language Section -->
      <div class="pt-8 mt-8 border-t border-white/10">
        <h3 class="text-lg font-medium text-white mb-4">
          {$currentLocale === 'en' ? 'App Language' : 'App-Sprache'}
        </h3>

        <div class="grid grid-cols-2 gap-4">
          <button
            on:click={() => setLanguage('de')}
            class="flex items-center justify-between p-4 rounded-xl border-2 transition-all {$currentLocale ===
            'de'
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-white/5 hover:border-white/20 bg-white/5'}"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">🇩🇪</span>
              <span class="font-medium text-white">Deutsch</span>
            </div>
            {#if $currentLocale === 'de'}
              <div class="text-blue-500">
                <MaterialSymbol icon="check_circle" filled />
              </div>
            {/if}
          </button>

          <button
            on:click={() => setLanguage('en')}
            class="flex items-center justify-between p-4 rounded-xl border-2 transition-all {$currentLocale ===
            'en'
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-white/5 hover:border-white/20 bg-white/5'}"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">🇺🇸</span>
              <span class="font-medium text-white">English</span>
            </div>
            {#if $currentLocale === 'en'}
              <div class="text-blue-500">
                <MaterialSymbol icon="check_circle" filled />
              </div>
            {/if}
          </button>
        </div>
      </div>

      <!-- Password Change Section -->
      <div class="pt-8 mt-8 border-t border-white/10">
        <h3 class="text-lg font-medium text-white mb-4">
          {_('settings.changePassword')}
        </h3>

        <div class="space-y-4">
          <MsqdxFormField
            label={_('settings.currentPassword')}
            type="password"
            bind:value={passwords.current}
            icon="lock"
            placeholder="••••••••"
          />

          <MsqdxFormField
            label={_('settings.newPassword')}
            type="password"
            bind:value={passwords.new}
            icon="lock_open"
            placeholder="••••••••"
          />

          <MsqdxFormField
            label={_('settings.confirmPassword')}
            type="password"
            bind:value={passwords.confirm}
            icon="verified_user"
            placeholder="••••••••"
          />

          <div class="flex justify-end pt-2">
            <button
              on:click={handleChangePassword}
              disabled={isPasswordLoading}
              class="px-6 py-2 border border-white/10 hover:bg-white/5 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
            >
              {isPasswordLoading ? _('settings.updating') : _('settings.updatePassword')}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
