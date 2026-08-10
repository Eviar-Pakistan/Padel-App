import api from "./axios";

export const getShopProducts = () => api.get("products");
export const getShopProduct = (id) => api.get(`products/${id}`);
