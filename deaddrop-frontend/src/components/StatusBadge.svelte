<script>
  export let state = 'ACTIVE';

  const styles = {
    ACTIVE: { bg: 'rgba(69, 196, 176, 0.12)', color: 'var(--accent)', border: 'rgba(69, 196, 176, 0.35)' },
    BURNED: { bg: 'rgba(139, 147, 163, 0.12)', color: 'var(--text-dim)', border: 'var(--border)' },
    EXPIRED: { bg: 'rgba(139, 147, 163, 0.12)', color: 'var(--text-dim)', border: 'var(--border)' },
    REVOKED: { bg: 'rgba(217, 164, 65, 0.12)', color: 'var(--warn)', border: 'rgba(217, 164, 65, 0.35)' },
    LOCKED: { bg: 'rgba(224, 96, 90, 0.12)', color: 'var(--danger)', border: 'rgba(224, 96, 90, 0.35)' },
  };

  $: style = styles[state] || styles.ACTIVE;
</script>

<span class="badge" style="background:{style.bg}; color:{style.color}; border-color:{style.border}">
  {state}
</span>
