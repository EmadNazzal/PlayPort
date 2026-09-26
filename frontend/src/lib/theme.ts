import { create } from 'zustand';

export type ThemePreference = 'light' | 'dark' | 'system';
export type Theme = 'light' | 'dark';

const KEY = 'playport-theme';
const media = () => window.matchMedia('(prefers-color-scheme: light)');

const read = (): ThemePreference => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  } catch {
    return 'system';
  }
};

const resolve = (pref: ThemePreference): Theme => (pref === 'system' ? (media().matches ? 'light' : 'dark') : pref);

/** Writes the resolved theme to <html data-theme>, which the CSS tokens key off. */
const apply = (theme: Theme) => {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#F5F3EE' : '#0B0C10');
};

type ThemeState = { preference: ThemePreference; theme: Theme; setPreference: (p: ThemePreference) => void };

export const useTheme = create<ThemeState>((set) => {
  const preference = read();
  const theme = resolve(preference);
  apply(theme);

  // Follow the OS while the preference is "system".
  media().addEventListener('change', () => {
    const { preference: p } = useTheme.getState();
    if (p !== 'system') return;
    const next = resolve(p);
    apply(next);
    set({ theme: next });
  });

  return {
    preference,
    theme,
    setPreference: (p) => {
      try {
        localStorage.setItem(KEY, p);
      } catch {
        // Private mode / blocked storage: the choice just won't persist.
      }
      const next = resolve(p);
      apply(next);
      set({ preference: p, theme: next });
    },
  };
});
