import api from "./api";

export const getPaidOffDays = async (params = {}) => {
  const { data } = await api.get("/paid-off-days", { params });
  return data;
};

export const createPaidOffDay = async (payload) => {
  const { data } = await api.post("/paid-off-days", payload);
  return data;
};

export const updatePaidOffDay = async (id, payload) => {
  const { data } = await api.put(`/paid-off-days/${id}`, payload);
  return data;
};

export const deletePaidOffDay = async (id) => {
  const { data } = await api.delete(`/paid-off-days/${id}`);
  return data;
};
