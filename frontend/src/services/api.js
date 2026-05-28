import axios from 'axios';

let base = import.meta.env.VITE_API_URL || 'https://intentos-backend-cz04.onrender.com/api/';
if (!base.endsWith('/api/')) {
  if (base.endsWith('/api')) base += '/';
  else if (base.endsWith('/')) base += 'api/';
  else base += '/api/';
}

const api = axios.create({
  baseURL: base,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const notificationsAPI = {
  getAll: () => api.get('notifications/'),
  markAsRead: (id) => api.patch(`notifications/${id}/read/`),
  markAllAsRead: () => api.patch('notifications/read-all/'),
  clearAll: () => api.delete('notifications/clear-all/'),
};

export default api;
