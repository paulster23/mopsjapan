// Mock AsyncStorage before imports
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: jest.fn(),
    getAllKeys: jest.fn(),
    clear: jest.fn()
  }
}));

// Simple integration test to verify ThemeContext exists and works
import { ThemeProvider, useTheme } from '../../../src/contexts/ThemeContext';

describe('ThemeContext Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export ThemeProvider and useTheme', () => {
    expect(ThemeProvider).toBeDefined();
    expect(useTheme).toBeDefined();
    expect(typeof ThemeProvider).toBe('function');
    expect(typeof useTheme).toBe('function');
  });
});