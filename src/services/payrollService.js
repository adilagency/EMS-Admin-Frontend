import api from "./api";

export const getPeriods = async (params = {}) => {
  const { data } = await api.get("/payroll/periods", { params });
  return data;
};

export const createPeriod = async (payload) => {
  const { data } = await api.post("/payroll/periods", payload);
  return data;
};

export const calculatePeriod = async (id) => {
  const { data } = await api.post(`/payroll/periods/${id}/calculate`);
  return data;
};

export const getPayslips = async (id) => {
  const { data } = await api.get(`/payroll/periods/${id}/payslips`);
  return data;
};

export const approvePeriod = async (id) => {
  const { data } = await api.post(`/payroll/periods/${id}/approve`);
  return data;
};
