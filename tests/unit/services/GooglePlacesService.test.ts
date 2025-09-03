import { GooglePlacesService } from '../../../src/services/GooglePlacesService';
import { LocationService } from '../../../src/services/LocationService';

// Mock dependencies
jest.mock('../../../src/services/LocationService');

// Mock fetch for API calls
global.fetch = jest.fn();

describe('GooglePlacesService', () => {
  let service: GooglePlacesService;
  let mockLocationService: jest.Mocked<LocationService>;
  
  beforeEach(() => {
    mockLocationService = new LocationService() as jest.Mocked<LocationService>;
    service = new GooglePlacesService(mockLocationService);
    jest.clearAllMocks();
  });

  describe('loadCustomMapPlaces', () => {
    it('should load places from custom Google My Maps data', () => {
      const places = service.loadCustomMapPlaces();

      expect(places).toHaveLength(24); // Total places from the map (original 19 + 5 new)
      
      // Check accommodations
      const hotels = places.filter(p => p.category === 'accommodation');
      expect(hotels).toHaveLength(4);
      expect(hotels.find(h => h.name === 'Sakura Hotel Hatagaya')).toBeDefined();
      expect(hotels.find(h => h.name === 'Hotel Fukudaya')).toBeDefined();
      
      // Check restaurants
      const restaurants = places.filter(p => p.category === 'restaurant');
      expect(restaurants).toHaveLength(6); // Original 4 + 2 new restaurants
      expect(restaurants.find(r => r.name === 'Shinjuku NINE SPICES')).toBeDefined();
      expect(restaurants.find(r => r.name === 'Gyukatsu Ichi Ni San')).toBeDefined();
      
      // Check entertainment venues
      const entertainment = places.filter(p => p.category === 'entertainment');
      expect(entertainment).toHaveLength(5); // Original 3 + 2 new entertainment
      expect(entertainment.find(e => e.name === 'Live House Fever')).toBeDefined();
      
      // Check transport stations
      const transport = places.filter(p => p.category === 'transport');
      expect(transport).toHaveLength(5);
      expect(transport.find(t => t.name === 'Tokyo Station')).toBeDefined();
      expect(transport.find(t => t.name === 'Haneda Airport')).toBeDefined();
    });

    it('should include location coordinates and descriptions for places', () => {
      const places = service.loadCustomMapPlaces();
      
      const hotelFukudaya = places.find(p => p.name === 'Hotel Fukudaya');
      expect(hotelFukudaya).toBeDefined();
      expect(hotelFukudaya?.description).toContain('booked on Agoda 9/15-17');
      expect(hotelFukudaya?.city).toBe('Tokyo');
      
      const shimokitazawa = places.find(p => p.name === 'Shimokitazawa');
      expect(shimokitazawa?.description).toContain('vintage shops & cafes');
      expect(shimokitazawa?.category).toBe('shopping');
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
      const existingPlace = {
        name: 'Tokyo Station',
        category: 'transport' as const,
        city: 'Tokyo',
        coordinates: { latitude: 35.6812, longitude: 139.7671 }
      };

      const added = service.addCustomPlace(existingPlace);
      expect(added).toBe(false);
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
});