'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type TimeOfDay = 'night' | 'day';

interface ThemeState {
  time: TimeOfDay;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeState>({ time: 'night', toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [time, setTime] = useState<TimeOfDay>('night');

  const toggle = useCallback(() => {
    setTime(prev => (prev === 'night' ? 'day' : 'night'));
  }, []);

  return (
    <ThemeContext.Provider value={{ time, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
