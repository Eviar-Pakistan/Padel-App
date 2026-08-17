import api from "./axios";

export const getCoaches = () => api.get("coaches");
export const getCoach = (id) => api.get(`coaches/${id}`);
export const getCoachReviews = (id) => api.get(`coaches/${id}/reviews`);
export const addCoachReview = (id, data) => api.post(`coaches/${id}/reviews`, data);
export const bookCoachSession = (id, data) => api.post(`coaches/${id}/bookings`, data);
export const getMyCoachBookings = () => api.get("coaches/bookings/my");
export const getMyCoachConversations = () =>
  api.get("coaches/portal/user-conversations");
export const getCoachDmMessages = (id, after) =>
  api.get(`coaches/portal/conversations/${id}/messages`, {
    params: after ? { after } : {},
  });
export const sendCoachDmMessage = (id, formData) =>
  api.post(`coaches/portal/conversations/${id}/messages`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
