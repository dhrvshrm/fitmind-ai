import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PREFERENCES_STORAGE_KEY } from '../constants/api';

/** `system` follows the operating system's light/dark setting. */
export type ColorModePreference = 'system' | 'light' | 'dark';

type PreferencesState = {
  colorMode: ColorModePreference;
  setColorMode: (mode: ColorModePreference) => void;
};

/** Per-device display preferences, persisted in localStorage. */
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      colorMode: 'system',
      setColorMode: (colorMode) => set({ colorMode }),
    }),
    { name: PREFERENCES_STORAGE_KEY },
  ),
);
