<script>
  import { onMount } from 'svelte';
  import { api } from '../lib/api.js';
  import StatusBadge from '../components/StatusBadge.svelte';
  import Pagination from '../components/Pagination.svelte';

  const tabs = ['Packages', 'Users', 'Attempts', 'Audit log'];
  let activeTab = 'Packages';

  let items = [];
  let total = 0;
  let page = 1;
  const limit = 15;
  let loading = true;
  let error = '';

  // filters, one set reused across tabs (only relevant ones are read per tab)
  let search = '';
  let stateFilter = '';
  let outcomeFilter = '';
  let actionFilter = '';

  async function load() {
    loading = true;
    error = '';
    page; // reactive dep
    try {
      const params = new URLSearchParams({ page, limit });
      let path;
      if (activeTab === 'Packages') {
        if (stateFilter) params.set('state', stateFilter);
        if (search) params.set('search', search);
        path = `/admin/packages?${params}`;
      } else if (activeTab === 'Users') {
        if (search) params.set('search', search);
        path = `/admin/users?${params}`;
      } else if (activeTab === 'Attempts') {
        if (outcomeFilter) params.set('outcome', outcomeFilter);
        path = `/admin/attempts?${params}`;
      } else {
        if (actionFilter) params.set('action', actionFilter);
        path = `/admin/audit-logs?${params}`;
      }
      const data = await api.get(path);
      items = data.items;
      total = data.total;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function selectTab(tab) {
    activeTab = tab;
    page = 1;
    search = '';
    stateFilter = '';
    outcomeFilter = '';
    actionFilter = '';
    load();
  }

  async function toggleLock(user) {
    try {
      await api.patch(`/admin/users/${user._id}`, { isLocked: !user.isLocked });
      await load();
    } catch (err) {
      alert(err.message);
    }
  }

  onMount(load);
  $: page, load();
</script>

<div class="page">
  <h1>Admin</h1>

  <div class="row tabs">
    {#each tabs as tab}
      <button class={activeTab === tab ? '' : 'secondary'} on:click={() => selectTab(tab)}>{tab}</button>
    {/each}
  </div>

  <div class="row filter-row">
    {#if activeTab === 'Packages'}
      <input placeholder="Search by label…" bind:value={search} on:change={() => { page = 1; load(); }} />
      <select bind:value={stateFilter} on:change={() => { page = 1; load(); }}>
        <option value="">All states</option>
        <option value="ACTIVE">Active</option>
        <option value="BURNED">Burned</option>
        <option value="EXPIRED">Expired</option>
        <option value="REVOKED">Revoked</option>
        <option value="LOCKED">Locked</option>
      </select>
    {:else if activeTab === 'Users'}
      <input placeholder="Search by email…" bind:value={search} on:change={() => { page = 1; load(); }} />
    {:else if activeTab === 'Attempts'}
      <select bind:value={outcomeFilter} on:change={() => { page = 1; load(); }}>
        <option value="">All outcomes</option>
        <option value="SUCCESS">Success</option>
        <option value="WRONG_PASSWORD">Wrong password</option>
        <option value="EXPIRED">Expired</option>
        <option value="LOCKED">Locked</option>
        <option value="REVOKED">Revoked</option>
        <option value="NOT_FOUND">Not found</option>
        <option value="VIEW_LIMIT_REACHED">View limit reached</option>
      </select>
    {:else}
      <input placeholder="Filter by action, e.g. PACKAGE_REVOKED" bind:value={actionFilter} on:change={() => { page = 1; load(); }} />
    {/if}
  </div>

  {#if loading}
    <p class="help-text">Loading…</p>
  {:else if error}
    <p class="error-text">{error}</p>
  {:else}
    <div class="card">
      <table>
        {#if activeTab === 'Packages'}
          <thead><tr><th>Label</th><th>Owner</th><th>State</th><th>Views</th><th>Expires</th></tr></thead>
          <tbody>
            {#each items as pkg}
              <tr>
                <td>{pkg.label || '—'}</td>
                <td>{pkg.ownerId?.email || '—'}</td>
                <td><StatusBadge state={pkg.state} /></td>
                <td class="mono">{pkg.currentViews} / {pkg.maxViews}</td>
                <td class="mono">{new Date(pkg.expiresAt).toLocaleString()}</td>
              </tr>
            {/each}
          </tbody>
        {:else if activeTab === 'Users'}
          <thead><tr><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {#each items as user}
              <tr>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.isLocked ? 'Locked' : 'Active'}</td>
                <td>
                  <button class="secondary" on:click={() => toggleLock(user)}>
                    {user.isLocked ? 'Unlock' : 'Lock'}
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        {:else if activeTab === 'Attempts'}
          <thead><tr><th>Time</th><th>Outcome</th><th>IP</th><th>Package</th></tr></thead>
          <tbody>
            {#each items as attempt}
              <tr>
                <td class="mono">{new Date(attempt.attemptedAt).toLocaleString()}</td>
                <td>{attempt.outcome}</td>
                <td class="mono">{attempt.ipAddress || '—'}</td>
                <td class="mono">{attempt.packageId}</td>
              </tr>
            {/each}
          </tbody>
        {:else}
          <thead><tr><th>Time</th><th>Action</th><th>Actor</th><th>Target</th></tr></thead>
          <tbody>
            {#each items as log}
              <tr>
                <td class="mono">{new Date(log.timestamp).toLocaleString()}</td>
                <td>{log.action}</td>
                <td>{log.actorId?.email || log.actorRole}</td>
                <td class="mono">{log.targetType}:{log.targetId}</td>
              </tr>
            {/each}
          </tbody>
        {/if}
      </table>
      {#if items.length === 0}<p class="help-text" style="padding:1rem 0 0;">No results.</p>{/if}
    </div>
    <Pagination {page} {limit} {total} on:change={(e) => (page = e.detail)} />
  {/if}
</div>

<style>
  .page { padding: 2rem; max-width: 1000px; margin: 0 auto; }
  .tabs { margin: 1rem 0; }
  .filter-row { margin-bottom: 1rem; }
  .filter-row input, .filter-row select { width: auto; min-width: 220px; }
</style>
