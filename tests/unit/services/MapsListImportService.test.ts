import { MapsListImportService } from '../../../src/services/MapsListImportService';
import { Place } from '../../../src/services/GooglePlacesService';

describe('MapsListImportService', () => {
  let service: MapsListImportService;

  beforeEach(() => {
    service = new MapsListImportService();
  });

  describe('extractListIdFromUrl', () => {
    it('should extract list ID from Google Maps List URL', () => {
      const url = 'https://www.google.com/maps/@35.7023392,136.1781809,986081m/data=!3m2!1e3!4b1!4m2!6m1!1s1LQROJade9LoCh-Y1kyXgpKtT-CCRZaU?entry=ttu&g_ep=EgoyMDI1MDgzMC4wIKXMDSoASAFQAw%3D%3D';
      
      const listId = service.extractListIdFromUrl(url);
      
      expect(listId).toBe('1LQROJade9LoCh-Y1kyXgpKtT-CCRZaU');
    });

    it('should handle URL without list ID', () => {
      const url = 'https://www.google.com/maps/@35.7023392,136.1781809,986081m/data=!3m2!1e3!4b1';
      
      expect(() => service.extractListIdFromUrl(url)).toThrow('Invalid Google Maps List URL - no list ID found');
    });

    it('should handle completely invalid URLs', () => {
      const url = 'https://www.example.com/not-a-maps-url';
      
      expect(() => service.extractListIdFromUrl(url)).toThrow('Invalid Google Maps List URL - no list ID found');
    });

    it('should handle URL with different 1s parameter format', () => {
      const url = 'https://www.google.com/maps/data=!4m2!6m1!1sABCDEF123456789?entry=ttu';
      
      const listId = service.extractListIdFromUrl(url);
      
      expect(listId).toBe('ABCDEF123456789');
    });
  });

  describe('parseGoogleListJson', () => {
    it('should parse Google internal JSON format to places', () => {
      const mockJsonResponse = `)]}'
{
  "data": [
    null,
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      [
        [
          [
            "Tokyo Sushi Restaurant",
            null,
            null,
            [139.7671, 35.6812],
            null,
            "Great sushi place in Shibuya"
          ],
          [
            "Osaka Takoyaki Stand", 
            null,
            null,
            [135.5023, 34.6937],
            null,
            "Famous takoyaki vendor"
          ]
        ]
      ]
    ]
  ]
}`;

      const places = service.parseGoogleListJson(mockJsonResponse);
      
      expect(places).toHaveLength(2);
      expect(places[0]).toEqual({
        id: 'tokyo-sushi-restaurant',
        name: 'Tokyo Sushi Restaurant',
        category: 'restaurant',
        city: 'Tokyo',
        coordinates: { latitude: 35.6812, longitude: 139.7671 },
        description: 'Great sushi place in Shibuya'
      });
      expect(places[1]).toEqual({
        id: 'osaka-takoyaki-stand',
        name: 'Osaka Takoyaki Stand',
        category: 'restaurant', 
        city: 'Osaka',
        coordinates: { latitude: 34.6937, longitude: 135.5023 },
        description: 'Famous takoyaki vendor'
      });
    });

    it('should handle empty list response', () => {
      const mockJsonResponse = `)]}'
{
  "data": [
    null,
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      []
    ]
  ]
}`;

      const places = service.parseGoogleListJson(mockJsonResponse);
      
      expect(places).toHaveLength(0);
    });

    it('should handle malformed JSON response', () => {
      const malformedJson = `)]}'invalid json`;
      
      expect(() => service.parseGoogleListJson(malformedJson)).toThrow('Invalid response format from Google Maps');
    });

    it('should handle places without coordinates', () => {
      const mockJsonResponse = `)]}'
{
  "data": [
    null,
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      [
        [
          [
            "Place Without Coords",
            null,
            null,
            null,
            null,
            "No location data"
          ]
        ]
      ]
    ]
  ]
}`;

      const places = service.parseGoogleListJson(mockJsonResponse);
      
      expect(places).toHaveLength(0); // Should skip places without coordinates
    });
  });

  describe('detectCityFromCoordinates', () => {
    it('should detect Tokyo from coordinates', () => {
      const city = service.detectCityFromCoordinates(35.6812, 139.7671);
      expect(city).toBe('Tokyo');
    });

    it('should detect Osaka from coordinates', () => {
      const city = service.detectCityFromCoordinates(34.6937, 135.5023);
      expect(city).toBe('Osaka');
    });

    it('should detect Kyoto from coordinates', () => {
      const city = service.detectCityFromCoordinates(35.0116, 135.7681);
      expect(city).toBe('Kyoto');
    });

    it('should return Unknown for coordinates outside known cities', () => {
      const city = service.detectCityFromCoordinates(40.7128, -74.0060); // New York
      expect(city).toBe('Unknown');
    });
  });

  describe('categorizePlace', () => {
    it('should categorize restaurant places', () => {
      const category = service.categorizePlace('Sushi Restaurant', 'Great sushi place');
      expect(category).toBe('restaurant');
    });

    it('should categorize accommodation places', () => {
      const category = service.categorizePlace('Tokyo Hotel', 'Luxury hotel in Shibuya');
      expect(category).toBe('accommodation');
    });

    it('should categorize entertainment places', () => {
      const category = service.categorizePlace('Tokyo Museum', 'Art and culture museum');
      expect(category).toBe('entertainment');
    });

    it('should categorize transport places', () => {
      const category = service.categorizePlace('Shibuya Station', 'JR train station');
      expect(category).toBe('transport');
    });

    it('should categorize shopping places', () => {
      const category = service.categorizePlace('Tokyo Shopping Mall', 'Large shopping center');
      expect(category).toBe('shopping');
    });

    it('should default to restaurant for unknown places', () => {
      const category = service.categorizePlace('Unknown Place', 'No clear category');
      expect(category).toBe('restaurant');
    });
  });
});