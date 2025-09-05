import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeService, Theme, ThemeColors } from '../services/ThemeService';

interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
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
    loadSystemTheme();
    
    // Listen for system theme changes
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        setThemeState(themeService.getSystemTheme());
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  const loadSystemTheme = async () => {
    try {
      const systemTheme = themeService.getSystemTheme();
      setThemeState(systemTheme);
    } catch (error) {
      console.error('Failed to load system theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const colors = themeService.getThemeColors(theme);

  const value: ThemeContextType = {
    theme,
    colors,
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