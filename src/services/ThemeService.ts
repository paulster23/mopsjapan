import AsyncStorage from '@react-native-async-storage/async-storage';

export type Theme = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  text: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  warning: string;
  error: string;
  border: string;
}

export interface ThemeResult {
  success: boolean;
  newTheme?: Theme;
  error?: string;
}

export class ThemeService {
  private readonly STORAGE_KEY = 'app_theme';
  private readonly DEFAULT_THEME: Theme = 'light';

  private readonly LIGHT_COLORS: ThemeColors = {
    background: '#ffffff',
    text: '#000000',
    surface: '#f5f5f5',
    primary: '#007AFF',
    secondary: '#6c757d',
    accent: '#28a745',
    warning: '#fd7e14',
    error: '#dc3545',
    border: '#ddd'
  };

  private readonly DARK_COLORS: ThemeColors = {
    background: '#1a1a1a',
    text: '#ffffff',
    surface: '#2d2d2d',
    primary: '#0984ff',
    secondary: '#8e9aaf',
    accent: '#32d74b',
    warning: '#ff9f0a',
    error: '#ff453a',
    border: '#444'
  };

  async getCurrentTheme(): Promise<Theme> {
    try {
      const savedTheme = await AsyncStorage.getItem(this.STORAGE_KEY);
      return (savedTheme as Theme) || this.DEFAULT_THEME;
    } catch (error) {
      return this.DEFAULT_THEME;
    }
  }

  async setTheme(theme: Theme): Promise<ThemeResult> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, theme);
      return { success: true, newTheme: theme };
    } catch (error) {
      return {
        success: false,
        error: `Failed to save theme: ${(error as Error).message}`
      };
    }
  }

  async toggleTheme(): Promise<ThemeResult> {
    try {
      const currentTheme = await this.getCurrentTheme();
      const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light';
      return await this.setTheme(newTheme);
    } catch (error) {
      return {
        success: false,
        error: `Failed to toggle theme: ${(error as Error).message}`
      };
    }
  }

  getThemeColors(theme: Theme): ThemeColors {
    return theme === 'dark' ? this.DARK_COLORS : this.LIGHT_COLORS;
  }

  isSystemDarkMode(): boolean {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }

  getSystemTheme(): Theme {
    return this.isSystemDarkMode() ? 'dark' : 'light';
  }
}