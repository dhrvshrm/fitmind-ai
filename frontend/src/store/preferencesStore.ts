import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PREFERENCES_STORAGE_KEY } from '../constants/api';

/** `system` follows the operating system's light/dark setting. */
export type ColorModePreference = 'system' | 'light' | 'dark';

/** How height is entered and shown; it's always stored in cm. */
export type HeightUnit = 'cm' | 'ftin';

type PreferencesState = {
  colorMode: ColorModePreference;
  heightUnit: HeightUnit;
  setColorMode: (mode: ColorModePreference) => void;
  setHeightUnit: (unit: HeightUnit) => void;
};

/** Per-device display preferences, persisted in localStorage. */
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      colorMode: 'system',
      // Most people in India know their height in feet and inches.
      heightUnit: 'ftin',
      setColorMode: (colorMode) => set({ colorMode }),
      setHeightUnit: (heightUnit) => set({ heightUnit }),
    }),
    { name: PREFERENCES_STORAGE_KEY },
  ),
);
