import { ref, watch, onMounted } from 'vue';
import type { UserSettings } from '../types';

const STORAGE_KEY = 'llenoporfa_settings_v1';

const defaultSettings: UserSettings = {
  defaultFuel: 'g95_e5',
  defaultRadius: 10,
  tankCapacityLiters: 50,
  theme: 'system',
};

const settings = ref<UserSettings>({ ...defaultSettings });

export function useSettings() {
  const loadSettings = () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        settings.value = { ...defaultSettings, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.error('Failed to parse settings from localStorage', e);
    }
    applyTheme(settings.value.theme);
  };

  const saveSettings = (newSettings: Partial<UserSettings>) => {
    settings.value = { ...settings.value, ...newSettings };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value));
      if (newSettings.theme) {
        applyTheme(newSettings.theme);
      }
    }
  };

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
  };

  onMounted(() => {
    loadSettings();
  });

  return {
    settings,
    saveSettings,
    applyTheme,
  };
}
