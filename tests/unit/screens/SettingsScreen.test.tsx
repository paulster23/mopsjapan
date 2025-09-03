import { LocationOverrideService } from '../../../src/services/LocationOverrideService';
import { DataPersistenceService } from '../../../src/services/DataPersistenceService';

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: mockAsyncStorage,
}));

// Mock DataPersistenceService
jest.mock('../../../src/services/DataPersistenceService');

describe('SettingsScreen Integration', () => {
  let locationService: LocationOverrideService;
  let mockDataService: jest.Mocked<DataPersistenceService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDataService = new DataPersistenceService({} as any) as jest.Mocked<DataPersistenceService>;
    locationService = new LocationOverrideService(mockDataService);
  });

  describe('Location Override Integration', () => {
    it('should enable location override for Tokyo Station', async () => {
      const testLocation = { latitude: 35.6812, longitude: 139.7671, name: 'Tokyo Station' };
      mockDataService.saveGenericData = jest.fn().mockResolvedValue({ success: true });

      await locationService.enableLocationOverride(testLocation);

      expect(locationService.isOverrideActive()).toBe(true);
      expect(locationService.getOverrideLocation()).toEqual(testLocation);
      expect(mockDataService.saveGenericData).toHaveBeenCalledWith('location_override', testLocation);
    });

    it('should disable location override and clear state', async () => {
      const testLocation = { latitude: 35.6812, longitude: 139.7671, name: 'Tokyo Station' };
      mockDataService.saveGenericData = jest.fn().mockResolvedValue({ success: true });
      mockDataService.removeGenericData = jest.fn().mockResolvedValue({ success: true });

      await locationService.enableLocationOverride(testLocation);
      expect(locationService.isOverrideActive()).toBe(true);

      await locationService.disableLocationOverride();

      expect(locationService.isOverrideActive()).toBe(false);
      expect(locationService.getOverrideLocation()).toBeNull();
      expect(mockDataService.removeGenericData).toHaveBeenCalledWith('location_override');
    });

    it('should load persisted override on initialization', async () => {
      const savedLocation = { latitude: 35.6580, longitude: 139.7016, name: 'Shibuya Station' };
      mockDataService.loadGenericData = jest.fn().mockResolvedValue({ 
        success: true, 
        data: savedLocation 
      });

      await locationService.loadPersistedOverride();

      expect(locationService.isOverrideActive()).toBe(true);
      expect(locationService.getOverrideLocation()).toEqual(savedLocation);
    });

    it('should provide preset locations for Tokyo and Osaka', () => {
      const presets = locationService.getPresetLocations();

      expect(presets).toHaveLength(9);
      expect(presets).toEqual([
        { latitude: 35.6580, longitude: 139.7016, name: 'Shibuya Station' },
        { latitude: 35.6812, longitude: 139.7671, name: 'Tokyo Station' },
        { latitude: 35.6896, longitude: 139.7006, name: 'Shinjuku Station' },
        { latitude: 35.6702, longitude: 139.7027, name: 'Harajuku Station' },
        { latitude: 35.6717, longitude: 139.7649, name: 'Ginza' },
        { latitude: 34.7024, longitude: 135.4959, name: 'Osaka Station' },
        { latitude: 34.6678, longitude: 135.5007, name: 'Namba Station' },
        { latitude: 34.6456, longitude: 135.5066, name: 'Tennoji Station' },
        { latitude: 34.7057, longitude: 135.4977, name: 'Umeda' }
      ]);
    });

    it('should validate location coordinates are in Japan', async () => {
      const invalidLocation = { latitude: 40.7128, longitude: -74.0060, name: 'New York' };
      
      await expect(locationService.enableLocationOverride(invalidLocation))
        .rejects.toThrow('Override location must be within Japan');
    });

    it('should handle service state transitions correctly', async () => {
      mockDataService.saveGenericData = jest.fn().mockResolvedValue({ success: true });
      mockDataService.removeGenericData = jest.fn().mockResolvedValue({ success: true });

      // Initially inactive
      expect(locationService.isOverrideActive()).toBe(false);
      expect(locationService.getOverrideLocation()).toBeNull();

      // Enable override
      const tokyo = { latitude: 35.6812, longitude: 139.7671, name: 'Tokyo Station' };
      await locationService.enableLocationOverride(tokyo);
      expect(locationService.isOverrideActive()).toBe(true);
      expect(locationService.getOverrideLocation()).toEqual(tokyo);

      // Switch to different location
      const shibuya = { latitude: 35.6580, longitude: 139.7016, name: 'Shibuya Station' };
      await locationService.enableLocationOverride(shibuya);
      expect(locationService.isOverrideActive()).toBe(true);
      expect(locationService.getOverrideLocation()).toEqual(shibuya);

      // Disable override
      await locationService.disableLocationOverride();
      expect(locationService.isOverrideActive()).toBe(false);
      expect(locationService.getOverrideLocation()).toBeNull();
    });
  });

  describe('SettingsScreen Component Logic', () => {
    it('should exist and be importable', () => {
      // Test that component exists - this validates structure without rendering
      const SettingsScreen = require('../../../src/screens/SettingsScreen').SettingsScreen;
      expect(typeof SettingsScreen).toBe('function');
    });
  });
});