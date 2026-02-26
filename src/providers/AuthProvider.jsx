// src/providers/AuthProvider.jsx
import { useState, useEffect, useCallback } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { api } from "../utils/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/api/auth/me")
      .then((data) => setUser(data))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      // 1. loginResponse is now the ACTUAL body (e.g., { access_token: "..." })
      const loginData = await api.post("/api/auth/login", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      // 2. Access the token directly from loginData
      const { access_token } = loginData;

      if (!access_token) {
        throw new Error("No token received from server");
      }

      localStorage.setItem("token", access_token);

      // 3. Same here: meResponse will be the user object directly
      const userData = await api.get("/api/auth/me");

      setUser(userData);
      return userData;
    } catch (error) {
      // Your existing error handling is fine...
      throw error;
    }
  }, []);

  // Logout: just clear local state — no server call needed
  // The backend 422 happens because /api/auth/logout expects a body it doesn't get
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
