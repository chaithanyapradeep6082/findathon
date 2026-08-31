<script>
  let content = '';
  let expiryMinutes = 60;
  let viewLimit = 1;
  let burnAfterReading = false;
  let password = '';
  let resultLink = '';
  let error = '';

  async function handleCreate() {
    error = '';
    resultLink = '';

    try {
      const res = await fetch('http://localhost:5000/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          expiryMinutes: Number(expiryMinutes),
          viewLimit: Number(viewLimit),
          burnAfterReading,
          password: password || null
        })
      });

      if (!res.ok) throw new Error('Failed to create package');

      const data = await res.json();
      resultLink = `${window.location.origin}/?id=${data.id}`;
    } catch (err) {
      console.error(err);
    }
  }
</script>

<div>
  <h2>Create a Package</h2>

  <label>
    Message content
    <textarea bind:value={content} placeholder="Enter your secret message" rows="4"></textarea>
  </label>

  <label>
    Expires in (minutes)
    <input type="number" bind:value={expiryMinutes} min="1" />
  </label>

  <label>
    View limit
    <input type="number" bind:value={viewLimit} min="1" />
  </label>

  <label class="checkbox-row">
    <input type="checkbox" bind:checked={burnAfterReading} />
    Burn after reading (destroys after first view)
  </label>

  <label>
    Password (optional)
    <input type="password" bind:value={password} placeholder="Leave blank for no password" />
  </label>

  <button on:click={handleCreate}>Create Package</button>

  {#if resultLink}
    <div class="result">
      ✅ Package created! Share this link:
      <code>{resultLink}</code>
    </div>
  {/if}

  {#if error}
    <p class="error">{error}</p>
  {/if}
</div>

<style>
  div { display: flex; flex-direction: column; }
  label { display: flex; flex-direction: column; margin-bottom: 1rem; font-size: 0.9rem; gap: 0.3rem; }
  .checkbox-row { flex-direction: row; align-items: center; gap: 0.5rem; }
  input, textarea { padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.95rem; }
  button { padding: 0.7rem; background: #333; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; }
  button:hover { background: #555; }
  .result { margin-top: 1rem; padding: 0.75rem; background: #eef9ee; border-radius: 6px; word-break: break-all; }
  .error { color: red; margin-top: 0.5rem; }
</style>