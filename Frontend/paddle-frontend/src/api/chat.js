import api from "./axios";
import ownerApi from "./ownerApi";

export const getChatGroups = () => api.get("chat/groups");
export const requestJoinChatGroup = (id) => api.post(`chat/groups/${id}/join`);
export const getChatGroup = (id) => api.get(`chat/groups/${id}`);
export const getChatMessages = (id, after) =>
  api.get(`chat/groups/${id}/messages`, { params: after ? { after } : {} });
export const sendChatMessage = (id, formData) =>
  api.post(`chat/groups/${id}/messages`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getOwnerChatGroups = () => ownerApi.get("chat/groups/mine");
export const createChatGroup = (formData) =>
  ownerApi.post("chat/groups", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const getOwnerChatGroup = (id) => ownerApi.get(`chat/groups/${id}`);
export const getOwnerChatMessages = (id, after) =>
  ownerApi.get(`chat/groups/${id}/messages`, { params: after ? { after } : {} });
export const sendOwnerChatMessage = (id, formData) =>
  ownerApi.post(`chat/groups/${id}/messages`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const getChatJoinRequests = (id) =>
  ownerApi.get(`chat/groups/${id}/requests`);
export const acceptChatJoinRequest = (groupId, requestId) =>
  ownerApi.post(`chat/groups/${groupId}/requests/${requestId}/accept`);
export const rejectChatJoinRequest = (groupId, requestId) =>
  ownerApi.post(`chat/groups/${groupId}/requests/${requestId}/reject`);
