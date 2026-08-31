<script>
  import CreatePackage from './CreatePackage.svelte';
  import AccessPackage from './AccessPackage.svelte';

  // Simple view switcher — no router needed for a hackathon build
  let currentView = 'create'; // 'create' or 'access'

  // If someone opens a shared link (?id=xxx), jump straight to the access view
  const params = new URLSearchParams(window.location.search);
  if (params.get('id')) currentView = 'access';
</script>

<main>
  <h1>DeadDrop</h1>
  <p class="tagline">Ephemeral Secure File Exchange</p>

  <nav>
    <button
      class:active={currentView === 'create'}
      on:click={() => (currentView = 'create')}
    >
      Create Package
    </button>
    <button
      class:active={currentView === 'access'}
      on:click={() => (currentView = 'access')}
    >
      Access Package
    </button>
  </nav>

  {#if currentView === 'create'}
    <CreatePackage />
  {:else}
    <AccessPackage />
  {/if}
</main>

<style>
  main {
    max-width: 500px;
    margin: 0 auto;
    padding: 2rem 1rem;
    font-family: system-ui, sans-serif;
  }

  h1 {
    margin-bottom: 0;
    text-align: center;
  }

  .tagline {
    text-align: center;
    color: #666;
    margin-top: 0.25rem;
    margin-bottom: 1.5rem;
  }

  nav {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  nav button {
    flex: 1;
    padding: 0.6rem;
    border: 1px solid #ccc;
    background: #f5f5f5;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.95rem;
  }

  nav button.active {
    background: #333;
    color: white;
    border-color: #333;
  }
</style>