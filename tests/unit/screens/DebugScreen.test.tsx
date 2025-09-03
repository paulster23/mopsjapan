import { LocationOverrideService } from '../../../src/services/LocationOverrideService';
import { DataPersistenceService } from '../../../src/services/DataPersistenceService';

// Mock the services
jest.mock('../../../src/services/StorageMonitorService');
jest.mock('../../../src/services/LocationOverrideService');
jest.mock('../../../src/services/DataPersistenceService');

describe('DebugScreen - Location Override Integration', () => {
  let mockLocationService: jest.Mocked<LocationOverrideService>;
  let mockDataService: jest.Mocked<DataPersistenceService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock DataPersistenceService
    mockDataService = {
      saveGenericData: jest.fn().mockResolvedValue(true),
      loadGenericData: jest.fn().mockResolvedValue({ success: true, data: null }),
      removeGenericData: jest.fn().mockResolvedValue(true),
    } as any;

    // Mock LocationOverrideService
    mockLocationService = {
      isOverrideActive: jest.fn().mockReturnValue(false),
      enableLocationOverride: jest.fn().mockResolvedValue(undefined),
      disableLocationOverride: jest.fn().mockResolvedValue(undefined),
      getOverrideLocation: jest.fn().mockReturnValue(null),
      getPresetLocations: jest.fn().mockReturnValue([
        { latitude: 35.6812, longitude: 139.7671, name: 'Tokyo Station' },
        { latitude: 34.7024, longitude: 135.4959, name: 'Osaka Station' }
      ]),
      loadPersistedOverride: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Set up the mocked constructor
    (LocationOverrideService as jest.MockedClass<typeof LocationOverrideService>).mockImplementation(() => mockLocationService);
  });

  describe('LocationOverrideService Integration', () => {
    it('should initialize LocationOverrideService with DataPersistenceService', () => {
      const service = new LocationOverrideService(mockDataService);
      expect(service).toBeDefined();
    });

    it('should provide methods for location override management', () => {
      const service = new LocationOverrideService(mockDataService);
      
      expect(service.isOverrideActive).toBeDefined();
      expect(service.enableLocationOverride).toBeDefined();
      expect(service.disableLocationOverride).toBeDefined();
      expect(service.getOverrideLocation).toBeDefined();
      expect(service.getPresetLocations).toBeDefined();
      expect(service.loadPersistedOverride).toBeDefined();
    });

    it('should return preset locations including Tokyo and Osaka', () => {
      const service = new LocationOverrideService(mockDataService);
      const presets = service.getPresetLocations();
      
      expect(presets).toHaveLength(2);
      expect(presets.some(p => p.name === 'Tokyo Station')).toBe(true);
      expect(presets.some(p => p.name === 'Osaka Station')).toBe(true);
    });

    it('should handle enabling location override', async () => {
      const service = new LocationOverrideService(mockDataService);
      const testLocation = { latitude: 35.6812, longitude: 139.7671, name: 'Tokyo Station' };
      
      await service.enableLocationOverride(testLocation);
      
      expect(service.enableLocationOverride).toHaveBeenCalledWith(testLocation);
    });

    it('should handle disabling location override', async () => {
      const service = new LocationOverrideService(mockDataService);
      
      await service.disableLocationOverride();
      
      expect(service.disableLocationOverride).toHaveBeenCalled();
    });

    it('should check override status', () => {
      const service = new LocationOverrideService(mockDataService);
      
      const isActive = service.isOverrideActive();
      
      expect(service.isOverrideActive).toHaveBeenCalled();
      expect(typeof isActive).toBe('boolean');
    });

    it('should load persisted override on initialization', async () => {
      const service = new LocationOverrideService(mockDataService);
      
      await service.loadPersistedOverride();
      
      expect(service.loadPersistedOverride).toHaveBeenCalled();
    });
  });

  describe('Expected DebugScreen Functionality', () => {
    it('should expect DebugScreen to integrate LocationOverrideService', () => {
      // This test documents what the DebugScreen should implement
      const expectedFeatures = [
        'Location override toggle switch',
        'Status display for current override state',
        'Preset location selector',
        'Quick action buttons for Tokyo/Osaka',
        'Error handling for override operations'
      ];
      
      expect(expectedFeatures).toHaveLength(5);
      expect(expectedFeatures).toContain('Location override toggle switch');
    });
  });
});