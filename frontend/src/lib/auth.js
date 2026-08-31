import { writable } from 'svelte/store';

function loadInitial() {
  try {
    const raw = localStorage.getItem('deaddrop.auth');
    return raw ? JSON.parse(raw) : { token: null, user: null };
  } catch {
    return { token: null, user: null };
  }
}

export const authStore = writable(loadInitial());

authStore.subscribe((value) => {
  try {
    localStorage.setItem('deaddrop.auth', JSON.stringify(value));
  } catch {
    // ignore storage failures (e.g. private browsing)
  }
});

export function setSession(token, user) {
  authStore.set({ token, user });
}

export function clearSession() {
  authStore.set({ token: null, user: null });
}
