import api from "./axios";

export const getTopPlayers = () => api.get("challenges/players");
export const getMyChallenges = () => api.get("challenges/mine");
export const sendChallenge = (opponentId) =>
  api.post("challenges", { opponentId });
export const acceptChallenge = (id) => api.post(`challenges/${id}/accept`);

export const getPlayerConversations = () => api.get("challenges/conversations");
export const getPlayerDmMessages = (id, after) =>
  api.get(`challenges/conversations/${id}/messages`, {
    params: after ? { after } : {},
  });
export const sendPlayerDmMessage = (id, formData) =>
  api.post(`challenges/conversations/${id}/messages`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
