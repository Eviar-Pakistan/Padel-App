import api from "./axios";

export const getNewsFeed = (params) => api.get("news", { params });
export const getNewsFilters = () => api.get("news/meta/filters");
export const getNewsPost = (id) => api.get(`news/${id}`);
export const getMyNews = () => api.get("news/mine");

export const createNewsPost = (formData) =>
  api.post("news", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const updateNewsPost = (id, formData) =>
  api.patch(`news/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteNewsPost = (id) => api.delete(`news/${id}`);

export const likeNewsPost = (id) => api.post(`news/${id}/like`);
export const unlikeNewsPost = (id) => api.delete(`news/${id}/like`);
export const saveNewsPost = (id) => api.post(`news/${id}/save`);
export const unsaveNewsPost = (id) => api.delete(`news/${id}/save`);
export const shareNewsPost = (id) => api.post(`news/${id}/share`);

export const getNewsComments = (id) => api.get(`news/${id}/comments`);
export const addNewsComment = (id, data) => api.post(`news/${id}/comments`, data);
export const deleteNewsComment = (commentId) =>
  api.delete(`news/comments/${commentId}`);
export const likeNewsComment = (commentId) =>
  api.post(`news/comments/${commentId}/like`);
export const unlikeNewsComment = (commentId) =>
  api.delete(`news/comments/${commentId}/like`);
