import { StationFinderService } from '../../../src/services/StationFinderService';
import { LocationService } from '../../../src/services/LocationService';

// Mock location service
jest.mock('../../../src/services/LocationService');

describe('StationFinderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findNearestStation', () => {
    it('should find the single nearest station to a location', () => {
      const mockLocationService = new LocationService() as jest.Mocked<LocationService>;
      mockLocationService.calculateDistance
        .mockReturnValueOnce(1.2) // Tokyo Station
        .mockReturnValueOnce(2.8) // Shibuya
        .mockReturnValueOnce(3.5); // Shinjuku

      const stationFinder = new StationFinderService(mockLocationService);
      const userLocation = { latitude: 35.6762, longitude: 139.6503 };

      const nearestStation = stationFinder.findNearestStation(userLocation);

      expect(nearestStation).toBeDefined();
      expect(nearestStation?.name).toBe('Tokyo Station');
      expect(nearestStation?.distance).toBe(1.2);
    });

    it('should return null if no stations are loaded', () => {
      const mockLocationService = new LocationService() as jest.Mocked<LocationService>;
      const stationFinder = new StationFinderService(mockLocationService);

      // Clear the default station list
      stationFinder.clearStations();
      const userLocation = { latitude: 35.6762, longitude: 139.6503 };

      const nearestStation = stationFinder.findNearestStation(userLocation);

      expect(nearestStation).toBeNull();
    });
  });

  describe('findStationsInRadius', () => {
    it('should return stations within specified radius sorted by distance', () => {
      const mockLocationService = new LocationService() as jest.Mocked<LocationService>;
      mockLocationService.calculateDistance
        .mockReturnValueOnce(1.2) // Tokyo Station
        .mockReturnValueOnce(2.8) // Shibuya
        .mockReturnValueOnce(0.9) // Ginza (closest)
        .mockReturnValueOnce(4.5); // Shinjuku (outside radius)

      const stationFinder = new StationFinderService(mockLocationService);
      const userLocation = { latitude: 35.6762, longitude: 139.6503 };

      const stations = stationFinder.findStationsInRadius(userLocation, 3.0);

      expect(stations).toHaveLength(3);
      expect(stations[0].name).toBe('Ginza Station');
      expect(stations[0].distance).toBe(0.9);
      expect(stations[1].name).toBe('Tokyo Station');
      expect(stations[1].distance).toBe(1.2);
      expect(stations[2].name).toBe('Shibuya Station');
      expect(stations[2].distance).toBe(2.8);
    });

    it('should filter out stations beyond radius', () => {
      const mockLocationService = new LocationService() as jest.Mocked<LocationService>;
      mockLocationService.calculateDistance.mockReturnValue(5.0); // All far away

      const stationFinder = new StationFinderService(mockLocationService);
      const userLocation = { latitude: 35.6762, longitude: 139.6503 };

      const stations = stationFinder.findStationsInRadius(userLocation, 3.0);

      expect(stations).toHaveLength(0);
    });
  });

  describe('findStationsByLine', () => {
    it('should return stations on specified line', () => {
      const stationFinder = new StationFinderService(new LocationService());

      const yamanoteStations = stationFinder.findStationsByLine('JR Yamanote');

      expect(yamanoteStations.length).toBeGreaterThan(0);
      yamanoteStations.forEach(station => {
        expect(station.lines).toContain('JR Yamanote');
      });
    });

    it('should return empty array for non-existent line', () => {
      const stationFinder = new StationFinderService(new LocationService());

      const stations = stationFinder.findStationsByLine('Non-existent Line');

      expect(stations).toHaveLength(0);
    });

    it('should handle partial line name matches', () => {
      const stationFinder = new StationFinderService(new LocationService());

      const marunouchiStations = stationFinder.findStationsByLine('Marunouchi');

      expect(marunouchiStations.length).toBeGreaterThan(0);
      marunouchiStations.forEach(station => {
        expect(station.lines.some(line => line.includes('Marunouchi'))).toBe(true);
      });
    });
  });

  describe('getStationsByArea', () => {
    it('should categorize stations by Tokyo area', () => {
      const stationFinder = new StationFinderService(new LocationService());

      const stationsByArea = stationFinder.getStationsByArea();

      expect(stationsByArea).toHaveProperty('Central Tokyo');
      expect(stationsByArea).toHaveProperty('Shibuya/Harajuku');
      expect(stationsByArea).toHaveProperty('Shinjuku');
      expect(stationsByArea['Central Tokyo']).toContainEqual(
        expect.objectContaining({ name: 'Tokyo Station' })
      );
    });

    it('should include all stations in some area', () => {
      const stationFinder = new StationFinderService(new LocationService());

      const stationsByArea = stationFinder.getStationsByArea();
      const allStations = stationFinder.getAllStations();
      const totalCategorized = Object.values(stationsByArea)
        .flat()
        .length;

      expect(totalCategorized).toBe(allStations.length);
    });
  });

  describe('searchStations', () => {
    it('should find stations by name search', () => {
      const stationFinder = new StationFinderService(new LocationService());

      const results = stationFinder.searchStations('Tokyo');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Tokyo');
    });

    it('should find stations by line search', () => {
      const stationFinder = new StationFinderService(new LocationService());

      const results = stationFinder.searchStations('Yamanote');

      expect(results.length).toBeGreaterThan(0);
      results.forEach(station => {
        expect(station.lines.some(line => line.includes('Yamanote'))).toBe(true);
      });
    });

    it('should be case insensitive', () => {
      const stationFinder = new StationFinderService(new LocationService());

      const lowerResults = stationFinder.searchStations('tokyo');
      const upperResults = stationFinder.searchStations('TOKYO');

      expect(lowerResults).toEqual(upperResults);
      expect(lowerResults.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', () => {
      const stationFinder = new StationFinderService(new LocationService());

      const results = stationFinder.searchStations('NonExistentStation');

      expect(results).toHaveLength(0);
    });
  });

  describe('loadExtendedStationData', () => {
    it('should load additional station information', () => {
      const stationFinder = new StationFinderService(new LocationService());

      const initialCount = stationFinder.getAllStations().length;
      stationFinder.loadExtendedStationData();
      const finalCount = stationFinder.getAllStations().length;

      expect(finalCount).toBeGreaterThan(initialCount);
    });

    it('should include station amenities and transfer information', () => {
      const stationFinder = new StationFinderService(new LocationService());
      stationFinder.loadExtendedStationData();

      const tokyoStation = stationFinder.searchStations('Tokyo Station')[0];

      expect(tokyoStation).toHaveProperty('amenities');
      expect(tokyoStation).toHaveProperty('transferLines');
      expect(tokyoStation.amenities).toContain('shopping');
      expect(tokyoStation.transferLines?.length).toBeGreaterThan(0);
    });
  });
});