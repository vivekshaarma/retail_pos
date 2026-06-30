// ─────────────────────────────────────────────
//  utils/api.js
//  A pre-configured Axios instance.
//  All API calls in the app go through this,
//  so auth headers are added automatically.
// ─────────────────────────────────────────────

import axios from "axios";

// Create an Axios instance with default settings
const api = axios.create({
  baseURL: "/api",        // Vite proxy forwards this to localhost:5000/api
  timeout: 10000,         // Fail requests that take over 10 seconds
});

// ── Request interceptor ──────────────────────
// This runs before EVERY request made via this axios instance.
// It reads the JWT from localStorage and adds it to the Authorization header.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ─────────────────────
// This runs after EVERY response. If we get a 401 (expired access token),
// we try ONE silent refresh before giving up and redirecting to login.
// `_retry` flag stops infinite loops if the refresh itself fails.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          // Use a plain axios call here (not `api`) to avoid recursively
          // triggering this same interceptor.
          const { data } = await axios.post("/api/auth/refresh", { refreshToken });

          localStorage.setItem("accessToken", data.accessToken);
          localStorage.setItem("refreshToken", data.refreshToken);

          // Retry the original request with the new token
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch (refreshErr) {
          // Refresh token itself is invalid/expired — force full logout
          localStorage.clear();
          window.location.href = "/login";
          return Promise.reject(refreshErr);
        }
      }

      // No refresh token available — straight to login
      localStorage.clear();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;
