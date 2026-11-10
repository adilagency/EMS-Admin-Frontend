import api from "./api";

export const getDeductions = async (params = {}) => {
  const { data } = await api.get("/deductions", { params });
  return data;
};

export const createDeduction = async (payload) => {
  const { data } = await api.post("/deductions", payload);
  return data;
};

export const updateDeduction = async (id, payload) => {
  const { data } = await api.put(`/deductions/${id}`, payload);
  return data;
};

export const deleteDeduction = async (id) => {
  const { data } = await api.delete(`/deductions/${id}`);
  return data;
};
