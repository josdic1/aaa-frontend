import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export const api = axios.create({
  baseURL: BASE_URL,
});

// Attach token to every request automatically
api.interceptors.request.use((config) => {
  // Using 'token' to match your previous implementation,
  // but usually better to use 'access_token' for consistency.
  const token =
    localStorage.getItem("token") || localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401s globally — clear token and redirect to login
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // FIX: Access status via error.response
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      // Preserve current path so LoginPage can redirect back after login
      const from = window.location.pathname;

      // Prevent infinite redirect loop if already on login
      if (!from.includes("/login")) {
        window.location.href = `/login?from=${encodeURIComponent(from)}`;
      }
    }

    // Return the specific error message from backend if available
    return Promise.reject(error.response?.data || error);
  },
);
