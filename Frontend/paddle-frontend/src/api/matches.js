import api from "./axios";

export const getMatches = () => api.get("matches");
export const getLiveMatches = () => api.get("matches/live");
export const getMatchResults = () => api.get("matches/results");
export const getMatchHistory = () => api.get("matches/history");
export const getMatch = (id) => api.get(`matches/${id}`);
export const getMatchPlayers = () => api.get("matches/players");
export const getMatchReferees = (params) =>
  api.get("matches/referees", { params });
export const getMatchConversations = () => api.get("matches/conversations");
export const createMatch = (data) => api.post("matches", data);
export const acceptMatchInvite = (id) => api.post(`matches/${id}/accept`);
export const rejectMatchInvite = (id) => api.post(`matches/${id}/reject`);
export const requestJoinMatch = (id) => api.post(`matches/${id}/join`);
export const acceptMatchJoin = (matchId, requestId) =>
  api.post(`matches/${matchId}/join-requests/${requestId}/accept`);
export const assignMatchReferee = (id, refereeId) =>
  api.post(`matches/${id}/referee`, { refereeId });
export const switchMatchTeams = (id, data) =>
  api.post(`matches/${id}/teams`, data);
export const setMatchReminder = (id, on) =>
  on ? api.post(`matches/${id}/remind`) : api.delete(`matches/${id}/remind`);
export const setMatchCalendar = (id, on) =>
  on
    ? api.post(`matches/${id}/calendar`)
    : api.delete(`matches/${id}/calendar`);
export const getCalendarEvents = () => api.get("matches/calendar");
export const deleteMatch = (id) => api.delete(`matches/${id}`);
export const getMatchMessages = (id, after) =>
  api.get(`matches/${id}/messages`, { params: after ? { after } : {} });
export const sendMatchMessage = (id, formData) =>
  api.post(`matches/${id}/messages`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
