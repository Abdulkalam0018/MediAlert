import axiosInstance from "./axiosInstance";

export const askAI = async (query) => {
  const response = await axiosInstance.post("/ai/ask", { query });
  return response.data;
};
