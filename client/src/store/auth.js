import { create } from 'zustand';
import api from '../api/axios';

export const useAuth = create((set, get) => ({
  user: null,
  loading: true,

  async bootstrap() {
    const token = localStorage.getItem('itzfizz_token');
    if (!token) return set({ loading: false });
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user, loading: false });
    } catch {
      localStorage.removeItem('itzfizz_token');
      set({ user: null, loading: false });
    }
  },

  async login(identifier, password) {
    const { data } = await api.post('/auth/login', { identifier, password });
    localStorage.setItem('itzfizz_token', data.token);
    set({ user: data.user });
    return data.user;
  },

  async register(name, email, password, phone) {
    const { data } = await api.post('/auth/register', { name, email, password, phone });
    localStorage.setItem('itzfizz_token', data.token);
    set({ user: data.user });
    return data.user;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    localStorage.removeItem('itzfizz_token');
    set({ user: null });
  },

  setUser: (user) => set({ user }),
  isStaff: () => ['admin', 'agent'].includes(get().user?.role),
  isAdmin: () => get().user?.role === 'admin',
}));
