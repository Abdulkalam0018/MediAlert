import axios from "axios";

const apiUrl = import.meta.env.VITE_APP_API_URL;

const axiosInstance = axios.create({
  baseURL: apiUrl,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Internal variable to store the token getter
let getTokenFn = null;

// Function to initialize token getter from React context
export const setClerkTokenGetter = (getter) => {
  getTokenFn = getter;

  // Attach request interceptor only once
  axiosInstance.interceptors.request.use(async (config) => {
    if (getTokenFn) {
      try {
        const token = await getTokenFn();
        if (token) {
          config.headers["Authorization"] = `Bearer ${token}`;
        }
      } catch (err) {
        console.error("Error getting Clerk token:", err);
      }
    }
    return config;
  });
};

export default axiosInstance;
