// Lightweight client for auth endpoints used by the React frontend
// Provides: register, login, logout, getProfile, and helper HTTP methods

const TOKEN_KEY = 'token';

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch (e) {
    return {};
  }
}

async function postJSON(url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await parseJsonSafe(resp);
  if (!resp.ok) {
    throw new Error(data.error || `Request failed: ${resp.status}`);
  }
  return data;
}

async function getJSON(url, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const resp = await fetch(url, { headers });
  const data = await parseJsonSafe(resp);
  if (!resp.ok) throw new Error(data.error || `Request failed: ${resp.status}`);
  return data;
}

// Token helpers
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// API methods
export async function register({ fullName, username, email, password }) {
  // returns { token }
  return await postJSON('/auth/register', { fullName, username, email, password });
}

export async function login(identifier, password) {
  // Accept either email or username. If identifier contains '@' treat as email.
  const isEmail = typeof identifier === 'string' && identifier.includes('@');
  const body = isEmail ? { email: identifier, password } : { identifier, password };
  return await postJSON('/auth/login', body);
}

export async function getProfile(token) {
  // returns { user: { email, username, fullName, ... } }
  return await getJSON('/auth/me', token);
}

export function logout() {
  clearToken();
}

export default {
  postJSON,
  getJSON,
  register,
  login,
  getProfile,
  setToken,
  getToken,
  clearToken,
  logout,
};
