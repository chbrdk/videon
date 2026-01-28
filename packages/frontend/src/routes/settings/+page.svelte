<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/config/environment';

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
      message = 'Error: New passwords do not match';
      return;
    }
    if (passwords.new.length < 6) {
      message = 'Error: Password must be at least 6 characters';
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
        message = 'Password updated successfully';
        passwords = { current: '', new: '', confirm: '' };
      } else {
        message = 'Error: ' + data.message;
      }
    } catch (e) {
      message = 'An error occurred while updating password';
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
        message = 'Settings saved successfully!';
        user = { ...user, ...data.user };
      } else {
        message = 'Error: ' + data.message;
      }
    } catch (e) {
      message = 'An error occurred';
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="max-w-2xl mx-auto space-y-8 animate-fade-in">
  <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
    <h2 class="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">User Settings</h2>

    <div class="space-y-6">
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >Email</label
        >
        <input
          type="email"
          id="email"
          disabled
          value={user.email}
          class="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 cursor-not-allowed text-gray-500"
        />
        <p class="mt-1 text-xs text-gray-500">Email cannot be changed.</p>
      </div>

      <div>
        <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >Display Name</label
        >
        <input
          type="text"
          id="name"
          bind:value={user.name}
          class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 text-gray-900 dark:text-white"
        />
      </div>

      {#if message}
        <div
          class="p-3 rounded-md text-sm {message.includes('Error')
            ? 'bg-red-100 text-red-700'
            : 'bg-green-100 text-green-700'}"
        >
          {message}
        </div>
      {/if}

      <div
        class="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700"
      >
        <button on:click={handleLogout} class="text-red-600 hover:text-red-800 text-sm font-medium">
          Sign out
        </button>

        <button
          on:click={handleSave}
          disabled={isLoading}
          class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      <!-- Password Change Section -->
      <div class="pt-8 mt-8 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Change Password</h3>

        <div class="space-y-4">
          <div>
            <label
              for="currentPassword"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Current Password</label
            >
            <input
              type="password"
              id="currentPassword"
              bind:value={passwords.current}
              class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label
              for="newPassword"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label
            >
            <input
              type="password"
              id="newPassword"
              bind:value={passwords.new}
              class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label
              for="confirmPassword"
              class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >Confirm New Password</label
            >
            <input
              type="password"
              id="confirmPassword"
              bind:value={passwords.confirm}
              class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 text-gray-900 dark:text-white"
            />
          </div>

          <div class="flex justify-end">
            <button
              on:click={handleChangePassword}
              disabled={isPasswordLoading}
              class="inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isPasswordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
