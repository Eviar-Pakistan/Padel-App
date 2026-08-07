import ownerApi from "./ownerApi";

export const ownerLogin = (data) => ownerApi.post("paddle-owner/login", data);
export const ownerOverview = () => ownerApi.get("paddle-owner/overview");
export const ownerMe = () => ownerApi.get("paddle-owner/me");

// Courts
export const getMyCourts = () => ownerApi.get("courts/mine");
export const createCourt = (formData) =>
  ownerApi.post("courts", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const updateCourt = (id, formData) =>
  ownerApi.patch(`courts/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteCourt = (id) => ownerApi.delete(`courts/${id}`);
export const getStoreBookings = () => ownerApi.get("courts/bookings/store");
export const updateBookingStatus = (bookingId, data) =>
  ownerApi.patch(`courts/bookings/${bookingId}/status`, data);

// Coaches
export const getCoaches = () => ownerApi.get("coaches");
export const createCoach = (data) => ownerApi.post("coaches", data);
export const updateCoach = (id, data) => ownerApi.patch(`coaches/${id}`, data);
export const deleteCoach = (id) => ownerApi.delete(`coaches/${id}`);

// Products
export const getMyProducts = () => ownerApi.get("products/mine");
export const createProduct = (data) => ownerApi.post("products", data);
export const updateProduct = (id, data) =>
  ownerApi.patch(`products/${id}`, data);
export const deleteProduct = (id) => ownerApi.delete(`products/${id}`);

// Orders
export const getStoreOrders = () => ownerApi.get("orders/store");
export const updateOrderStatus = (id, data) =>
  ownerApi.patch(`orders/store/${id}/status`, data);

// News
export const getOwnerNews = () => ownerApi.get("news/mine");
export const createOwnerNews = (formData) =>
  ownerApi.post("news", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const updateOwnerNews = (id, formData) =>
  ownerApi.patch(`news/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const deleteOwnerNews = (id) => ownerApi.delete(`news/${id}`);
export const getNewsFilterOptions = () => ownerApi.get("news/meta/filters");

