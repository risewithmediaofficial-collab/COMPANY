import axios from 'axios';
import { store } from '../store';
import { logout } from '../store/slices/authSlice';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Single-flight refresh token queue
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor for adding JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    const workspaceId = localStorage.getItem('activeWorkspace');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (workspaceId && workspaceId !== 'global') {
      config.headers['x-workspace-id'] = workspaceId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling token refresh and errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    const isAuthEndpoint = originalRequest.url?.includes('/auth/');
    const isIdempotent = ['get', 'head', 'options'].includes(originalRequest.method?.toLowerCase());

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      // Do not blindly retry non-idempotent writes (POST, DELETE, PATCH)
      if (!isIdempotent && originalRequest._retryAttempted) {
        return Promise.reject(error);
      }

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        store.dispatch(logout());
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      originalRequest._retryAttempted = true;
      isRefreshing = true;

      return new Promise(async (resolve, reject) => {
        try {
          const res = await axios.post('/api/auth/refresh', { refreshToken }, { timeout: 15000 });
          if (res.status === 200 && res.data.accessToken) {
            const newAccessToken = res.data.accessToken;
            localStorage.setItem('accessToken', newAccessToken);
            if (res.data.refreshToken) {
              localStorage.setItem('refreshToken', res.data.refreshToken);
            }
            api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

            processQueue(null, newAccessToken);
            resolve(api(originalRequest));
          } else {
            throw new Error('Refresh failed');
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          store.dispatch(logout());
          reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      });
    }
    return Promise.reject(error);
  }
);

export default api;
