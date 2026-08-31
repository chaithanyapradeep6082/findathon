<script>
  import { route, matchRoute, navigate } from './lib/router.js';
  import { authStore } from './lib/auth.js';
  import NavBar from './components/NavBar.svelte';

  import Login from './pages/Login.svelte';
  import Register from './pages/Register.svelte';
  import Dashboard from './pages/Dashboard.svelte';
  import CreatePackage from './pages/CreatePackage.svelte';
  import AccessPackage from './pages/AccessPackage.svelte';
  import ReceivedAccess from './pages/ReceivedAccess.svelte';
  import Access from './pages/Access.svelte';
  import Admin from './pages/Admin.svelte';

  const PUBLIC_ROUTES = ['/login', '/register'];

  $: isAccessRoute = $route.startsWith('/access/');
  $: isPublic = PUBLIC_ROUTES.includes($route) || isAccessRoute;

  // Route guard: bounce unauthenticated users to /login except on public routes.
  $: if (!isPublic && !$authStore.token) {
    navigate('/login');
  }

  $: if (($route === '/login' || $route === '/register') && $authStore.token) {
    navigate('/dashboard');
  }

  $: accessParams = matchRoute($route, '/access/:token');
  $: receivedParams = matchRoute($route, '/received/:id');
</script>

{#if !isAccessRoute}
  <NavBar />
{/if}

<main>
  {#if $route === '/login'}
    <Login />
  {:else if $route === '/register'}
    <Register />
  {:else if $route === '/dashboard'}
    <Dashboard />
  {:else if $route === '/dashboard/new'}
    <CreatePackage />
  {:else if $route === '/access'}
    <AccessPackage />
  {:else if receivedParams}
    <ReceivedAccess id={receivedParams.id} />
  {:else if accessParams}
    <Access token={accessParams.token} />
  {:else if $route === '/admin'}
    <Admin />
  {:else}
    <div class="page-center">
      <p class="help-text">Page not found.</p>
    </div>
  {/if}
</main>

<style>
  .page-center { display: flex; justify-content: center; padding: 4rem 1rem; }
</style>
