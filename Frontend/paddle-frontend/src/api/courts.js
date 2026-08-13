import api from "./axios";

export const getCourts = () => api.get("courts");
export const getCourt = (id) => api.get(`courts/${id}`);
export const getCourtAvailability = (courtId, date) =>
  api.get(`courts/${courtId}/availability`, { params: { date } });
export const createCourtBooking = (courtId, data) =>
  api.post(`courts/${courtId}/bookings`, data);
export const getMyBookings = () => api.get("courts/bookings/my");
export const getJoinableBookings = (params) =>
  api.get("courts/bookings/joinable", { params });
export const requestJoinCourtBooking = (bookingId) =>
  api.post(`courts/bookings/${bookingId}/join`);
export const acceptJoinRequest = (joinRequestId) =>
  api.post(`courts/bookings/join-requests/${joinRequestId}/accept`);
/** @deprecated use requestJoinCourtBooking */
export const joinCourtBooking = requestJoinCourtBooking;
