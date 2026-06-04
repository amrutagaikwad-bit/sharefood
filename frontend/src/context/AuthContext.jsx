import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("foodbridge_token");
    if (!token) return setLoading(false);
    api.get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem("foodbridge_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (payload) => {
    const res = await api.post("/auth/login", payload);
    localStorage.setItem("foodbridge_token", res.data.token);
    setUser(res.data.user);
  };

  const register = async (payload) => {
    const res = await api.post("/auth/register", payload);
    localStorage.setItem("foodbridge_token", res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const loginWithOtp = async (payload) => {
    const res = await api.post("/auth/otp/verify", payload);
    localStorage.setItem("foodbridge_token", res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem("foodbridge_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

