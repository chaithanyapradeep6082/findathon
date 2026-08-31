<script>
  import { onMount } from 'svelte';
  import { api } from '../lib/api.js';
  import { navigate } from '../lib/router.js';
  import StatusBadge from '../components/StatusBadge.svelte';
  import Pagination from '../components/Pagination.svelte';

  let items = [];
  let total = 0;
  let page = 1;
  const limit = 10;
  let stateFilter = '';
  let loading = true;
  let error = '';

  async function load() {
    loading = true;
    error = '';
    try {
      const params = new URLSearchParams({ page, limit });
      if (stateFilter) params.set('state', stateFilter);
      const data = await api.get(`/packages?${params}`);
      items = data.items;
      total = data.total;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function revoke(id) {
    if (!confirm('Revoke this package? Recipients will no longer be able to access it.')) return;
    try {
      await api.post(`/packages/${id}/revoke`);
      await load();
    } catch (err) {
      alert(err.message);
    }
  }

  onMount(load);
  $: stateFilter, page, load();
</script>

<div class="page">
  <div class="row-between">
    <h1>Your packages</h1>
    <div class="row">
      <button class="secondary" on:click={() => navigate('/access')}>Access package</button>
      <button on:click={() => navigate('/dashboard/new')}>Send package</button>
    </div>
  </div>

  <div class="row filter-row">
    <label for="state-filter" class="visually-hidden">Filter by state</label>
    <select id="state-filter" bind:value={stateFilter}>
      <option value="">All states</option>
      <option value="ACTIVE">Active</option>
      <option value="BURNED">Burned</option>
      <option value="EXPIRED">Expired</option>
      <option value="REVOKED">Revoked</option>
      <option value="LOCKED">Locked</option>
    </select>
  </div>

  {#if loading}
    <p class="help-text">Loading…</p>
  {:else if error}
    <p class="error-text">{error}</p>
  {:else if items.length === 0}
    <div class="card">
      <p>No packages yet. Create one to get a shareable link.</p>
    </div>
  {:else}
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Label</th>
            <th>State</th>
            <th>Views</th>
            <th>Expires</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each items as pkg}
            <tr>
              <td>{pkg.label || '—'}</td>
              <td><StatusBadge state={pkg.state} /></td>
              <td class="mono">{pkg.currentViews} / {pkg.maxViews}</td>
              <td class="mono">{new Date(pkg.expiresAt).toLocaleString()}</td>
              <td>
                {#if pkg.state === 'ACTIVE'}
                  <button class="secondary" on:click={() => revoke(pkg._id)}>Revoke</button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <Pagination {page} {limit} {total} on:change={(e) => (page = e.detail)} />
  {/if}
</div>

<style>
  .page { padding: 2rem; max-width: 900px; margin: 0 auto; }
  .filter-row { margin: 1rem 0; }
  select { width: auto; }
  .visually-hidden {
    position: absolute; width: 1px; height: 1px; overflow: hidden;
    clip: rect(0 0 0 0); white-space: nowrap;
  }
</style>
