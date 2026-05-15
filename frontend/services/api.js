/**
 * API client + AsyncStorage session for CampusCare.
 *
 * Optional: set EXPO_PUBLIC_API_URL in frontend/.env. If unset, uses expo.extra or the dev LAN fallback below.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const TOKEN_KEY = '@campuscare_jwt';
const USER_KEY = '@campuscare_user';

export const ALLOWED_ROLES = [
  'community_member',
  'facility_manager',
  'worker',
  'admin',
];

/** Maps API/DB role strings to canonical keys used by AppNavigator. */
export function normalizeRole(role) {
  if (role == null || String(role).trim() === '') return null;

  const cleaned = String(role).trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (ALLOWED_ROLES.includes(cleaned)) return cleaned;

  const compact = cleaned.replace(/_/g, '');
  const aliases = {
    community: 'community_member',
    communitymember: 'community_member',
    facilitymanager: 'facility_manager',
    manager: 'facility_manager',
    worker: 'worker',
    admin: 'admin',
  };

  return aliases[compact] || null;
}

export function normalizeSessionUser(user) {
  if (!user || typeof user !== 'object') return null;

  const role = normalizeRole(user.role);
  if (!role) return null;

  return {
    id: user.id,
    email: user.email,
    role,
  };
}

function normalizeBaseUrl(url) {
  if (url == null) return '';
  return String(url).trim().replace(/\/+$/, '');
}

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
  'http://192.168.100.69:3000';

const API_BASE = normalizeBaseUrl(API_BASE_URL);

export function getApiBaseUrl() {
  return API_BASE;
}

export async function saveSession(token, user) {
  const sessionUser = normalizeSessionUser(user);
  if (!token || typeof token !== 'string' || !sessionUser) {
    throw new Error('Invalid session data from server.');
  }
  await clearSession();
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify(sessionUser)],
  ]);
  return sessionUser;
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getStoredUser() {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return normalizeSessionUser(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const token = await getToken();
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch (e) {
    const isNetworkFailure =
      e instanceof TypeError ||
      (typeof e?.message === 'string' &&
        /network|failed to fetch/i.test(e.message));
    const msg = isNetworkFailure
      ? `Cannot reach API at ${API_BASE}. Check EXPO_PUBLIC_API_URL / your LAN IP, and that the backend is running.`
      : e?.message || 'Network error';
    const err = new Error(msg);
    err.cause = e;
    throw err;
  }

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text || 'Request failed' };
  }

  if (!res.ok) {
    if (__DEV__) {
      console.error(`[api] ${options.method || 'GET'} ${path} → ${res.status}`, data);
    }
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  if (__DEV__) {
    console.log(`[api] ${options.method || 'GET'} ${path} → ${res.status}`);
  }

  return data;
}

export async function registerRequest(email, password, role) {
  const normalizedEmail = String(email).trim().toLowerCase();
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: normalizedEmail,
      password: String(password),
      role,
    }),
  });
}

export async function loginRequest(email, password) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: normalizedEmail,
      password: String(password),
    }),
  });

  const user = normalizeSessionUser(data.user);
  if (!user) {
    throw new Error('Login response did not include a valid role.');
  }

  return { token: data.token, user };
}

export async function logoutRequest() {
  return request('/api/auth/logout', { method: 'POST' });
}

/**
 * POST /api/issues — requires Bearer token; role must be community_member (server enforced).
 * Body: { title?, description, category, building, floor?, room?, image_url? }
 */
export async function createIssueRequest(payload) {
  const body = { ...payload };
  if (body.image_url && String(body.image_url).length > 500_000) {
    if (__DEV__) {
      console.warn('[api] image_url too large; submitting without photo');
    }
    delete body.image_url;
  }
  return request('/api/issues', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getMyIssuesRequest() {
  return request('/api/issues/my');
}

export async function getIssuesRequest(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.append(key, String(value).trim());
    }
  });

  const query = params.toString();

  return request(`/api/issues${query ? `?${query}` : ''}`);
}

export async function getIssueDetailsRequest(issueId) {
  return request(`/api/issues/${encodeURIComponent(String(issueId))}`);
}

export async function getAssignedIssuesRequest() {
  return request('/api/issues/assigned');
}

export async function assignIssueRequest(issueId, workerId) {
  return request(`/api/issues/${encodeURIComponent(String(issueId))}/assign`, {
    method: 'PUT',
    body: JSON.stringify({ workerId }),
  });
}

export async function updateIssueStatusRequest(issueId, status) {
  return request(`/api/issues/${encodeURIComponent(String(issueId))}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function closeIssueRequest(issueId) {
  return request(`/api/issues/${encodeURIComponent(String(issueId))}/close`, {
    method: 'PUT',
  });
}

export async function addIssueCommentRequest(issueId, comment) {
  return request(`/api/issues/${encodeURIComponent(String(issueId))}/comments`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });
}

export async function uploadIssuePhotoRequest(issueId, photoUrl) {
  return request(`/api/issues/${encodeURIComponent(String(issueId))}/photo`, {
    method: 'POST',
    body: JSON.stringify({ photoUrl }),
  });
}

export async function deleteIssueRequest(issueId) {
  return request(`/api/issues/${encodeURIComponent(String(issueId))}`, {
    method: 'DELETE',
  });
}

export async function getAdminUsersRequest() {
  return request('/api/admin/users');
}

export async function updateAdminUserStatusRequest(userId, status) {
  return request(`/api/admin/users/${encodeURIComponent(String(userId))}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}
