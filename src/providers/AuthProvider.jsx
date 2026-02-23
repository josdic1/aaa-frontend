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
    const data = await api.post("/api/auth/login", { email, password });
    localStorage.setItem("token", data.access_token);
    const me = await api.get("/api/auth/me");
    setUser(me);
    return me;
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
