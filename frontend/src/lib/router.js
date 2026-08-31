import { writable } from 'svelte/store';

function currentHash() {
  return window.location.hash.slice(1) || '/login';
}

export const route = writable(currentHash());

window.addEventListener('hashchange', () => route.set(currentHash()));

export function navigate(path) {
  window.location.hash = path;
}

// Parses a route into { name, params } against a set of simple patterns
// like '/access/:token'. Good enough for this app's small route table.
export function matchRoute(path, pattern) {
  const pathParts = path.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);
  if (pathParts.length !== patternParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}
