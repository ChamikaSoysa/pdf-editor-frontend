import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Vite proxies to https://localhost:7200
});

// 🔹 Interceptor to convert blob errors back to JSON if possible
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.data instanceof Blob) {
      try {
        const text = await err.response.data.text();
        err.response.data = JSON.parse(text);
      } catch {
        // leave as blob
      }
    }
    return Promise.reject(err);
  }
);

export default api;
