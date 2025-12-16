// Small auth helper with fetchWithAuth that retries with refresh token on 401
export const API_BASE = process.env.REACT_APP_API_URL || 'https://ubakalaunitycup.onrender.com/api';

export async function refreshToken() {
    const refresh = localStorage.getItem('refresh');
    if (!refresh) return null;
    try {
        const res = await fetch(`${API_BASE}/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh })
        });
        if (!res.ok) return null;
        const data = await res.json();
        localStorage.setItem('access', data.access);
        return data.access;
    } catch (e) {
        return null;
    }
}

// decode JWT payload (no signature verification) - returns payload object or null
export function decodeJwt(token) {
    if (!token) return null;
    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;
        const payload = parts[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decodeURIComponent(escape(decoded)));
    } catch (e) {
        return null;
    }
}

export function isTokenExpiringSoon(token, withinSeconds = 60) {
    const payload = decodeJwt(token);
    if (!payload || !payload.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp - now < withinSeconds;
}

export async function fetchWithAuth(url, opts = {}) {
    let access = localStorage.getItem('access');

    // If token is expiring soon, try to refresh first
    if (access && isTokenExpiringSoon(access, 60)) {
        const refreshed = await refreshToken();
        if (refreshed) access = refreshed;
    }

    const headers = opts.headers ? { ...opts.headers } : {};
    if (access) headers['Authorization'] = `Bearer ${access}`;
    const res = await fetch(url, { ...opts, headers });
    if (res.status !== 401) return res;

    // Attempt refresh once if we get a 401
    const newAccess = await refreshToken();
    if (!newAccess) return res;
    const headers2 = opts.headers ? { ...opts.headers } : {};
    headers2['Authorization'] = `Bearer ${newAccess}`;
    return fetch(url, { ...opts, headers: headers2 });
}

export function logout() {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('username');
    localStorage.removeItem('groups');
}
