import api from "./api";

export const getTaClaims = async (params = {}) => {
  const { data } = await api.get("/ta-claims", { params });
  return data;
};

export const createTaClaim = async (payload) => {
  const { data } = await api.post("/ta-claims", payload);
  return data;
};

export const updateTaClaim = async (id, payload) => {
  const { data } = await api.put(`/ta-claims/${id}`, payload);
  return data;
};

export const deleteTaClaim = async (id) => {
  const { data } = await api.delete(`/ta-claims/${id}`);
  return data;
};
