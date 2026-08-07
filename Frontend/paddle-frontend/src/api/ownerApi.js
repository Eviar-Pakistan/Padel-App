import axios from "axios";

const ownerApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

ownerApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("ownerAccessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default ownerApi;
