import { GooglePlacesService } from '../../../src/services/GooglePlacesService';
import { LocationService } from '../../../src/services/LocationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('../../../src/services/LocationService');
jest.mock('@react-native-async-storage/async-storage');

// Mock fetch for API calls
global.fetch = jest.fn();

describe('GooglePlacesService', () => {
  let service: GooglePlacesService;
  let mockLocationService: jest.Mocked<LocationService>;
  
  beforeEach(() => {
    mockLocationService = new LocationService() as jest.Mocked<LocationService>;
    service = new GooglePlacesService(mockLocationService);
    jest.clearAllMocks();
    
    // Reset AsyncStorage mock
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('loadCustomMapPlaces', () => {
    it('should load places from custom Google My Maps data', () => {
      const places = service.loadCustomMapPlaces();

      expect(places).toHaveLength(0); // No static places - all places are now synced
    });

    it('should return empty places since no static places exist', () => {
      const places = service.loadCustomMapPlaces();
      expect(places).toHaveLength(0); // No static places in synced-only model
    });
  });

  describe('getPlacesByCategory', () => {
    it('should filter places by category', () => {
      const restaurants = service.getPlacesByCategory('restaurant');
      const accommodations = service.getPlacesByCategory('accommodation');
      
      expect(restaurants).toHaveLength(6); // Original 4 + 2 new restaurants
      expect(accommodations).toHaveLength(4);
      expect(restaurants.every(p => p.category === 'restaurant')).toBe(true);
      expect(accommodations.every(p => p.category === 'accommodation')).toBe(true);
    });

    it('should return empty array for unknown category', () => {
      const unknown = service.getPlacesByCategory('unknown' as any);
      expect(unknown).toHaveLength(0);
    });
  });

  describe('getPlacesByCity', () => {
    it('should filter places by city', () => {
      const tokyoPlaces = service.getPlacesByCity('Tokyo');
      const osakaPlaces = service.getPlacesByCity('Osaka');
      
      expect(tokyoPlaces.length).toBeGreaterThan(0);
      expect(osakaPlaces.length).toBeGreaterThan(0);
      
      expect(tokyoPlaces.find(p => p.name === 'Sakura Hotel Hatagaya')).toBeDefined();
      expect(osakaPlaces.find(p => p.name === 'Conpass')).toBeDefined();
    });

    it('should handle city name case insensitivity', () => {
      const tokyoPlaces1 = service.getPlacesByCity('Tokyo');
      const tokyoPlaces2 = service.getPlacesByCity('tokyo');
      const tokyoPlaces3 = service.getPlacesByCity('TOKYO');
      
      expect(tokyoPlaces1).toEqual(tokyoPlaces2);
      expect(tokyoPlaces2).toEqual(tokyoPlaces3);
    });
  });

  describe('findNearbyPlaces', () => {
    it('should find places within specified radius', () => {
      mockLocationService.calculateDistance
        .mockReturnValueOnce(0.5) // Sakura Hotel - close
        .mockReturnValueOnce(2.1) // Hotel Fukudaya - within radius
        .mockReturnValueOnce(5.0); // Some other place - outside radius

      const userLocation = { latitude: 35.6762, longitude: 139.6503 };
      const nearbyPlaces = service.findNearbyPlaces(userLocation, 3.0);

      expect(nearbyPlaces).toHaveLength(2);
      expect(nearbyPlaces[0].distance).toBe(0.5);
      expect(nearbyPlaces[1].distance).toBe(2.1);
      expect(nearbyPlaces[0].distance).toBeLessThan(nearbyPlaces[1].distance); // Sorted by distance
    });

    it('should return empty array when no places within radius', () => {
      mockLocationService.calculateDistance.mockReturnValue(10.0); // All far away

      const userLocation = { latitude: 35.6762, longitude: 139.6503 };
      const nearbyPlaces = service.findNearbyPlaces(userLocation, 3.0);

      expect(nearbyPlaces).toHaveLength(0);
    });
  });

  describe('searchPlaces', () => {
    it('should search places by name', () => {
      const results = service.searchPlaces('Hotel');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.find(p => p.name === 'Sakura Hotel Hatagaya')).toBeDefined();
      expect(results.find(p => p.name === 'Hotel Fukudaya')).toBeDefined();
    });

    it('should search places by description', () => {
      const results = service.searchPlaces('beef katsu');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.find(p => p.name === 'Ich-ni-san (Hibiya branch)')).toBeDefined();
    });

    it('should be case insensitive', () => {
      const results1 = service.searchPlaces('hotel');
      const results2 = service.searchPlaces('HOTEL');
      const results3 = service.searchPlaces('Hotel');
      
      expect(results1).toEqual(results2);
      expect(results2).toEqual(results3);
    });

    it('should return empty array for no matches', () => {
      const results = service.searchPlaces('nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('getPlaceDetails', () => {
    it('should return detailed information for a place', () => {
      const details = service.getPlaceDetails('Hotel Fukudaya');
      
      expect(details).toBeDefined();
      expect(details?.name).toBe('Hotel Fukudaya');
      expect(details?.description).toContain('booked on Agoda 9/15-17');
      expect(details?.category).toBe('accommodation');
      expect(details?.city).toBe('Tokyo');
      expect(details?.coordinates).toBeDefined();
    });

    it('should return null for non-existent place', () => {
      const details = service.getPlaceDetails('Non-existent Place');
      expect(details).toBeNull();
    });
  });

  describe('getPlacesForItineraryDay', () => {
    it('should suggest places based on itinerary day location and preferences', () => {
      const dayLocation = 'Tokyo';
      const preferences: import('../../../src/services/GooglePlacesService').PlaceCategory[] = ['restaurant', 'entertainment'];
      
      const suggestions = service.getPlacesForItineraryDay(dayLocation, preferences);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.every(p => preferences.includes(p.category))).toBe(true);
      expect(suggestions.every(p => p.city.toLowerCase().includes(dayLocation.toLowerCase()))).toBe(true);
    });

    it('should return empty array for unknown location', () => {
      const preferences: import('../../../src/services/GooglePlacesService').PlaceCategory[] = ['restaurant'];
      const suggestions = service.getPlacesForItineraryDay('Unknown City', preferences);
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('addCustomPlace', () => {
    it('should add a new custom place', () => {
      const newPlace = {
        name: 'Custom Restaurant',
        category: 'restaurant' as const,
        city: 'Tokyo',
        coordinates: { latitude: 35.6762, longitude: 139.6503 },
        description: 'A great new restaurant'
      };

      const added = service.addCustomPlace(newPlace);
      expect(added).toBe(true);

      const found = service.getPlaceDetails('Custom Restaurant');
      expect(found).toBeDefined();
      expect(found?.name).toBe('Custom Restaurant');
    });

    it('should not add duplicate places', () => {
      const newPlace = {
        name: 'Test Duplicate Place',
        category: 'restaurant' as const,
        city: 'Tokyo',
        coordinates: { latitude: 35.6812, longitude: 139.7671 }
      };

      // Add the place first time - should succeed
      const firstAdd = service.addCustomPlace(newPlace);
      expect(firstAdd).toBe(true);

      // Try to add the same place again - should fail
      const secondAdd = service.addCustomPlace(newPlace);
      expect(secondAdd).toBe(false);
    });
  });

  describe('exportPlacesForCalendar', () => {
    it('should export places in Google Calendar event format', () => {
      const places = service.getPlacesByCategory('restaurant');
      const calendarEvents = service.exportPlacesForCalendar(places);
      
      expect(calendarEvents).toHaveLength(places.length);
      expect(calendarEvents[0]).toHaveProperty('summary');
      expect(calendarEvents[0]).toHaveProperty('description');
      expect(calendarEvents[0]).toHaveProperty('location');
      expect(calendarEvents[0].summary).toBe(places[0].name);
    });

    it('should include coordinates in location field when available', () => {
      const place = service.getPlaceDetails('Tokyo Station')!;
      const calendarEvent = service.exportPlacesForCalendar([place])[0];
      
      expect(calendarEvent.location).toContain('Tokyo Station');
      expect(calendarEvent.location).toContain('35.6812,139.7671');
    });
  });

  describe('getPlaceStatistics', () => {
    it('should return statistics about loaded places', () => {
      const stats = service.getPlaceStatistics();
      
      expect(stats.total).toBe(24); // Original 19 + 5 new places
      expect(stats.byCategory.accommodation).toBe(4);
      expect(stats.byCategory.restaurant).toBe(6); // Original 4 + 2 new restaurants
      expect(stats.byCategory.entertainment).toBe(5); // Original 3 + 2 new entertainment
      expect(stats.byCategory.transport).toBe(5);
      expect(stats.byCategory.shopping).toBe(4); // Original 3 + 1 new shopping
      
      expect(stats.byCity.Tokyo).toBeGreaterThan(0);
      expect(stats.byCity.Osaka).toBeGreaterThan(0);
      expect(stats.byCity.Nara).toBeGreaterThan(0);
      expect(stats.byCity.Nagoya).toBeGreaterThan(0);
    });
  });

  describe('Synced-Only Storage Model', () => {
    it('should return only synced places when no static places exist', async () => {
      // Mock AsyncStorage to return synced places
      const syncedPlaces = [
        {
          id: 'synced-place-1',
          name: 'Test Synced Place',
          category: 'restaurant' as const,
          city: 'Tokyo'
        }
      ];
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(syncedPlaces));

      // Create new service instance
      const newService = new GooglePlacesService(mockLocationService);
      await new Promise(resolve => setTimeout(resolve, 0));

      const result = newService.getAllPlaces();

      // Should return only synced places, no static places
      expect(result).toEqual(syncedPlaces);
      expect(result.length).toBe(1);
    });

    it('should allow updating any synced place', async () => {
      // Mock existing synced places
      const syncedPlaces = [
        {
          id: 'place-1',
          name: 'Original Name',
          category: 'restaurant' as const,
          city: 'Tokyo'
        }
      ];
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(syncedPlaces));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const newService = new GooglePlacesService(mockLocationService);
      await new Promise(resolve => setTimeout(resolve, 0));

      const result = newService.updatePlace('place-1', { 
        name: 'Updated Name',
        category: 'shopping' as const
      });

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'syncedPlaces',
        expect.stringContaining('Updated Name')
      );
    });

    it('should return empty array when no synced places exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const newService = new GooglePlacesService(mockLocationService);
      await new Promise(resolve => setTimeout(resolve, 0));

      const result = newService.getAllPlaces();

      expect(result).toEqual([]);
    });
  });

  describe('Persistent Storage for Synced Places', () => {
    const mockSyncedPlaces = [
      {
        id: 'synced-place-1',
        name: 'Synced Restaurant',
        category: 'restaurant' as const,
        city: 'Tokyo',
        coordinates: { latitude: 35.6812, longitude: 139.7671 },
        description: 'A place from sync'
      },
      {
        id: 'synced-place-2', 
        name: 'Synced Hotel',
        category: 'accommodation' as const,
        city: 'Osaka'
      }
    ];

    it('should save synced places to AsyncStorage when adding places', async () => {
      // Add some synced places
      const added1 = service.addCustomPlace(mockSyncedPlaces[0]);
      const added2 = service.addCustomPlace(mockSyncedPlaces[1]);
      
      expect(added1).toBe(true);
      expect(added2).toBe(true);
      
      // Verify AsyncStorage was called to save synced places  
      // Check the last call to make sure it has both places
      const lastCall = (AsyncStorage.setItem as jest.Mock).mock.calls[1];
      expect(lastCall[0]).toBe('syncedPlaces');
      const savedPlaces = JSON.parse(lastCall[1]);
      expect(savedPlaces).toHaveLength(2);
      expect(savedPlaces[0].name).toBe('Synced Restaurant');
      expect(savedPlaces[1].name).toBe('Synced Hotel');
    });

    it('should load synced places from AsyncStorage on initialization', async () => {
      // Mock AsyncStorage to return synced places
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockSyncedPlaces));
      
      // Create a new service instance to trigger loading
      const newService = new GooglePlacesService(mockLocationService);
      
      // Wait for async loading to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const allPlaces = newService.getAllPlaces();
      
      // Should have static places + synced places
      expect(allPlaces.length).toBe(24 + 2); // 24 static + 2 synced
      
      // Verify synced places are present
      expect(allPlaces.find(p => p.name === 'Synced Restaurant')).toBeDefined();
      expect(allPlaces.find(p => p.name === 'Synced Hotel')).toBeDefined();
    });

    it('should merge static and synced places without duplicates', async () => {
      // Mock AsyncStorage to return a place that conflicts with static data
      const conflictingPlace = {
        id: 'conflicting-place',
        name: 'Tokyo Station', // This exists in static data
        category: 'transport' as const,
        city: 'Tokyo'
      };
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([conflictingPlace]));
      
      const newService = new GooglePlacesService(mockLocationService);
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const allPlaces = newService.getAllPlaces();
      
      // Should not have duplicated Tokyo Station
      const tokyoStations = allPlaces.filter(p => p.name === 'Tokyo Station');
      expect(tokyoStations).toHaveLength(1);
      expect(allPlaces.length).toBe(24); // Same as static places since duplicate was filtered out
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      // Mock AsyncStorage to throw an error
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      
      const newService = new GooglePlacesService(mockLocationService);
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Should still work with just static places
      const allPlaces = newService.getAllPlaces();
      expect(allPlaces.length).toBe(24); // Just static places
    });

    it('should save synced places atomically on each addition', async () => {
      // Add first place
      service.addCustomPlace(mockSyncedPlaces[0]);
      
      // Check the first call
      const firstCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      expect(firstCall[0]).toBe('syncedPlaces');
      const firstSavedPlaces = JSON.parse(firstCall[1]);
      expect(firstSavedPlaces).toHaveLength(1);
      expect(firstSavedPlaces[0].name).toBe('Synced Restaurant');
      
      // Add second place
      service.addCustomPlace(mockSyncedPlaces[1]);
      
      // Check the second call 
      const secondCall = (AsyncStorage.setItem as jest.Mock).mock.calls[1];
      expect(secondCall[0]).toBe('syncedPlaces');
      const secondSavedPlaces = JSON.parse(secondCall[1]);
      expect(secondSavedPlaces).toHaveLength(2);
      expect(secondSavedPlaces[0].name).toBe('Synced Restaurant');
      expect(secondSavedPlaces[1].name).toBe('Synced Hotel');
    });
  });
});