import { LocationOverrideService } from '../../../src/services/LocationOverrideService';
import { DataPersistenceService } from '../../../src/services/DataPersistenceService';

// Mock DataPersistenceService
jest.mock('../../../src/services/DataPersistenceService');

describe('LocationOverrideService', () => {
  let service: LocationOverrideService;
  let mockDataService: jest.Mocked<DataPersistenceService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDataService = new DataPersistenceService({} as any) as jest.Mocked<DataPersistenceService>;
    service = new LocationOverrideService(mockDataService);
  });

  describe('isOverrideActive', () => {
    it('should return false by default', () => {
      expect(service.isOverrideActive()).toBe(false);
    });

    it('should return true when override is enabled', async () => {
      const testLocation = { latitude: 35.6812, longitude: 139.7671, name: 'Tokyo Station' };
      await service.enableLocationOverride(testLocation);
      
      expect(service.isOverrideActive()).toBe(true);
    });
  });

  describe('enableLocationOverride', () => {
    it('should enable override with provided location', async () => {
      const testLocation = { latitude: 35.6812, longitude: 139.7671, name: 'Tokyo Station' };
      mockDataService.saveGenericData = jest.fn().mockResolvedValue({ success: true });

      await service.enableLocationOverride(testLocation);

      expect(service.isOverrideActive()).toBe(true);
      expect(service.getOverrideLocation()).toEqual(testLocation);
      expect(mockDataService.saveGenericData).toHaveBeenCalledWith('location_override', testLocation);
    });

    it('should validate location is in Japan', async () => {
      const invalidLocation = { latitude: 40.7128, longitude: -74.0060, name: 'New York' };
      
      await expect(service.enableLocationOverride(invalidLocation))
        .rejects.toThrow('Override location must be within Japan');
    });

    it('should validate coordinates are valid', async () => {
      const invalidLocation = { latitude: 91, longitude: 139.7671, name: 'Invalid' };
      
      await expect(service.enableLocationOverride(invalidLocation))
        .rejects.toThrow('Invalid coordinates provided');
    });
  });

  describe('disableLocationOverride', () => {
    it('should disable override and clear location', async () => {
      const testLocation = { latitude: 35.6812, longitude: 139.7671, name: 'Tokyo Station' };
      mockDataService.saveGenericData = jest.fn().mockResolvedValue({ success: true });
      mockDataService.removeGenericData = jest.fn().mockResolvedValue({ success: true });

      await service.enableLocationOverride(testLocation);
      expect(service.isOverrideActive()).toBe(true);

      await service.disableLocationOverride();

      expect(service.isOverrideActive()).toBe(false);
      expect(service.getOverrideLocation()).toBeNull();
      expect(mockDataService.removeGenericData).toHaveBeenCalledWith('location_override');
    });
  });

  describe('getOverrideLocation', () => {
    it('should return null when no override is active', () => {
      expect(service.getOverrideLocation()).toBeNull();
    });

    it('should return current override location', async () => {
      const testLocation = { latitude: 35.6580, longitude: 139.7016, name: 'Shibuya Station' };
      mockDataService.saveGenericData = jest.fn().mockResolvedValue({ success: true });

      await service.enableLocationOverride(testLocation);

      expect(service.getOverrideLocation()).toEqual(testLocation);
    });
  });

  describe('getPresetLocations', () => {
    it('should return predefined Tokyo and Osaka locations', () => {
      const presets = service.getPresetLocations();

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
  });

  describe('loadPersistedOverride', () => {
    it('should load override from storage on initialization', async () => {
      const savedLocation = { latitude: 35.6812, longitude: 139.7671, name: 'Tokyo Station' };
      mockDataService.loadGenericData = jest.fn().mockResolvedValue({ 
        success: true, 
        data: savedLocation 
      });

      await service.loadPersistedOverride();

      expect(service.isOverrideActive()).toBe(true);
      expect(service.getOverrideLocation()).toEqual(savedLocation);
    });

    it('should handle missing storage data gracefully', async () => {
      mockDataService.loadGenericData = jest.fn().mockResolvedValue({ success: false });

      await service.loadPersistedOverride();

      expect(service.isOverrideActive()).toBe(false);
    });
  });
});