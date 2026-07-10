import { create } from 'zustand';
import api from '../api/axios';

export const useAuth = create((set, get) => ({
  user: null,
  loading: true,

  async bootstrap() {
    const token = localStorage.getItem('deskflow_token');
    if (!token) return set({ loading: false });
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user, loading: false });
    } catch {
      localStorage.removeItem('deskflow_token');
      set({ user: null, loading: false });
    }
  },

  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('deskflow_token', data.token);
    set({ user: data.user });
    return data.user;
  },

  async register(name, email, password) {
    const { data } = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('deskflow_token', data.token);
    set({ user: data.user });
    return data.user;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    localStorage.removeItem('deskflow_token');
    set({ user: null });
  },

  setUser: (user) => set({ user }),
  isStaff: () => ['admin', 'agent'].includes(get().user?.role),
  isAdmin: () => get().user?.role === 'admin',
}));
