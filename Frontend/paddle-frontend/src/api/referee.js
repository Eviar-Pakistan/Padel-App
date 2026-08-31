import axios from "axios";

const refereeApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

refereeApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("refereeAccessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default refereeApi;

export const refereeRegister = (data) => refereeApi.post("referees/register", data);
export const refereeLogin = (data) => refereeApi.post("referees/login", data);
export const getRefereeMe = () => refereeApi.get("referees/me");
export const updateRefereeMe = (formData) =>
  refereeApi.patch("referees/me", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const getRefereeMatches = () => refereeApi.get("referee-matches");
export const getRefereeMatch = (id) => refereeApi.get(`referee-matches/${id}`);
export const scoreRefereeMatch = (id, data) =>
  refereeApi.post(`referee-matches/${id}/score`, data);
export const getRefereeMatchRankings = (id) =>
  refereeApi.get(`referee-matches/${id}/rankings`);
export const submitRefereeMatchRankings = (id, rankings) =>
  refereeApi.post(`referee-matches/${id}/rankings`, { rankings });
export const getRefereeMatchConversations = () =>
  refereeApi.get("referee-matches/conversations");
export const acceptRefereeMatch = (id) =>
  refereeApi.post(`referee-matches/${id}/accept`);
export const rejectRefereeMatch = (id) =>
  refereeApi.post(`referee-matches/${id}/reject`);
export const getRefereeMatchMessages = (id, after) =>
  refereeApi.get(`referee-matches/${id}/messages`, {
    params: after ? { after } : {},
  });
export const sendRefereeMatchMessage = (id, formData) =>
  refereeApi.post(`referee-matches/${id}/messages`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
