<script>
  export let id;

  import { onMount } from 'svelte';
  import { api } from '../lib/api.js';
  import { navigate } from '../lib/router.js';
  import StatusBadge from '../components/StatusBadge.svelte';

  let status = null;
  let statusError = '';
  let loadingStatus = true;

  let password = '';
  let revealing = false;
  let revealError = '';
  let revealed = null;

  async function loadStatus() {
    loadingStatus = true;
    statusError = '';
    try {
      status = await api.get(`/received-packages/${id}`);
    } catch (err) {
      status = err.body?.state ? { state: err.body.state } : null;
      statusError = err.body?.state ? '' : err.message;
    } finally {
      loadingStatus = false;
    }
  }

  async function reveal() {
    revealing = true;
    revealError = '';
    try {
      revealed = await api.post(`/received-packages/${id}/access`, password ? { password } : {});
    } catch (err) {
      revealError = err.message;
      if (err.status === 423 || err.status === 410) await loadStatus();
    } finally {
      revealing = false;
    }
  }

  function downloadFile(file) {
    const byteChars = atob(file.data);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
    const blob = new Blob([bytes], { type: file.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  onMount(loadStatus);
</script>

<div class="page">
  <button class="secondary back-btn" on:click={() => navigate('/access')}>Back</button>

  <div class="card stack access-card">
    {#if loadingStatus}
      <p class="help-text">Checking package…</p>
    {:else if revealed}
      <h2>Package contents</h2>
      {#if revealed.message}
        <div class="message-box">{revealed.message}</div>
      {/if}
      {#if revealed.files?.length}
        <div class="stack">
          {#each revealed.files as file}
            <div class="row-between file-row">
              <span class="mono">{file.filename}</span>
              <button class="secondary" on:click={() => downloadFile(file)}>Download</button>
            </div>
          {/each}
        </div>
      {/if}
      <p class="help-text">This view has now been counted against the package's view limit.</p>
    {:else if status?.state && status.state !== 'ACTIVE'}
      <h2>Package unavailable</h2>
      <p><StatusBadge state={status.state} /></p>
      <p class="help-text">
        {#if status.state === 'BURNED'}This package has already been fully viewed and is gone.
        {:else if status.state === 'EXPIRED'}This package has expired.
        {:else if status.state === 'REVOKED'}The sender revoked this package.
        {:else if status.state === 'LOCKED'}Too many failed attempts locked this package.
        {/if}
      </p>
    {:else if statusError}
      <h2>Package unavailable</h2>
      <p class="error-text">{statusError}</p>
    {:else if status}
      <h2>{status.label || 'Secure package'}</h2>
      <p class="help-text">
        {status.viewsRemaining} view{status.viewsRemaining === 1 ? '' : 's'} remaining &middot;
        expires {new Date(status.expiresAt).toLocaleString()}
      </p>

      {#if status.requiresPassword}
        <div class="field">
          <label for="received-password">This package is password protected</label>
          <input id="received-password" type="password" bind:value={password} />
        </div>
      {/if}

      {#if revealError}<p class="error-text">{revealError}</p>{/if}

      <button on:click={reveal} disabled={revealing}>{revealing ? 'Opening…' : 'Reveal package'}</button>
      <p class="help-text">Opening this package counts as one view and can't be undone.</p>
    {/if}
  </div>
</div>

<style>
  .page { padding: 2rem; max-width: 480px; margin: 0 auto; }
  .back-btn { margin-bottom: 1.5rem; }
  .message-box {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 1em;
    white-space: pre-wrap;
  }
  .file-row {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.6em 1em;
  }
</style>
