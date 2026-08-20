import axios from "axios";

const coachApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

coachApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("coachAccessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default coachApi;

export const coachLogin = (data) => coachApi.post("coaches/login", data);
export const coachRegister = (data) => coachApi.post("coaches/register", data);
export const getCoachMe = () => coachApi.get("coaches/me");
export const updateCoachMe = (formData) =>
  coachApi.patch("coaches/me", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const getCoachPortalBookings = () =>
  coachApi.get("coaches/portal/bookings");
export const acceptCoachBooking = (bookingId) =>
  coachApi.post(`coaches/portal/bookings/${bookingId}/accept`);
export const rejectCoachBooking = (bookingId) =>
  coachApi.post(`coaches/portal/bookings/${bookingId}/reject`);
export const getCoachConversations = () =>
  coachApi.get("coaches/portal/conversations");
export const getCoachConversationMessages = (id, after) =>
  coachApi.get(`coaches/portal/conversations/${id}/messages`, {
    params: after ? { after } : {},
  });
export const sendCoachConversationMessage = (id, formData) =>
  coachApi.post(`coaches/portal/conversations/${id}/messages`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
