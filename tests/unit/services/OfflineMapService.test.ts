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

import { OfflineMapService } from '../../../src/services/OfflineMapService';

describe('OfflineMapService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cacheSubwayMap', () => {
    it('should cache Tokyo subway map data successfully', async () => {
      const service = new OfflineMapService();
      
      const mockMapData = {
        stations: [
          { id: 'tokyo', name: 'Tokyo Station', latitude: 35.6812, longitude: 139.7671, lines: ['JR Yamanote'] },
          { id: 'shibuya', name: 'Shibuya Station', latitude: 35.6580, longitude: 139.7016, lines: ['JR Yamanote'] }
        ],
        lines: [
          { id: 'jr-yamanote', name: 'JR Yamanote Line', color: '#9ACD32', stations: ['tokyo', 'shibuya'] }
        ],
        version: '1.0.0',
        lastUpdated: new Date().toISOString()
      };

      mockSetItem.mockResolvedValue(undefined);

      const result = await service.cacheSubwayMap(mockMapData);

      expect(result.success).toBe(true);
      expect(mockSetItem).toHaveBeenCalledWith(
        'tokyo_subway_map',
        JSON.stringify(mockMapData)
      );
    });

    it('should handle cache storage errors gracefully', async () => {
      const service = new OfflineMapService();
      
      const mockMapData = {
        stations: [],
        lines: [],
        version: '1.0.0',
        lastUpdated: new Date().toISOString()
      };

      mockSetItem.mockRejectedValue(new Error('Storage error'));

      const result = await service.cacheSubwayMap(mockMapData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to cache subway map');
    });
  });

  describe('getCachedSubwayMap', () => {
    it('should retrieve cached subway map data', async () => {
      const service = new OfflineMapService();
      
      const cachedData = {
        stations: [
          { id: 'tokyo', name: 'Tokyo Station', latitude: 35.6812, longitude: 139.7671, lines: ['JR Yamanote'] }
        ],
        lines: [
          { id: 'jr-yamanote', name: 'JR Yamanote Line', color: '#9ACD32', stations: ['tokyo'] }
        ],
        version: '1.0.0',
        lastUpdated: '2025-09-02T10:00:00Z'
      };

      mockGetItem.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.getCachedSubwayMap();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(cachedData);
      expect(mockGetItem).toHaveBeenCalledWith('tokyo_subway_map');
    });

    it('should handle missing cached data', async () => {
      const service = new OfflineMapService();
      
      mockGetItem.mockResolvedValue(null);

      const result = await service.getCachedSubwayMap();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No cached subway map found');
    });

    it('should handle corrupted cached data', async () => {
      const service = new OfflineMapService();
      
      mockGetItem.mockResolvedValue('invalid-json');

      const result = await service.getCachedSubwayMap();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse cached data');
    });
  });

  describe('isMapDataStale', () => {
    it('should detect stale map data', async () => {
      const service = new OfflineMapService();
      
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 8); // 8 days ago
      
      const staleData = {
        stations: [],
        lines: [],
        version: '1.0.0',
        lastUpdated: staleDate.toISOString()
      };

      const isStale = await service.isMapDataStale(staleData);

      expect(isStale).toBe(true);
    });

    it('should detect fresh map data', async () => {
      const service = new OfflineMapService();
      
      const freshDate = new Date();
      freshDate.setHours(freshDate.getHours() - 1); // 1 hour ago
      
      const freshData = {
        stations: [],
        lines: [],
        version: '1.0.0',
        lastUpdated: freshDate.toISOString()
      };

      const isStale = await service.isMapDataStale(freshData);

      expect(isStale).toBe(false);
    });
  });

  describe('downloadSubwayMapData', () => {
    it('should download fresh Tokyo subway map data from API', async () => {
      const service = new OfflineMapService();
      
      const mockApiResponse = {
        stations: [
          { id: 'tokyo', name: 'Tokyo Station', latitude: 35.6812, longitude: 139.7671, lines: ['JR Yamanote'] },
          { id: 'shinjuku', name: 'Shinjuku Station', latitude: 35.6896, longitude: 139.7006, lines: ['JR Yamanote'] }
        ],
        lines: [
          { id: 'jr-yamanote', name: 'JR Yamanote Line', color: '#9ACD32', stations: ['tokyo', 'shinjuku'] }
        ]
      };

      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse)
      });

      const result = await service.downloadSubwayMapData();

      expect(result.success).toBe(true);
      expect(result.data?.stations).toHaveLength(2);
      expect(result.data?.lines).toHaveLength(1);
      expect(result.data?.version).toBeDefined();
      expect(result.data?.lastUpdated).toBeDefined();
    });

    it('should handle API download failures', async () => {
      const service = new OfflineMapService();
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const result = await service.downloadSubwayMapData();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to download map data');
    });

    it('should handle network errors', async () => {
      const service = new OfflineMapService();
      
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await service.downloadSubwayMapData();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('updateMapDataIfNeeded', () => {
    it('should update map data when stale', async () => {
      const service = new OfflineMapService();
      
      // Mock stale cached data
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 8);
      
      const staleData = {
        stations: [],
        lines: [],
        version: '1.0.0',
        lastUpdated: staleDate.toISOString()
      };

      const freshData = {
        stations: [{ id: 'tokyo', name: 'Tokyo Station', latitude: 35.6812, longitude: 139.7671, lines: ['JR Yamanote'] }],
        lines: [{ id: 'jr-yamanote', name: 'JR Yamanote Line', color: '#9ACD32', stations: ['tokyo'] }],
        version: '1.1.0',
        lastUpdated: new Date().toISOString()
      };

      mockGetItem.mockResolvedValue(JSON.stringify(staleData));
      mockSetItem.mockResolvedValue(undefined);
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          stations: freshData.stations,
          lines: freshData.lines
        })
      });

      const result = await service.updateMapDataIfNeeded();

      expect(result.success).toBe(true);
      expect(result.updated).toBe(true);
      expect(mockSetItem).toHaveBeenCalled();
    });

    it('should skip update when data is fresh', async () => {
      const service = new OfflineMapService();
      
      const freshData = {
        stations: [],
        lines: [],
        version: '1.0.0',
        lastUpdated: new Date().toISOString()
      };

      mockGetItem.mockResolvedValue(JSON.stringify(freshData));

      const result = await service.updateMapDataIfNeeded();

      expect(result.success).toBe(true);
      expect(result.updated).toBe(false);
      expect(mockSetItem).not.toHaveBeenCalled();
    });
  });

  describe('getStationsByArea', () => {
    it('should filter stations by geographic area', async () => {
      const service = new OfflineMapService();
      
      const mapData = {
        stations: [
          { id: 'tokyo', name: 'Tokyo Station', latitude: 35.6812, longitude: 139.7671, lines: ['JR Yamanote'] },
          { id: 'shibuya', name: 'Shibuya Station', latitude: 35.6580, longitude: 139.7016, lines: ['JR Yamanote'] },
          { id: 'osaka', name: 'Osaka Station', latitude: 34.7024, longitude: 135.4959, lines: ['JR Tokaido'] }
        ],
        lines: [],
        version: '1.0.0',
        lastUpdated: new Date().toISOString()
      };

      mockGetItem.mockResolvedValue(JSON.stringify(mapData));

      // Tokyo area bounds
      const bounds = {
        north: 35.8,
        south: 35.5,
        east: 140.0,
        west: 139.0
      };

      const result = await service.getStationsByArea(bounds);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2); // Tokyo and Shibuya, not Osaka
      expect(result.data?.map(s => s.name)).toEqual(['Tokyo Station', 'Shibuya Station']);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached map data', async () => {
      const service = new OfflineMapService();
      
      mockRemoveItem.mockResolvedValue(undefined);

      const result = await service.clearCache();

      expect(result.success).toBe(true);
      expect(mockRemoveItem).toHaveBeenCalledWith('tokyo_subway_map');
    });

    it('should handle cache clear errors', async () => {
      const service = new OfflineMapService();
      
      mockRemoveItem.mockRejectedValue(new Error('Clear error'));

      const result = await service.clearCache();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to clear cache');
    });
  });
});