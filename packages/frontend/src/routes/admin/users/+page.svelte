<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { api } from '$lib/config/environment';
  import { MaterialSymbol, MsqdxButton, MsqdxFormField } from '$lib/components/ui';
  import MsqdxGlassCard from '$lib/components/ui/MsqdxGlassCard.svelte';
  import { MSQDX_COLORS, MSQDX_TYPOGRAPHY } from '$lib/design-tokens';
  import MsqdxSpinner from '$lib/components/ui/MsqdxSpinner.svelte';

  let users: any[] = [];
  let loading = true;
  let showCreateDialog = false;

  // Create User Form State
  let newUser = {
    email: '',
    password: '',
    name: '',
    role: 'USER',
  };
  let creating = false;
  let error: string | null = null;

  onMount(loadUsers);

  async function loadUsers() {
    loading = true;
    try {
      const res = await fetch(`${api.baseUrl}/users`);
      if (res.ok) {
        users = await res.json();
      } else {
        console.error('Failed to fetch users');
      }
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.'))
      return;
    try {
      const res = await fetch(`${api.baseUrl}/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        users = users.filter(u => u.id !== id);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete user');
      }
    } catch (e) {
      console.error(e);
      alert('Network error deleting user');
    }
  }

  async function handleCreate() {
    if (!newUser.email || !newUser.password || !newUser.name) return;
    creating = true;
    error = null;
    try {
      const res = await fetch(`${api.baseUrl}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      const data = await res.json();

      if (res.ok) {
        users = [data, ...users];
        showCreateDialog = false;
        newUser = { email: '', password: '', name: '', role: 'USER' };
      } else {
        error = data.error || 'Failed to create user';
      }
    } catch (e: any) {
      error = e.message;
    } finally {
      creating = false;
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex justify-between items-center">
    <div>
      <h2
        style="font-family: {MSQDX_TYPOGRAPHY.fontFamily.primary}; font-weight: {MSQDX_TYPOGRAPHY
          .fontWeight.bold}; font-size: {MSQDX_TYPOGRAPHY.fontSize['xl']}; color: {MSQDX_COLORS.dark
          .textPrimary};"
      >
        User Management
      </h2>
      <p style="color: {MSQDX_COLORS.dark.textSecondary};">Manage user access and roles</p>
    </div>
    <MsqdxButton variant="primary" on:click={() => (showCreateDialog = true)}>
      <div class="flex items-center gap-2">
        <MaterialSymbol icon="person_add" fontSize={20} />
        Add User
      </div>
    </MsqdxButton>
  </div>

  <!-- User List -->
  {#if loading}
    <div class="flex justify-center p-12">
      <MsqdxSpinner />
    </div>
  {:else}
    <div class="grid gap-4">
      {#each users as user (user.id)}
        <MsqdxGlassCard className="p-4 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div
              class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/80 font-bold"
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div class="font-medium text-white">{user.name}</div>
              <div class="text-sm text-white/50">{user.email}</div>
            </div>
            <div
              class="px-2 py-0.5 rounded text-xs font-medium border"
              style="
                   background-color: {user.role === 'ADMIN'
                ? 'rgba(234, 88, 12, 0.2)'
                : 'rgba(255, 255, 255, 0.1)'};
                   border-color: {user.role === 'ADMIN'
                ? MSQDX_COLORS.brand.orange
                : 'transparent'};
                   color: {user.role === 'ADMIN'
                ? MSQDX_COLORS.brand.orange
                : 'rgba(255, 255, 255, 0.7)'};
                 "
            >
              {user.role}
            </div>
          </div>

          <div class="flex gap-2">
            <button
              class="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-red-400 transition-colors"
              title="Delete User"
              on:click={() => handleDelete(user.id)}
            >
              <MaterialSymbol icon="delete" fontSize={20} />
            </button>
          </div>
        </MsqdxGlassCard>
      {/each}

      {#if users.length === 0}
        <div class="text-center p-8 text-white/50">No users found.</div>
      {/if}
    </div>
  {/if}

  <!-- Create Dialog -->
  {#if showCreateDialog}
    <div
      role="button"
      tabindex="0"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm focus:outline-none"
      transition:fade
      on:click|self={() => (showCreateDialog = false)}
      on:keydown={e => e.key === 'Escape' && (showCreateDialog = false)}
    >
      <div class="w-full max-w-md cursor-default">
        <MsqdxGlassCard variant="default" borderRadiusVariant="xl" className="p-6 space-y-4">
          <h3 class="text-xl font-bold text-white mb-4">Create New User</h3>

          {#if error}
            <div class="p-3 bg-red-500/20 border border-red-500 text-red-100 rounded text-sm mb-4">
              {error}
            </div>
          {/if}

          <form on:submit|preventDefault={handleCreate} class="space-y-4">
            <MsqdxFormField
              label="Full Name"
              type="text"
              required
              bind:value={newUser.name}
              placeholder="e.g. John Doe"
            />

            <MsqdxFormField
              label="Email Address"
              type="email"
              required
              bind:value={newUser.email}
              placeholder="john@example.com"
            />

            <MsqdxFormField
              label="Password"
              type="password"
              required
              bind:value={newUser.password}
              placeholder="••••••••"
            />

            <div class="space-y-1">
              <label for="role-select" class="block text-sm font-medium text-white/80">Role</label>
              <select
                id="role-select"
                bind:value={newUser.role}
                class="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-white/30"
              >
                <option value="USER" class="bg-gray-800">User</option>
                <option value="ADMIN" class="bg-gray-800">Admin</option>
              </select>
            </div>

            <div class="flex justify-end gap-3 mt-6">
              <MsqdxButton
                type="button"
                variant="ghost"
                on:click={() => (showCreateDialog = false)}
              >
                Cancel
              </MsqdxButton>
              <MsqdxButton type="submit" variant="primary" loading={creating} disabled={creating}>
                Create User
              </MsqdxButton>
            </div>
          </form>
        </MsqdxGlassCard>
      </div>
    </div>
  {/if}
</div>
