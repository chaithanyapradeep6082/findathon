<script>
  import { api } from '../lib/api.js';
  import { navigate } from '../lib/router.js';

  let label = '';
  let message = '';
  let files = null;
  let maxViews = 1;
  let expiresInMinutes = 60;
  let password = '';
  let recipientEmail = '';
  let maxFailedAttempts = 5;

  let submitting = false;
  let error = '';
  let result = null; // { accessToken, expiresAt }

  function shareLink(token) {
    return `${window.location.origin}${window.location.pathname}#/access/${token}`;
  }

  async function submit() {
    error = '';
    if (!message && (!files || files.length === 0)) {
      error = 'Add a message, at least one file, or both.';
      return;
    }
    submitting = true;
    try {
      const form = new FormData();
      if (label) form.append('label', label);
      if (message) form.append('message', message);
      form.append('maxViews', maxViews);
      form.append('expiresInMinutes', expiresInMinutes);
      form.append('maxFailedAttempts', maxFailedAttempts);
      if (password) form.append('password', password);
      if (recipientEmail) form.append('recipientEmail', recipientEmail);
      if (files) for (const f of files) form.append('files', f);

      result = await api.postForm('/packages', form);
    } catch (err) {
      error = err.message;
    } finally {
      submitting = false;
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareLink(result.accessToken));
  }
</script>

<div class="page">
  <h1>New package</h1>

  {#if result}
    <div class="card stack">
      <h2>Package created</h2>
      <p>This link is shown once. Copy it now — it can't be retrieved again.</p>
      <div class="link-box mono">{shareLink(result.accessToken)}</div>
      <div class="row">
        <button on:click={copyLink}>Copy link</button>
        <button class="secondary" on:click={() => navigate('/dashboard')}>Back to packages</button>
      </div>
    </div>
  {:else}
    <form class="card stack" on:submit|preventDefault={submit}>
      <div class="field">
        <label for="label">Label (private, only you see this)</label>
        <input id="label" bind:value={label} placeholder="e.g. Q3 contract for Jordan" />
      </div>

      <div class="field">
        <label for="message">Message</label>
        <textarea id="message" rows="4" bind:value={message} placeholder="Optional text to include"></textarea>
      </div>

      <div class="field">
        <label for="files">Files</label>
        <input id="files" type="file" multiple on:change={(e) => (files = e.target.files)} />
      </div>

      <div class="grid-2">
        <div class="field">
          <label for="maxViews">Max views (1 = burn after reading)</label>
          <input id="maxViews" type="number" min="1" bind:value={maxViews} />
        </div>
        <div class="field">
          <label for="expiresInMinutes">Expires in (minutes)</label>
          <input id="expiresInMinutes" type="number" min="1" bind:value={expiresInMinutes} />
        </div>
      </div>

      <div class="grid-2">
        <div class="field">
          <label for="password">Password (optional)</label>
          <input id="password" type="password" bind:value={password} />
        </div>
        <div class="field">
          <label for="maxFailedAttempts">Lock after failed attempts</label>
          <input id="maxFailedAttempts" type="number" min="1" bind:value={maxFailedAttempts} />
        </div>
      </div>

      <div class="field">
        <label for="recipientEmail">Recipient email (optional, informational)</label>
        <input id="recipientEmail" type="email" bind:value={recipientEmail} />
      </div>

      {#if error}<p class="error-text">{error}</p>{/if}

      <div class="row">
        <button type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create package'}</button>
        <button type="button" class="secondary" on:click={() => navigate('/dashboard')}>Cancel</button>
      </div>
    </form>
  {/if}
</div>

<style>
  .page { padding: 2rem; max-width: 640px; margin: 0 auto; }
  form { padding: 1.5rem 1.75rem; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .link-box {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.75em 1em;
    word-break: break-all;
  }
</style>
