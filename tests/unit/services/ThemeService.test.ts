// Mock AsyncStorage before imports
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: mockRemoveItem,
    getAllKeys: jest.fn(),
    clear: jest.fn()
  }
}));

import { ThemeService, Theme, ThemeColors } from '../../../src/services/ThemeService';

describe('ThemeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentTheme', () => {
    it('should return light theme by default', async () => {
      const service = new ThemeService();
      
      mockGetItem.mockResolvedValue(null);
      
      const theme = await service.getCurrentTheme();
      
      expect(theme).toBe('light');
      expect(mockGetItem).toHaveBeenCalledWith('app_theme');
    });

    it('should return saved theme from storage', async () => {
      const service = new ThemeService();
      
      mockGetItem.mockResolvedValue('dark');
      
      const theme = await service.getCurrentTheme();
      
      expect(theme).toBe('dark');
    });

    it('should handle storage errors gracefully', async () => {
      const service = new ThemeService();
      
      mockGetItem.mockRejectedValue(new Error('Storage error'));
      
      const theme = await service.getCurrentTheme();
      
      expect(theme).toBe('light'); // fallback to default
    });
  });

  describe('setTheme', () => {
    it('should save theme to storage', async () => {
      const service = new ThemeService();
      
      mockSetItem.mockResolvedValue(undefined);
      
      const result = await service.setTheme('dark');
      
      expect(result.success).toBe(true);
      expect(mockSetItem).toHaveBeenCalledWith('app_theme', 'dark');
    });

    it('should handle storage errors', async () => {
      const service = new ThemeService();
      
      mockSetItem.mockRejectedValue(new Error('Storage error'));
      
      const result = await service.setTheme('dark');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to save theme');
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from light to dark', async () => {
      const service = new ThemeService();
      
      mockGetItem.mockResolvedValue('light');
      mockSetItem.mockResolvedValue(undefined);
      
      const result = await service.toggleTheme();
      
      expect(result.success).toBe(true);
      expect(result.newTheme).toBe('dark');
      expect(mockSetItem).toHaveBeenCalledWith('app_theme', 'dark');
    });

    it('should toggle from dark to light', async () => {
      const service = new ThemeService();
      
      mockGetItem.mockResolvedValue('dark');
      mockSetItem.mockResolvedValue(undefined);
      
      const result = await service.toggleTheme();
      
      expect(result.success).toBe(true);
      expect(result.newTheme).toBe('light');
      expect(mockSetItem).toHaveBeenCalledWith('app_theme', 'light');
    });
  });

  describe('getThemeColors', () => {
    it('should return light theme colors', () => {
      const service = new ThemeService();
      
      const colors = service.getThemeColors('light');
      
      expect(colors.background).toBe('#ffffff');
      expect(colors.text).toBe('#000000');
      expect(colors.surface).toBe('#f5f5f5');
      expect(colors.primary).toBe('#007AFF');
      expect(colors.secondary).toBe('#6c757d');
      expect(colors.accent).toBe('#28a745');
      expect(colors.warning).toBe('#fd7e14');
      expect(colors.error).toBe('#dc3545');
      expect(colors.border).toBe('#ddd');
    });

    it('should return dark theme colors', () => {
      const service = new ThemeService();
      
      const colors = service.getThemeColors('dark');
      
      expect(colors.background).toBe('#1a1a1a');
      expect(colors.text).toBe('#ffffff');
      expect(colors.surface).toBe('#2d2d2d');
      expect(colors.primary).toBe('#0984ff');
      expect(colors.secondary).toBe('#8e9aaf');
      expect(colors.accent).toBe('#32d74b');
      expect(colors.warning).toBe('#ff9f0a');
      expect(colors.error).toBe('#ff453a');
      expect(colors.border).toBe('#444');
    });
  });

  describe('isSystemDarkMode', () => {
    it('should detect system dark mode when available', () => {
      const service = new ThemeService();
      
      // Mock system dark mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });
      
      const isDark = service.isSystemDarkMode();
      
      expect(isDark).toBe(true);
    });

    it('should return false when system preference unavailable', () => {
      const service = new ThemeService();
      
      // Mock no system preference support
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: undefined,
      });
      
      const isDark = service.isSystemDarkMode();
      
      expect(isDark).toBe(false);
    });
  });

  describe('getSystemTheme', () => {
    it('should return system theme when dark mode detected', () => {
      const service = new ThemeService();
      
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-color-scheme: dark)',
        })),
      });
      
      const theme = service.getSystemTheme();
      
      expect(theme).toBe('dark');
    });

    it('should return light theme when dark mode not detected', () => {
      const service = new ThemeService();
      
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: false,
        })),
      });
      
      const theme = service.getSystemTheme();
      
      expect(theme).toBe('light');
    });
  });
});