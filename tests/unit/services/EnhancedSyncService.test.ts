import { EnhancedSyncService, SyncProgress } from '../../../src/services/EnhancedSyncService';
import { MapSyncConfig } from '../../../src/services/MapSyncConfig';
import { SyncStatusService } from '../../../src/services/SyncStatusService';
import { MyMapsImportService } from '../../../src/services/MyMapsImportService';
import { NetlifyApiService } from '../../../src/services/NetlifyApiService';
import { GooglePlacesService } from '../../../src/services/GooglePlacesService';

// Mock dependencies
jest.mock('../../../src/services/MapSyncConfig');
jest.mock('../../../src/services/SyncStatusService');
jest.mock('../../../src/services/MyMapsImportService');
jest.mock('../../../src/services/NetlifyApiService');
jest.mock('../../../src/services/GooglePlacesService');

describe('EnhancedSyncService', () => {
  let service: EnhancedSyncService;
  let mockMapConfig: jest.Mocked<MapSyncConfig>;
  let mockSyncStatus: jest.Mocked<SyncStatusService>;
  let mockImportService: jest.Mocked<MyMapsImportService>;
  let mockApiService: jest.Mocked<NetlifyApiService>;
  let mockGooglePlacesService: jest.Mocked<GooglePlacesService>;

  beforeEach(() => {
    mockMapConfig = new MapSyncConfig() as jest.Mocked<MapSyncConfig>;
    mockSyncStatus = new SyncStatusService() as jest.Mocked<SyncStatusService>;
    mockImportService = new MyMapsImportService() as jest.Mocked<MyMapsImportService>;
    mockApiService = new NetlifyApiService() as jest.Mocked<NetlifyApiService>;
    mockGooglePlacesService = new GooglePlacesService(null as any) as jest.Mocked<GooglePlacesService>;

    service = new EnhancedSyncService(
      mockMapConfig,
      mockSyncStatus,
      mockImportService,
      mockApiService,
      mockGooglePlacesService
    );

    jest.clearAllMocks();
  });

  describe('testConnection', () => {
    it('should successfully test connection to Paul map', async () => {
      mockMapConfig.getMapConfig.mockReturnValue({
        id: 'pauls-map',
        name: "Paul's Map",
        owner: 'Paul',
        mapId: '1o8S4w05Z4gPt7s6mfCoZXT46mOJEtV4'
      });

      mockApiService.fetchMyMapsKML.mockResolvedValue({
        success: true,
        kmlContent: '<kml></kml>',
        mapId: '1o8S4w05Z4gPt7s6mfCoZXT46mOJEtV4',
        fetchedAt: '2025-01-01T12:00:00Z'
      });

      const result = await service.testConnection('pauls-map');

      expect(result.success).toBe(true);
      expect(result.mapName).toBe("Paul's Map");
      expect(mockSyncStatus.updateSyncStatus).toHaveBeenCalledWith(
        'pauls-map', 
        'connecting', 
        "Testing connection to Paul's Map..."
      );
    });

    it('should handle connection failure', async () => {
      mockMapConfig.getMapConfig.mockReturnValue({
        id: 'michelles-map',
        name: "Michelle's Map",
        owner: 'Michelle',
        mapId: '1LQROJade9LoCh-Y1kyXgpKtT-CCRZaU'
      });

      mockApiService.fetchMyMapsKML.mockResolvedValue({
        success: false,
        error: 'Map not found or not accessible',
        details: 'The map may be private'
      });

      const result = await service.testConnection('michelles-map');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Map not found or not accessible');
      expect(mockSyncStatus.updateSyncStatus).toHaveBeenCalledWith(
        'michelles-map', 
        'error', 
        'Map not found or not accessible'
      );
    });

    it('should handle unknown map ID', async () => {
      mockMapConfig.getMapConfig.mockReturnValue(undefined);

      await expect(service.testConnection('unknown-map')).rejects.toThrow('Map configuration not found');
    });
  });

  describe('syncMap', () => {
    it('should perform complete sync with progress updates', async () => {
      const progressUpdates: SyncProgress[] = [];
      const onProgress = jest.fn((progress: SyncProgress) => {
        progressUpdates.push(progress);
      });

      mockMapConfig.getMapConfig.mockReturnValue({
        id: 'pauls-map',
        name: "Paul's Map",
        owner: 'Paul',
        mapId: '1o8S4w05Z4gPt7s6mfCoZXT46mOJEtV4'
      });

      mockApiService.fetchMyMapsKML.mockResolvedValue({
        success: true,
        kmlContent: '<kml><Placemark><name>Test Place</name></Placemark></kml>',
        mapId: '1o8S4w05Z4gPt7s6mfCoZXT46mOJEtV4',
        fetchedAt: '2025-01-01T12:00:00Z'
      });

      mockImportService.parseKMLToPlaces.mockReturnValue([
        {
          id: 'test-place',
          name: 'Test Place',
          category: 'restaurant',
          city: 'Tokyo',
          coordinates: { latitude: 35.6812, longitude: 139.7671 }
        }
      ]);

      mockGooglePlacesService.getPlaceStatistics
        .mockReturnValueOnce({
          total: 24,
          byCategory: {
            accommodation: 4,
            restaurant: 5,
            entertainment: 4,
            transport: 5,
            shopping: 6
          },
          byCity: {
            'Tokyo': 20,
            'Nara': 1,
            'Osaka': 2,
            'Nikko': 1
          }
        })
        .mockReturnValueOnce({
          total: 25,
          byCategory: {
            accommodation: 4,
            restaurant: 6,
            entertainment: 4,
            transport: 5,
            shopping: 6
          },
          byCity: {
            'Tokyo': 21,
            'Nara': 1,
            'Osaka': 2,
            'Nikko': 1
          }
        });

      mockGooglePlacesService.addCustomPlace.mockReturnValue(true);

      const result = await service.syncMap('pauls-map', onProgress);

      expect(result.success).toBe(true);
      expect(result.placesFound).toBe(1);
      expect(onProgress).toHaveBeenCalled();
      expect(progressUpdates).toEqual([
        { phase: 'connecting', message: "Connecting to Paul's Map..." },
        { phase: 'fetching', message: 'Fetching map data...' },
        { phase: 'parsing', message: 'Parsing places data...' },
        { phase: 'processing', message: 'Found 1 places, checking for duplicates...' },
        { phase: 'completing', message: 'Sync completed successfully' }
      ]);
    });

    it('should handle sync failure at connection phase', async () => {
      const onProgress = jest.fn();

      mockMapConfig.getMapConfig.mockReturnValue({
        id: 'pauls-map',
        name: "Paul's Map",
        owner: 'Paul',
        mapId: '1o8S4w05Z4gPt7s6mfCoZXT46mOJEtV4'
      });

      mockApiService.fetchMyMapsKML.mockResolvedValue({
        success: false,
        error: 'Network error'
      });

      const result = await service.syncMap('pauls-map', onProgress);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(mockSyncStatus.recordSyncResult).toHaveBeenCalledWith(
        expect.objectContaining({
          mapId: 'pauls-map',
          success: false,
          error: 'Network error'
        })
      );
    });

    it('should handle empty map response', async () => {
      const onProgress = jest.fn();

      mockMapConfig.getMapConfig.mockReturnValue({
        id: 'pauls-map',
        name: "Paul's Map",
        owner: 'Paul',
        mapId: '1o8S4w05Z4gPt7s6mfCoZXT46mOJEtV4'
      });

      mockApiService.fetchMyMapsKML.mockResolvedValue({
        success: true,
        kmlContent: '<kml></kml>',
        mapId: '1o8S4w05Z4gPt7s6mfCoZXT46mOJEtV4',
        fetchedAt: '2025-01-01T12:00:00Z'
      });

      mockImportService.parseKMLToPlaces.mockReturnValue([]);

      mockGooglePlacesService.getPlaceStatistics.mockReturnValue({
        total: 24,
        byCategory: {
          accommodation: 4,
          restaurant: 5,
          entertainment: 4,
          transport: 5,
          shopping: 6
        },
        byCity: {
          'Tokyo': 20,
          'Nara': 1,
          'Osaka': 2,
          'Nikko': 1
        }
      });

      const result = await service.syncMap('pauls-map', onProgress);

      expect(result.success).toBe(true);
      expect(result.placesFound).toBe(0);
      expect(result.placesAdded).toBe(0);
    });
  });

  describe('syncAllMaps', () => {
    it('should sync both Paul and Michelle maps', async () => {
      const paulConfig = {
        id: 'pauls-map',
        name: "Paul's Map",
        owner: 'Paul',
        mapId: '1o8S4w05Z4gPt7s6mfCoZXT46mOJEtV4'
      };
      const michelleConfig = {
        id: 'michelles-map',
        name: "Michelle's Map",
        owner: 'Michelle',
        mapId: '1LQROJade9LoCh-Y1kyXgpKtT-CCRZaU'
      };

      mockMapConfig.getMapConfigs.mockReturnValue([paulConfig, michelleConfig]);
      
      // Mock getMapConfig for individual calls
      mockMapConfig.getMapConfig
        .mockReturnValueOnce(paulConfig)
        .mockReturnValueOnce(michelleConfig);

      mockApiService.fetchMyMapsKML
        .mockResolvedValueOnce({
          success: true,
          kmlContent: '<kml><Placemark><name>Paul Place</name></Placemark></kml>',
          mapId: '1o8S4w05Z4gPt7s6mfCoZXT46mOJEtV4',
          fetchedAt: '2025-01-01T12:00:00Z'
        })
        .mockResolvedValueOnce({
          success: true,
          kmlContent: '<kml><Placemark><name>Michelle Place</name></Placemark></kml>',
          mapId: '1LQROJade9LoCh-Y1kyXgpKtT-CCRZaU',
          fetchedAt: '2025-01-01T12:05:00Z'
        });

      mockImportService.parseKMLToPlaces
        .mockReturnValueOnce([{ id: 'paul-place', name: 'Paul Place', category: 'restaurant', city: 'Tokyo' } as any])
        .mockReturnValueOnce([{ id: 'michelle-place', name: 'Michelle Place', category: 'restaurant', city: 'Kyoto' } as any]);

      mockGooglePlacesService.getPlaceStatistics.mockReturnValue({
        total: 24,
        byCategory: {
          accommodation: 4,
          restaurant: 5,
          entertainment: 4,
          transport: 5,
          shopping: 6
        },
        byCity: {
          'Tokyo': 20,
          'Nara': 1,
          'Osaka': 2,
          'Nikko': 1
        }
      });

      mockGooglePlacesService.addCustomPlace.mockReturnValue(true);

      const results = await service.syncAllMaps();

      expect(results).toHaveLength(2);
      expect(results[0].mapId).toBe('pauls-map');
      expect(results[1].mapId).toBe('michelles-map');
      expect(results.every((r: any) => r.success)).toBe(true);
    });

    it('should continue syncing other maps when one fails', async () => {
      const paulConfig = { id: 'pauls-map', name: "Paul's Map", owner: 'Paul', mapId: 'paul-id' };
      const michelleConfig = { id: 'michelles-map', name: "Michelle's Map", owner: 'Michelle', mapId: 'michelle-id' };

      mockMapConfig.getMapConfigs.mockReturnValue([paulConfig, michelleConfig]);
      
      // Mock getMapConfig for individual calls
      mockMapConfig.getMapConfig
        .mockReturnValueOnce(paulConfig)
        .mockReturnValueOnce(michelleConfig);

      mockApiService.fetchMyMapsKML
        .mockResolvedValueOnce({ success: false, error: 'Paul map failed' })
        .mockResolvedValueOnce({ 
          success: true, 
          kmlContent: '<kml><Placemark><name>Michelle Place</name></Placemark></kml>',
          mapId: 'michelle-id',
          fetchedAt: '2025-01-01T12:00:00Z'
        });

      mockImportService.parseKMLToPlaces
        .mockReturnValueOnce([{ id: 'michelle-place', name: 'Michelle Place', category: 'restaurant', city: 'Kyoto' } as any]);

      mockGooglePlacesService.getPlaceStatistics.mockReturnValue({
        total: 24,
        byCategory: {
          accommodation: 4,
          restaurant: 5,
          entertainment: 4,
          transport: 5,
          shopping: 6
        },
        byCity: {
          'Tokyo': 20,
          'Nara': 1,
          'Osaka': 2,
          'Nikko': 1
        }
      });

      mockGooglePlacesService.addCustomPlace.mockReturnValue(true);

      const results = await service.syncAllMaps();

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);
    });
  });
});