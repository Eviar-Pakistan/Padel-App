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
export const deleteBooking = (bookingId) =>
  ownerApi.delete(`courts/bookings/${bookingId}`);

// Coaches
export const getCoaches = () => ownerApi.get("coaches");
export const createCoach = (formData) =>
  ownerApi.post("coaches", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const updateCoach = (id, formData) =>
  ownerApi.patch(`coaches/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const deleteCoach = (id) => ownerApi.delete(`coaches/${id}`);
export const getStoreCoachBookings = () => ownerApi.get("coaches/bookings/store");
export const updateCoachBookingStatus = (bookingId, data) =>
  ownerApi.patch(`coaches/bookings/${bookingId}/status`, data);
export const deleteCoachBooking = (bookingId) =>
  ownerApi.delete(`coaches/bookings/${bookingId}`);

// Matches (on owner courts)
export const getOwnerMatches = () => ownerApi.get("matches/owner");
export const allocateOwnerMatchReferee = (matchId, refereeId) =>
  ownerApi.post(`matches/owner/${matchId}/referee`, { refereeId });

// Referees
export const getReferees = () => ownerApi.get("referees");
export const createReferee = (formData) =>
  ownerApi.post("referees", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const updateReferee = (id, formData) =>
  ownerApi.patch(`referees/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const deleteReferee = (id) => ownerApi.delete(`referees/${id}`);

// Products
export const getMyProducts = () => ownerApi.get("products/mine");
export const getProduct = (id) => ownerApi.get(`products/${id}`);
export const createProduct = (formData) =>
  ownerApi.post("products", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const updateProduct = (id, formData) =>
  ownerApi.patch(`products/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const deleteProduct = (id) => ownerApi.delete(`products/${id}`);

// Product categories
export const getProductCategories = () => ownerApi.get("product-categories");
export const createProductCategory = (data) =>
  ownerApi.post("product-categories", data);
export const deleteProductCategory = (id) =>
  ownerApi.delete(`product-categories/${id}`);

// Product brands
export const getProductBrands = () => ownerApi.get("product-brands");
export const createProductBrand = (data) =>
  ownerApi.post("product-brands", data);
export const deleteProductBrand = (id) =>
  ownerApi.delete(`product-brands/${id}`);

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

