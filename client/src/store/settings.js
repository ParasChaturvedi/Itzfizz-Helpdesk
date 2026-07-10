import { create } from 'zustand';
import api from '../api/axios';

export const useSettings = create((set) => ({
  settings: { brandName: 'Itzfizz Helpdesk', logo: '', primaryColor: '#4f46e5' },
  loaded: false,

  async load() {
    try {
      const { data } = await api.get('/settings');
      set({ settings: data.settings, loaded: true });
      if (data.settings.primaryColor) {
        document.documentElement.style.setProperty('--accent', data.settings.primaryColor);
      }
      if (data.settings.brandName) document.title = `${data.settings.brandName} — Helpdesk`;
    } catch {
      set({ loaded: true });
    }
  },

  setSettings: (settings) => {
    set({ settings });
    if (settings.primaryColor) {
      document.documentElement.style.setProperty('--accent', settings.primaryColor);
    }
  },
}));
