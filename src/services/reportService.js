import api from "./api";

export const getSummary = async (params = {}) => {
  const { data } = await api.get("/reports/summary", { params });
  return data;
};

export const getAttendanceReport = async (params = {}) => {
  const { data } = await api.get("/reports/attendance", { params });
  return data;
};

export const getBranchReport = async (params = {}) => {
  const { data } = await api.get("/reports/branches", { params });
  return data;
};
