import { authStore } from './auth.js';
import { get } from 'svelte/store';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request(path, { method = 'GET', body, isForm = false, auth = true } = {}) {
  const headers = {};
  if (!isForm) headers['Content-Type'] = 'application/json';

  if (auth) {
    const { token } = get(authStore);
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body (e.g. some error responses)
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed with status ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  postForm: (path, formData, opts) => request(path, { ...opts, method: 'POST', body: formData, isForm: true }),
};
