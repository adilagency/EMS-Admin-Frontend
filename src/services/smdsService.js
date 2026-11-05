import api from "./api";

export const getSmdsStatus = async () => {
  const { data } = await api.get("/smds/status");
  return data;
};

export const syncSmdsAttendance = async (payload = {}) => {
  const { data } = await api.post("/smds/sync", payload);
  return data;
};

export const getSmdsBu = async () => {
  const { data } = await api.get("/smds/bu");
  return data;
};

export const getSmdsParty = async (params = {}) => {
  const { data } = await api.get("/smds/party", { params });
  return data;
};
