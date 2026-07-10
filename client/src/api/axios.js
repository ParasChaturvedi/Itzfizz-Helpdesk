import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Attach the bearer token (belt-and-suspenders alongside the httpOnly cookie).
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('deskflow_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !location.pathname.startsWith('/login')) {
      localStorage.removeItem('deskflow_token');
    }
    return Promise.reject(err);
  }
);

export default api;
