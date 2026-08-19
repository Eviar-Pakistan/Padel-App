import api from "./axios";

export const login = (data) => {
  return api.post("auth/login", data);
};

export const register = (data) => {
  return api.post("auth/register", data);
};

export const getMyProfile = () => api.get("users/me");
export const getLeaderboard = () => api.get("users/leaderboard");
export const updateMyProfile = (data) => api.patch("users/me", data);
export const updateMyAvatar = (formData) =>
  api.post("users/me/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const changeMyPassword = (data) => api.post("users/me/password", data);