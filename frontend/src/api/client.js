import axios from "axios";
import { API_BASE_URL } from "../config/env.js";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("foodbridge_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
