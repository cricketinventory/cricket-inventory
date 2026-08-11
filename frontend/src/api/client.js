const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // no body
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  me: (token) => request('/auth/me', { token }),
  changePassword: (token, currentPassword, newPassword) =>
    request('/auth/change-password', { method: 'POST', token, body: { currentPassword, newPassword } }),

  listUsers: (token) => request('/users', { token }),
  createUser: (token, payload) => request('/users', { method: 'POST', token, body: payload }),
  setUserActive: (token, id, active) =>
    request(`/users/${id}/active`, { method: 'PATCH', token, body: { active } }),
  resetUserPassword: (token, id, newPassword) =>
    request(`/users/${id}/reset-password`, { method: 'POST', token, body: { newPassword } }),
  deleteUser: (token, id) => request(`/users/${id}`, { method: 'DELETE', token }),

  listItems: (token, { status, userId } = {}) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (userId) params.set('user_id', userId);
    const qs = params.toString();
    return request(`/items${qs ? `?${qs}` : ''}`, { token });
  },
  listAllItems: (token) => request('/items/all', { token }),
  createItem: (token, payload, userId) =>
    request(`/items${userId ? `?user_id=${userId}` : ''}`, { method: 'POST', token, body: payload }),
  updateItem: (token, id, payload, userId) =>
    request(`/items/${id}${userId ? `?user_id=${userId}` : ''}`, { method: 'PUT', token, body: payload }),
  deleteItem: (token, id, userId) =>
    request(`/items/${id}${userId ? `?user_id=${userId}` : ''}`, { method: 'DELETE', token }),
  itemHistory: (token, id, userId) =>
    request(`/items/${id}/history${userId ? `?user_id=${userId}` : ''}`, { token }),
  allHistory: (token, userId) =>
    request(`/items/history/all${userId ? `?user_id=${userId}` : ''}`, { token }),
};
