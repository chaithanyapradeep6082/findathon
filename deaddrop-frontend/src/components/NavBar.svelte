<script>
  import { authStore, clearSession } from '../lib/auth.js';
  import { navigate } from '../lib/router.js';

  function logout() {
    clearSession();
    navigate('/login');
  }
</script>

<nav class="row-between">
  <a class="brand" href="#/dashboard">DeadDrop</a>
  <div class="row">
    {#if $authStore.token}
      <a href="#/dashboard">Packages</a>
      {#if $authStore.user?.role === 'ADMIN'}
        <a href="#/admin">Admin</a>
      {/if}
      <span class="help-text">{$authStore.user?.email}</span>
      <button class="secondary" on:click={logout}>Log out</button>
    {:else}
      <a href="#/login">Log in</a>
      <a href="#/register">Sign up</a>
    {/if}
  </div>
</nav>

<style>
  nav {
    padding: 1rem 2rem;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
  .brand {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 1.15rem;
    color: var(--text);
  }
  .brand:hover { text-decoration: none; color: var(--accent); }
  nav a { color: var(--text-dim); }
  nav a:hover { color: var(--text); text-decoration: none; }
</style>
