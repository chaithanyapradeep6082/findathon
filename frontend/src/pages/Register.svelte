<script>
  import { api } from '../lib/api.js';
  import { setSession } from '../lib/auth.js';
  import { navigate } from '../lib/router.js';

  let email = '';
  let password = '';
  let error = '';
  let loading = false;

  async function submit() {
    error = '';
    loading = true;
    try {
      const data = await api.post('/auth/register', { email, password }, { auth: false });
      setSession(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="page-center">
  <form class="card stack" on:submit|preventDefault={submit}>
    <h2>Create an account</h2>
    <div class="field">
      <label for="email">Email</label>
      <input id="email" type="email" bind:value={email} required autocomplete="email" />
    </div>
    <div class="field">
      <label for="password">Password</label>
      <input id="password" type="password" bind:value={password} required minlength="8" autocomplete="new-password" />
      <p class="help-text">At least 8 characters.</p>
    </div>
    {#if error}<p class="error-text">{error}</p>{/if}
    <button type="submit" disabled={loading}>{loading ? 'Creating account…' : 'Sign up'}</button>
    <p class="help-text">Already have an account? <a href="#/login">Log in</a></p>
  </form>
</div>

<style>
  .page-center {
    display: flex;
    justify-content: center;
    padding: 4rem 1rem;
  }
  form { width: 100%; max-width: 380px; }
</style>
