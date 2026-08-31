<script>
  import { onMount } from 'svelte';
  import { api } from '../lib/api.js';
  import { navigate } from '../lib/router.js';
  import StatusBadge from '../components/StatusBadge.svelte';
  import Pagination from '../components/Pagination.svelte';

  // --- Paste-a-link/token lookup ---
  let pasted = '';
  let lookupError = '';

  function extractToken(input) {
    const trimmed = input.trim();
    // Accept a full share link (…#/access/<token>) or a bare token.
    const match = trimmed.match(/#\/access\/([a-f0-9]+)\s*$/i);
    if (match) return match[1];
    if (/^[a-f0-9]{16,}$/i.test(trimmed)) return trimmed;
    return null;
  }

  function openPasted() {
    lookupError = '';
    const token = extractToken(pasted);
    if (!token) {
      lookupError = 'Paste the full share link or the access code exactly as you received it.';
      return;
    }
    navigate(`/access/${token}`);
  }

  // --- Packages sent to my account (matched by recipient email) ---
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
      const data = await api.get(`/received-packages?${params}`);
      items = data.items;
      total = data.total;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  onMount(load);
  $: stateFilter, page, load();
</script>

<div class="page">
  <div class="row-between">
    <h1>Access a package</h1>
    <button class="secondary" on:click={() => navigate('/dashboard')}>Back to your packages</button>
  </div>

  <div class="card stack lookup-card">
    <h2>Have a link or code?</h2>
    <p class="help-text">Paste the share link a sender gave you, or just the access code.</p>
    <div class="row">
      <input
        placeholder="https://…/#/access/… or the raw code"
        bind:value={pasted}
        on:keydown={(e) => e.key === 'Enter' && openPasted()}
      />
      <button on:click={openPasted}>Open</button>
    </div>
    {#if lookupError}<p class="error-text">{lookupError}</p>{/if}
  </div>

  <h2 class="section-heading">Sent to your account</h2>
  <p class="help-text">Packages a sender addressed directly to your email — no link needed.</p>

  <div class="row filter-row">
    <select bind:value={stateFilter}>
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
      <p>Nothing here yet. Packages addressed to your email will show up in this list.</p>
    </div>
  {:else}
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>From</th>
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
              <td>{pkg.ownerId?.email || '—'}</td>
              <td>{pkg.label || '—'}</td>
              <td><StatusBadge state={pkg.state} /></td>
              <td class="mono">{pkg.currentViews} / {pkg.maxViews}</td>
              <td class="mono">{new Date(pkg.expiresAt).toLocaleString()}</td>
              <td>
                {#if pkg.state === 'ACTIVE'}
                  <button class="secondary" on:click={() => navigate(`/received/${pkg._id}`)}>View</button>
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
  .lookup-card { margin: 1.5rem 0 2rem; }
  .lookup-card .row input { flex: 1; }
  .section-heading { margin-top: 0; }
  .filter-row { margin: 1rem 0; }
  select { width: auto; }
</style>
