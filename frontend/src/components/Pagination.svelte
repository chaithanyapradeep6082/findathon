<script>
  export let page = 1;
  export let limit = 20;
  export let total = 0;

  $: totalPages = Math.max(1, Math.ceil(total / limit));

  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  function go(p) {
    if (p < 1 || p > totalPages) return;
    dispatch('change', p);
  }
</script>

<div class="row pagination">
  <button class="secondary" disabled={page <= 1} on:click={() => go(page - 1)}>Previous</button>
  <span class="help-text">Page {page} of {totalPages} &middot; {total} total</span>
  <button class="secondary" disabled={page >= totalPages} on:click={() => go(page + 1)}>Next</button>
</div>

<style>
  .pagination { justify-content: flex-start; margin-top: 1rem; }
</style>
