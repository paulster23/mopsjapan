import { RouteCalculationService } from '../../../src/services/RouteCalculationService';
import { LocationService } from '../../../src/services/LocationService';
import { StationFinderService } from '../../../src/services/StationFinderService';

// Mock dependencies
jest.mock('../../../src/services/LocationService');
jest.mock('../../../src/services/StationFinderService');

describe('RouteCalculationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateRoute', () => {
    it('should calculate direct route between two nearby stations', async () => {
      const mockLocationService = new LocationService() as jest.Mocked<LocationService>;
      const mockStationFinder = new StationFinderService(mockLocationService) as jest.Mocked<StationFinderService>;
      
      // Mock station data
      const tokyoStation = {
        id: 'tokyo-station',
        name: 'Tokyo Station',
        latitude: 35.6812,
        longitude: 139.7671,
        lines: ['JR Yamanote', 'Marunouchi Line'],
        distance: 0
      };
      
      const ginzaStation = {
        id: 'ginza-station',
        name: 'Ginza Station',
        latitude: 35.6717,
        longitude: 139.7640,
        lines: ['Ginza Line', 'Marunouchi Line'],
        distance: 0
      };

      mockStationFinder.findNearestStation
        .mockReturnValueOnce(tokyoStation)
        .mockReturnValueOnce(ginzaStation);

      const routeService = new RouteCalculationService(mockLocationService, mockStationFinder);
      
      const fromLocation = { latitude: 35.6812, longitude: 139.7671 };
      const toLocation = { latitude: 35.6717, longitude: 139.7640 };

      const route = await routeService.calculateRoute(fromLocation, toLocation);

      expect(route.success).toBe(true);
      expect(route.route).toBeDefined();
      expect(route.route?.segments).toHaveLength(1);
      expect(route.route?.segments[0].line).toBe('Marunouchi Line');
      expect(route.route?.segments[0].fromStation).toBe('Tokyo Station');
      expect(route.route?.segments[0].toStation).toBe('Ginza Station');
    });

    it('should calculate route with transfer between different lines', async () => {
      const mockLocationService = new LocationService() as jest.Mocked<LocationService>;
      const mockStationFinder = new StationFinderService(mockLocationService) as jest.Mocked<StationFinderService>;
      
      // Mock distance calculation for route calculation
      mockLocationService.calculateDistance
        .mockReturnValueOnce(5.2) // Distance between locations
        .mockReturnValueOnce(5.2); // Distance for station count estimation
      
      const tokyoStation = {
        id: 'tokyo-station',
        name: 'Tokyo Station',
        latitude: 35.6812,
        longitude: 139.7671,
        lines: ['JR Yamanote', 'Marunouchi Line'],
        distance: 0
      };
      
      const shibuyaStation = {
        id: 'shibuya-station',
        name: 'Shibuya Station',
        latitude: 35.6580,
        longitude: 139.7016,
        lines: ['JR Yamanote', 'Ginza Line'],
        distance: 0
      };

      mockStationFinder.findNearestStation
        .mockReturnValueOnce(tokyoStation)
        .mockReturnValueOnce(shibuyaStation);

      const routeService = new RouteCalculationService(mockLocationService, mockStationFinder);
      
      const fromLocation = { latitude: 35.6812, longitude: 139.7671 };
      const toLocation = { latitude: 35.6580, longitude: 139.7016 };

      const route = await routeService.calculateRoute(fromLocation, toLocation);

      expect(route.success).toBe(true);
      expect(route.route).toBeDefined();
      expect(route.route?.segments).toHaveLength(1);
      expect(route.route?.segments[0].line).toBe('JR Yamanote');
      expect(route.route?.totalDuration).toBeGreaterThan(0);
      expect(route.route?.totalDistance).toBeGreaterThan(0);
    });

    it('should handle no route found between stations', async () => {
      const mockLocationService = new LocationService() as jest.Mocked<LocationService>;
      const mockStationFinder = new StationFinderService(mockLocationService) as jest.Mocked<StationFinderService>;
      
      const isolatedStation = {
        id: 'isolated-station',
        name: 'Isolated Station',
        latitude: 35.0000,
        longitude: 139.0000,
        lines: ['Isolated Line'],
        distance: 0
      };
      
      const tokyoStation = {
        id: 'tokyo-station',
        name: 'Tokyo Station',
        latitude: 35.6812,
        longitude: 139.7671,
        lines: ['JR Yamanote', 'Marunouchi Line'],
        distance: 0
      };

      mockStationFinder.findNearestStation
        .mockReturnValueOnce(isolatedStation)
        .mockReturnValueOnce(tokyoStation);

      const routeService = new RouteCalculationService(mockLocationService, mockStationFinder);
      
      const fromLocation = { latitude: 35.0000, longitude: 139.0000 };
      const toLocation = { latitude: 35.6812, longitude: 139.7671 };

      const route = await routeService.calculateRoute(fromLocation, toLocation);

      expect(route.success).toBe(false);
      expect(route.error).toBe('No route found between stations');
      expect(route.route).toBeUndefined();
    });

    it('should return error when nearest station not found', async () => {
      const mockLocationService = new LocationService() as jest.Mocked<LocationService>;
      const mockStationFinder = new StationFinderService(mockLocationService) as jest.Mocked<StationFinderService>;

      mockStationFinder.findNearestStation.mockReturnValue(null);

      const routeService = new RouteCalculationService(mockLocationService, mockStationFinder);
      
      const fromLocation = { latitude: 35.6812, longitude: 139.7671 };
      const toLocation = { latitude: 35.6717, longitude: 139.7640 };

      const route = await routeService.calculateRoute(fromLocation, toLocation);

      expect(route.success).toBe(false);
      expect(route.error).toBe('Cannot find nearest stations');
    });
  });

  describe('calculateWalkingRoute', () => {
    it('should calculate walking route with duration and distance', () => {
      const mockLocationService = new LocationService() as jest.Mocked<LocationService>;
      const mockStationFinder = new StationFinderService(mockLocationService) as jest.Mocked<StationFinderService>;
      
      mockLocationService.calculateDistance.mockReturnValue(1.2); // 1.2km

      const routeService = new RouteCalculationService(mockLocationService, mockStationFinder);
      
      const fromLocation = { latitude: 35.6812, longitude: 139.7671 };
      const toLocation = { latitude: 35.6717, longitude: 139.7640 };

      const walkingRoute = routeService.calculateWalkingRoute(fromLocation, toLocation);

      expect(walkingRoute.distance).toBe(1.2);
      expect(walkingRoute.duration).toBe(14); // ~14 minutes for 1.2km
      expect(walkingRoute.mode).toBe('walking');
    });

    it('should handle zero distance', () => {
      const mockLocationService = new LocationService() as jest.Mocked<LocationService>;
      const mockStationFinder = new StationFinderService(mockLocationService) as jest.Mocked<StationFinderService>;
      
      mockLocationService.calculateDistance.mockReturnValue(0);

      const routeService = new RouteCalculationService(mockLocationService, mockStationFinder);
      
      const fromLocation = { latitude: 35.6812, longitude: 139.7671 };
      const toLocation = { latitude: 35.6812, longitude: 139.7671 };

      const walkingRoute = routeService.calculateWalkingRoute(fromLocation, toLocation);

      expect(walkingRoute.distance).toBe(0);
      expect(walkingRoute.duration).toBe(0);
    });
  });

  describe('findCommonLines', () => {
    it('should find common transit lines between stations', () => {
      const routeService = new RouteCalculationService(
        new LocationService(),
        new StationFinderService(new LocationService())
      );

      const fromLines = ['JR Yamanote', 'Marunouchi Line', 'JR Tokaido'];
      const toLines = ['JR Yamanote', 'Ginza Line', 'Hanzomon Line'];

      const commonLines = routeService.findCommonLines(fromLines, toLines);

      expect(commonLines).toEqual(['JR Yamanote']);
    });

    it('should return empty array when no common lines', () => {
      const routeService = new RouteCalculationService(
        new LocationService(),
        new StationFinderService(new LocationService())
      );

      const fromLines = ['Marunouchi Line', 'JR Tokaido'];
      const toLines = ['Ginza Line', 'Hanzomon Line'];

      const commonLines = routeService.findCommonLines(fromLines, toLines);

      expect(commonLines).toEqual([]);
    });
  });

  describe('estimateTransitTime', () => {
    it('should estimate time based on station count and line type', () => {
      const routeService = new RouteCalculationService(
        new LocationService(),
        new StationFinderService(new LocationService())
      );

      const jrTime = routeService.estimateTransitTime('JR Yamanote', 5);
      const subwayTime = routeService.estimateTransitTime('Ginza Line', 5);

      expect(jrTime).toBe(15); // 5 stations * 3 min avg for JR
      expect(subwayTime).toBe(10); // 5 stations * 2 min avg for subway
    });

    it('should handle minimum time for single station', () => {
      const routeService = new RouteCalculationService(
        new LocationService(),
        new StationFinderService(new LocationService())
      );

      const time = routeService.estimateTransitTime('JR Yamanote', 0);

      expect(time).toBe(5); // minimum 5 minutes
    });
  });

  describe('getRouteOptions', () => {
    it('should provide multiple route options sorted by preference', async () => {
      const mockLocationService = new LocationService() as jest.Mocked<LocationService>;
      const mockStationFinder = new StationFinderService(mockLocationService) as jest.Mocked<StationFinderService>;
      
      mockLocationService.calculateDistance.mockReturnValue(2.5);
      
      const tokyoStation = {
        id: 'tokyo-station',
        name: 'Tokyo Station',
        latitude: 35.6812,
        longitude: 139.7671,
        lines: ['JR Yamanote', 'Marunouchi Line'],
        distance: 0
      };
      
      const shibuyaStation = {
        id: 'shibuya-station',
        name: 'Shibuya Station',
        latitude: 35.6580,
        longitude: 139.7016,
        lines: ['JR Yamanote', 'Ginza Line'],
        distance: 0
      };

      mockStationFinder.findNearestStation
        .mockReturnValue(tokyoStation)
        .mockReturnValue(shibuyaStation);

      const routeService = new RouteCalculationService(mockLocationService, mockStationFinder);
      
      const fromLocation = { latitude: 35.6812, longitude: 139.7671 };
      const toLocation = { latitude: 35.6580, longitude: 139.7016 };

      const options = await routeService.getRouteOptions(fromLocation, toLocation);

      expect(options).toHaveLength(2); // Transit + Walking
      expect(options[0].type).toBe('transit');
      expect(options[1].type).toBe('walking');
      expect(options[0].duration).toBeLessThan(options[1].duration);
    });
  });
});