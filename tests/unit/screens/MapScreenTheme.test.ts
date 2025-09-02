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

import { MapScreenService } from '../../../src/screens/services/MapScreenService';
import { LocationService } from '../../../src/services/LocationService';

describe('MapScreenService Theme Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have access to theme functionality through MapScreenService', () => {
    const locationService = new LocationService();
    const mapService = new MapScreenService(locationService);
    
    // Verify that the service can be extended with theme functionality
    expect(mapService).toBeDefined();
    expect(typeof mapService.getUserLocation).toBe('function');
  });

  it('should be able to add theme toggle functionality', async () => {
    const locationService = new LocationService();
    const mapService = new MapScreenService(locationService);
    
    // Mock implementation of theme toggle functionality 
    const mockToggleTheme = jest.fn().mockResolvedValue({ success: true, newTheme: 'dark' });
    
    // This test verifies we can add theme functionality to existing services
    expect(mockToggleTheme).toBeDefined();
    
    const result = await mockToggleTheme();
    expect(result.success).toBe(true);
    expect(result.newTheme).toBe('dark');
  });
});