import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeService, Theme, ThemeColors } from '../services/ThemeService';

interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  toggleTheme: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light');
  const [isLoading, setIsLoading] = useState(true);
  const themeService = new ThemeService();

  useEffect(() => {
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    try {
      const savedTheme = await themeService.getCurrentTheme();
      setThemeState(savedTheme);
    } catch (error) {
      console.error('Failed to load saved theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const colors = themeService.getThemeColors(theme);

  const toggleTheme = async () => {
    try {
      const result = await themeService.toggleTheme();
      if (result.success && result.newTheme) {
        setThemeState(result.newTheme);
      }
    } catch (error) {
      console.error('Failed to toggle theme:', error);
    }
  };

  const setTheme = async (newTheme: Theme) => {
    try {
      const result = await themeService.setTheme(newTheme);
      if (result.success) {
        setThemeState(newTheme);
      }
    } catch (error) {
      console.error('Failed to set theme:', error);
    }
  };

  const value: ThemeContextType = {
    theme,
    colors,
    toggleTheme,
    setTheme,
    isLoading
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};