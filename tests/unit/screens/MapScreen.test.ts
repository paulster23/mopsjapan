import { MapScreenService } from '../../../src/screens/services/MapScreenService';
import { LocationService } from '../../../src/services/LocationService';
import { TokyoODPTService } from '../../../src/services/TokyoODPTService';
import { RouteCalculationService } from '../../../src/services/RouteCalculationService';

// Mock services
jest.mock('../../../src/services/LocationService');
jest.mock('../../../src/services/TokyoODPTService');
jest.mock('../../../src/services/RouteCalculationService');

describe('MapScreenService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset global navigator to undefined before each test
    delete (global as any).navigator;
  });

  describe('getUserLocation', () => {
    it('should request user location and validate coordinates', async () => {
      // Mock geolocation API FIRST before any service instantiation
      const mockGeolocation = {
        getCurrentPosition: jest.fn((success) => {
          success({
            coords: {
              latitude: 35.6762,
              longitude: 139.6503,
              accuracy: 10
            }
          });
        })
      };
      
      // @ts-ignore
      global.navigator = { geolocation: mockGeolocation };

      const mockLocationService = new LocationService() as jest.Mocked<LocationService>;
      mockLocationService.validateCoordinates.mockReturnValue({
        isValid: true,
        latitude: 35.6762,
        longitude: 139.6503
      });
      mockLocationService.isInJapan.mockReturnValue(true);

      const mapService = new MapScreenService(mockLocationService);

      const result = await mapService.getUserLocation();

      expect(result.success).toBe(true);
      expect(result.location).toEqual({
        latitude: 35.6762,
        longitude: 139.6503
      });
      expect(mockLocationService.validateCoordinates).toHaveBeenCalledWith(35.6762, 139.6503);
    });

    it('should handle location permission denied', async () => {
      // Mock geolocation API FIRST before any service instantiation
      const mockGeolocation = {
        getCurrentPosition: jest.fn((success, error) => {
          error({
            code: 1,
            message: 'Permission denied'
          });
        })
      };
      
      // @ts-ignore
      global.navigator = { geolocation: mockGeolocation };

      const mockLocationService = new LocationService() as jest.Mocked<LocationService>;
      const mapService = new MapScreenService(mockLocationService);

      const result = await mapService.getUserLocation();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Location permission denied');
    });

    it('should validate location is in Japan', async () => {
      // Mock geolocation API FIRST before any service instantiation
      const mockGeolocation = {
        getCurrentPosition: jest.fn((success) => {
          success({
            coords: {
              latitude: 40.7128,
              longitude: -74.0060,
              accuracy: 10
            }
          });
        })
      };
      
      // @ts-ignore
      global.navigator = { geolocation: mockGeolocation };

      const mockLocationService = new LocationService() as jest.Mocked<LocationService>;
      mockLocationService.validateCoordinates.mockReturnValue({
        isValid: true,
        latitude: 40.7128,
        longitude: -74.0060
      });
      mockLocationService.isInJapan.mockReturnValue(false);

      const mapService = new MapScreenService(mockLocationService);

      const result = await mapService.getUserLocation();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Location is not in Japan');
    });
  });

  describe('findNearbyStations', () => {
    it('should return nearby subway stations for Tokyo location', () => {
      const mockLocationService = new LocationService() as jest.Mocked<LocationService>;
      mockLocationService.calculateDistance.mockImplementation((lat1, lon1, lat2, lon2) => {
        // Mock distance calculation - Tokyo Station is ~1km from test location
        if (lat2 === 35.6812 && lon2 === 139.7671) return 1.2;
        if (lat2 === 35.6580 && lon2 === 139.7016) return 2.8; // Shibuya
        return 5.0; // Default distance
      });

      const mapService = new MapScreenService(mockLocationService);
      
      const userLocation = { latitude: 35.6762, longitude: 139.6503 };
      const stations = mapService.findNearbyStations(userLocation, 3.0); // 3km radius

      expect(stations).toHaveLength(2);
      expect(stations[0].name).toBe('Tokyo Station');
      expect(stations[0].distance).toBe(1.2);
      expect(stations[1].name).toBe('Shibuya Station');
      expect(stations[1].distance).toBe(2.8);
    });

    it('should filter stations by distance radius', () => {
      const mockLocationService = new LocationService() as jest.Mocked<LocationService>;
      mockLocationService.calculateDistance.mockReturnValue(5.0); // All stations far away

      const mapService = new MapScreenService(mockLocationService);
      
      const userLocation = { latitude: 35.6762, longitude: 139.6503 };
      const stations = mapService.findNearbyStations(userLocation, 3.0); // 3km radius

      expect(stations).toHaveLength(0);
    });

    it('should sort stations by distance ascending', () => {
      const mockLocationService = new LocationService() as jest.Mocked<LocationService>;
      mockLocationService.calculateDistance.mockImplementation((lat1, lon1, lat2, lon2) => {
        if (lat2 === 35.6812 && lon2 === 139.7671) return 2.5; // Tokyo Station
        if (lat2 === 35.6580 && lon2 === 139.7016) return 1.1; // Shibuya (closer)
        return 5.0;
      });

      const mapService = new MapScreenService(mockLocationService);
      
      const userLocation = { latitude: 35.6762, longitude: 139.6503 };
      const stations = mapService.findNearbyStations(userLocation, 3.0);

      expect(stations).toHaveLength(2);
      expect(stations[0].name).toBe('Shibuya Station');
      expect(stations[0].distance).toBe(1.1);
      expect(stations[1].name).toBe('Tokyo Station');
      expect(stations[1].distance).toBe(2.5);
    });
  });

  describe('getMapRegion', () => {
    it('should return appropriate map region for user location', () => {
      const mapService = new MapScreenService(new LocationService());
      
      const userLocation = { latitude: 35.6762, longitude: 139.6503 };
      const region = mapService.getMapRegion(userLocation);

      expect(region).toEqual({
        latitude: 35.6762,
        longitude: 139.6503,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421
      });
    });

    it('should return default Tokyo region when no location provided', () => {
      const mapService = new MapScreenService(new LocationService());
      
      const region = mapService.getMapRegion();

      expect(region).toEqual({
        latitude: 35.6762,
        longitude: 139.6503,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421
      });
    });
  });

  describe('formatLocationForDisplay', () => {
    it('should format coordinates with appropriate precision', () => {
      const mapService = new MapScreenService(new LocationService());
      
      const formatted = mapService.formatLocationForDisplay(35.676234567, 139.650312345);

      expect(formatted).toBe('35.6762, 139.6503');
    });

    it('should handle negative coordinates', () => {
      const mapService = new MapScreenService(new LocationService());
      
      const formatted = mapService.formatLocationForDisplay(-35.6762, -139.6503);

      expect(formatted).toBe('-35.6762, -139.6503');
    });
  });

  describe('getStationStatus', () => {
    it('should fetch real-time status for a station', async () => {
      const mockLocationService = new LocationService() as jest.Mocked<LocationService>;
      const mockOdptService = new TokyoODPTService() as jest.Mocked<TokyoODPTService>;
      mockOdptService.getStationStatus.mockResolvedValue({
        stationId: 'odpt.Station:JR-East.Tokaido.Tokyo',
        status: 'Normal',
        delays: [],
        lastUpdated: '2025-09-02T10:30:00Z'
      });

      const mapService = new MapScreenService(mockLocationService, mockOdptService);
      
      const status = await mapService.getStationStatus('Tokyo Station');

      expect(status.status).toBe('Normal');
      expect(mockOdptService.getStationStatus).toHaveBeenCalledWith('Tokyo Station');
    });

    it('should handle station status fetch errors', async () => {
      const mockLocationService = new LocationService() as jest.Mocked<LocationService>;
      const mockOdptService = new TokyoODPTService() as jest.Mocked<TokyoODPTService>;
      mockOdptService.getStationStatus.mockRejectedValue(new Error('API unavailable'));

      const mapService = new MapScreenService(mockLocationService, mockOdptService);
      
      const status = await mapService.getStationStatus('Tokyo Station');

      expect(status.status).toBe('Unknown');
      expect(status.stationId).toBe('');
    });
  });

  describe('getNearbyStationsWithStatus', () => {
    it('should return stations with real-time status information', async () => {
      const mockLocationService = new LocationService() as jest.Mocked<LocationService>;
      const mockOdptService = new TokyoODPTService() as jest.Mocked<TokyoODPTService>;
      
      mockLocationService.calculateDistance.mockImplementation((lat1, lon1, lat2, lon2) => {
        if (lat2 === 35.6812 && lon2 === 139.7671) return 1.2; // Tokyo Station
        return 5.0;
      });

      mockOdptService.getStationStatus.mockResolvedValue({
        stationId: 'odpt.Station:JR-East.Tokaido.Tokyo',
        status: 'Delayed',
        delays: [{ line: 'JR Tokaido Line', delayMinutes: 5, reason: 'Signal adjustment' }],
        lastUpdated: '2025-09-02T10:30:00Z'
      });

      const mapService = new MapScreenService(mockLocationService, mockOdptService);
      
      const userLocation = { latitude: 35.6762, longitude: 139.6503 };
      const stationsWithStatus = await mapService.getNearbyStationsWithStatus(userLocation, 3.0);

      expect(stationsWithStatus).toHaveLength(1);
      expect(stationsWithStatus[0].name).toBe('Tokyo Station');
      expect(stationsWithStatus[0].status).toBe('Delayed');
      expect(stationsWithStatus[0].delays).toHaveLength(1);
      expect(stationsWithStatus[0].delays[0].delayMinutes).toBe(5);
    });
  });

  describe('getRouteOptions', () => {
    it('should calculate route options between two locations', async () => {
      const mockLocationService = new LocationService() as jest.Mocked<LocationService>;
      const mockOdptService = new TokyoODPTService() as jest.Mocked<TokyoODPTService>;
      const mockRouteService = new RouteCalculationService(mockLocationService, {} as any) as jest.Mocked<RouteCalculationService>;
      
      mockRouteService.getRouteOptions.mockResolvedValue([
        {
          type: 'transit',
          route: {
            segments: [{ line: 'JR Yamanote Line', fromStation: 'Tokyo', toStation: 'Shibuya', duration: 15, stationCount: 5 }],
            totalDuration: 15,
            totalDistance: 6.2,
            transferCount: 0
          },
          duration: 15,
          distance: 6.2
        },
        {
          type: 'walking',
          walkingRoute: { distance: 6.2, duration: 74, mode: 'walking' },
          duration: 74,
          distance: 6.2
        }
      ]);

      const mapService = new MapScreenService(mockLocationService, mockOdptService, mockRouteService);
      
      const fromLocation = { latitude: 35.6812, longitude: 139.7671 };
      const toLocation = { latitude: 35.6580, longitude: 139.7016 };
      const routeOptions = await mapService.getRouteOptions(fromLocation, toLocation);

      expect(routeOptions).toHaveLength(2);
      expect(routeOptions[0].type).toBe('transit');
      expect(routeOptions[0].duration).toBe(15);
      expect(routeOptions[1].type).toBe('walking');
      expect(routeOptions[1].duration).toBe(74);
    });

    it('should handle route calculation errors', async () => {
      const mockLocationService = new LocationService() as jest.Mocked<LocationService>;
      const mockOdptService = new TokyoODPTService() as jest.Mocked<TokyoODPTService>;
      const mockRouteService = new RouteCalculationService(mockLocationService, {} as any) as jest.Mocked<RouteCalculationService>;
      
      mockRouteService.getRouteOptions.mockRejectedValue(new Error('Route calculation failed'));

      const mapService = new MapScreenService(mockLocationService, mockOdptService, mockRouteService);
      
      const fromLocation = { latitude: 35.6812, longitude: 139.7671 };
      const toLocation = { latitude: 35.6580, longitude: 139.7016 };
      const routeOptions = await mapService.getRouteOptions(fromLocation, toLocation);

      expect(routeOptions).toEqual([]);
    });
  });

  describe('getDirections', () => {
    it('should generate turn-by-turn directions for a route', async () => {
      const mockLocationService = new LocationService() as jest.Mocked<LocationService>;
      const mockOdptService = new TokyoODPTService() as jest.Mocked<TokyoODPTService>;
      const mockRouteService = new RouteCalculationService(mockLocationService, {} as any) as jest.Mocked<RouteCalculationService>;

      const mapService = new MapScreenService(mockLocationService, mockOdptService, mockRouteService);
      
      const route = {
        segments: [
          { line: 'JR Yamanote Line', fromStation: 'Tokyo', toStation: 'Shibuya', duration: 15, stationCount: 5 }
        ],
        totalDuration: 15,
        totalDistance: 6.2,
        transferCount: 0
      };

      const directions = await mapService.getDirections(route);

      expect(directions).toHaveLength(3);
      expect(directions[0].type).toBe('walk');
      expect(directions[0].instruction).toContain('Walk to Tokyo Station');
      expect(directions[1].type).toBe('transit');
      expect(directions[1].instruction).toContain('Take JR Yamanote Line');
      expect(directions[2].type).toBe('walk');
      expect(directions[2].instruction).toContain('Walk to destination from Shibuya Station');
    });

    it('should handle multi-segment routes with transfers', async () => {
      const mockLocationService = new LocationService() as jest.Mocked<LocationService>;
      const mockOdptService = new TokyoODPTService() as jest.Mocked<TokyoODPTService>;
      const mockRouteService = new RouteCalculationService(mockLocationService, {} as any) as jest.Mocked<RouteCalculationService>;

      const mapService = new MapScreenService(mockLocationService, mockOdptService, mockRouteService);
      
      const route = {
        segments: [
          { line: 'JR Yamanote Line', fromStation: 'Tokyo', toStation: 'Shimbashi', duration: 5, stationCount: 2 },
          { line: 'Toei Asakusa Line', fromStation: 'Shimbashi', toStation: 'Asakusa', duration: 12, stationCount: 6, transferTime: 3 }
        ],
        totalDuration: 20,
        totalDistance: 8.5,
        transferCount: 1
      };

      const directions = await mapService.getDirections(route);

      expect(directions).toHaveLength(5);
      expect(directions[0].instruction).toContain('Walk to Tokyo Station');
      expect(directions[1].instruction).toContain('Take JR Yamanote Line to Shimbashi');
      expect(directions[2].instruction).toContain('Transfer to Toei Asakusa Line');
      expect(directions[3].instruction).toContain('Take Toei Asakusa Line to Asakusa');
      expect(directions[4].instruction).toContain('Walk to destination');
    });
  });
});