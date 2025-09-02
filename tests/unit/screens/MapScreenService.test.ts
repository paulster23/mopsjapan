// Mock AsyncStorage for React Native
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

import { MapScreenService } from '../../../src/screens/services/MapScreenService';
import { LocationService } from '../../../src/services/LocationService';
import { TokyoODPTService } from '../../../src/services/TokyoODPTService';

describe('MapScreenService with Offline Map Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findNearbyStationsWithOffline', () => {
    it('should use offline cached data when network is unavailable', async () => {
      const locationService = new LocationService();
      const odptService = new TokyoODPTService();
      const service = new MapScreenService(locationService, odptService);
      
      const userLocation = { latitude: 35.6812, longitude: 139.7671 }; // Tokyo Station
      
      const cachedMapData = {
        stations: [
          { 
            id: 'tokyo', 
            name: 'Tokyo Station', 
            latitude: 35.6812, 
            longitude: 139.7671, 
            lines: ['JR Yamanote'] 
          },
          { 
            id: 'yurakucho', 
            name: 'Yurakucho Station', 
            latitude: 35.6751, 
            longitude: 139.7630, 
            lines: ['JR Yamanote'] 
          }
        ],
        lines: [
          { 
            id: 'jr-yamanote', 
            name: 'JR Yamanote Line', 
            color: '#9ACD32', 
            stations: ['tokyo', 'yurakucho'] 
          }
        ],
        version: '1.0.0',
        lastUpdated: new Date().toISOString()
      };

      mockGetItem.mockResolvedValue(JSON.stringify(cachedMapData));

      const result = await service.findNearbyStationsWithOffline(userLocation, 2.0);

      expect(result.success).toBe(true);
      expect(result.stations).toHaveLength(2);
      expect(result.stations?.[0].name).toBe('Tokyo Station');
      expect(result.fromCache).toBe(true);
    });

    it('should fall back to cached data when API fails', async () => {
      const locationService = new LocationService();
      const odptService = new TokyoODPTService();
      const service = new MapScreenService(locationService, odptService);
      
      const userLocation = { latitude: 35.6812, longitude: 139.7671 };
      
      const cachedMapData = {
        stations: [
          { 
            id: 'tokyo', 
            name: 'Tokyo Station', 
            latitude: 35.6812, 
            longitude: 139.7671, 
            lines: ['JR Yamanote'] 
          }
        ],
        lines: [],
        version: '1.0.0',
        lastUpdated: new Date().toISOString()
      };

      mockGetItem.mockResolvedValue(JSON.stringify(cachedMapData));

      const result = await service.findNearbyStationsWithOffline(userLocation, 2.0);

      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(true);
      expect(result.error).toContain('API unavailable');
    });

    it('should return error when no cache and API fails', async () => {
      const locationService = new LocationService();
      const odptService = new TokyoODPTService();
      const service = new MapScreenService(locationService, odptService);
      
      const userLocation = { latitude: 35.6812, longitude: 139.7671 };

      mockGetItem.mockResolvedValue(null); // No cache

      const result = await service.findNearbyStationsWithOffline(userLocation, 2.0);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No cached data available');
    });
  });
});