/**
 * API client + AsyncStorage session for CampusCare.
 *
 * Optional: set EXPO_PUBLIC_API_URL in frontend/.env. If unset, uses expo.extra or the dev LAN fallback below.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const TOKEN_KEY = '@campuscare_jwt';
const USER_KEY = '@campuscare_user';

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
  if (
    !token ||
    typeof token !== 'string' ||
    !user ||
    typeof user !== 'object' ||
    !user.role
  ) {
    throw new Error('Invalid session data from server.');
  }
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify(user)],
  ]);
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
    return JSON.parse(raw);
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
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export async function registerRequest(email, password, role) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  });
}

export async function loginRequest(email, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logoutRequest() {
  return request('/api/auth/logout', { method: 'POST' });
}

/**
 * POST /api/issues — requires Bearer token; role must be community_member (server enforced).
 * Body: { title?, description, category, building, floor?, room?, image_url? }
 */
export async function createIssueRequest(payload) {
  return request('/api/issues', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
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
  return request(`/api/issues/${issueId}`);
}
