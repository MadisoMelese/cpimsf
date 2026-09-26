import axios from 'axios';
import { parseApiError } from '../utils/errors';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// ─── Request interceptor — attach JWT ────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const deviceId = getDeviceId();
  config.headers['X-Device-Id'] = deviceId;

  return config;
});

// ─── Response interceptor — handle 401 / token refresh ───────────────────────
let isRefreshing = false;
let refreshQueue = [];

// Lazily resolved so ToastContext is mounted before first use
let _showToast = null;
export function registerToastFn(fn) { _showToast = fn; }

// Status codes that are handled inline by individual components — don't toast these
const SILENT_STATUSES = new Set([400, 401, 404, 409, 422]);

// Endpoints that produce a 401 as a real response (not an expired-session signal)
// — never attempt a token refresh for these.
const NO_REFRESH_URLS = ['/auth/login', '/auth/refresh'];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const requestUrl = original?.url || '';

    const isAuthEndpoint = NO_REFRESH_URLS.some((u) => requestUrl.includes(u));

    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const newToken = data.data.accessToken;

        localStorage.setItem('access_token', newToken);
        if (data.data.refreshToken) {
          localStorage.setItem('refresh_token', data.data.refreshToken);
        }

        refreshQueue.forEach((q) => q.resolve(newToken));
        refreshQueue = [];

        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        refreshQueue.forEach((q) => q.reject(refreshError));
        refreshQueue = [];
        // Clear auth and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // For unexpected server errors (5xx, network timeouts, etc.)
    // show a global toast so the user always gets feedback.
    const status = error.response?.status;
    if (_showToast && (!status || !SILENT_STATUSES.has(status))) {
      const msg = parseApiError(error, 'Server error — please try again.');
      _showToast('error', msg);
    }

    return Promise.reject(error);
  },
);

// ─── Device ID — persisted UUID per browser ──────────────────────────────────
function getDeviceId() {
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('device_id', id);
  }
  return id;
}

export default api;
