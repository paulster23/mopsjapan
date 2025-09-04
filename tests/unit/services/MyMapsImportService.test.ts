import { MyMapsImportService } from '../../../src/services/MyMapsImportService';
import { Place, PlaceCategory } from '../../../src/services/GooglePlacesService';

describe('MyMapsImportService', () => {
  let service: MyMapsImportService;

  beforeEach(() => {
    service = new MyMapsImportService();
  });

  describe('parseKMLToPlaces', () => {
    it('should parse KML with places into Place objects', () => {
      const sampleKML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Shibuya Station</name>
      <description>Major train station in Tokyo</description>
      <Point>
        <coordinates>139.7016,35.6580,0</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>Sensoji Temple</name>
      <description>Historic Buddhist temple</description>
      <Point>
        <coordinates>139.7966,35.7148,0</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>`;

      const places = service.parseKMLToPlaces(sampleKML);

      expect(places).toHaveLength(2);
      expect(places[0]).toEqual({
        id: 'shibuya-station',
        name: 'Shibuya Station',
        category: 'transport',
        city: 'Tokyo',
        coordinates: { latitude: 35.6580, longitude: 139.7016 },
        description: 'Major train station in Tokyo'
      });
      expect(places[1]).toEqual({
        id: 'sensoji-temple',
        name: 'Sensoji Temple', 
        category: 'entertainment',
        city: 'Tokyo',
        coordinates: { latitude: 35.7148, longitude: 139.7966 },
        description: 'Historic Buddhist temple'
      });
    });

    it('should handle empty KML gracefully', () => {
      const emptyKML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
  </Document>
</kml>`;

      const places = service.parseKMLToPlaces(emptyKML);
      expect(places).toEqual([]);
    });

    it('should handle invalid KML format', () => {
      const invalidKML = 'not valid xml';
      
      expect(() => service.parseKMLToPlaces(invalidKML)).toThrow('Invalid KML format');
    });
  });

  describe('detectPlaceCategory', () => {
    it('should categorize transport places correctly', () => {
      expect(service.detectPlaceCategory('Tokyo Station', 'Train station')).toBe('transport');
      expect(service.detectPlaceCategory('Haneda Airport', 'International airport')).toBe('transport');
      expect(service.detectPlaceCategory('Subway entrance', '')).toBe('transport');
    });

    it('should categorize restaurant places correctly', () => {
      expect(service.detectPlaceCategory('Ramen Shop', 'Best ramen in Tokyo')).toBe('restaurant');
      expect(service.detectPlaceCategory('Sushi Bar', 'Fresh sushi')).toBe('restaurant');
      expect(service.detectPlaceCategory('Starbucks Coffee', 'Coffee shop')).toBe('restaurant');
    });

    it('should categorize entertainment places correctly', () => {
      expect(service.detectPlaceCategory('Sensoji Temple', 'Buddhist temple')).toBe('entertainment');
      expect(service.detectPlaceCategory('Tokyo Museum', 'Art museum')).toBe('entertainment');
      expect(service.detectPlaceCategory('Ueno Park', 'Beautiful park')).toBe('entertainment');
    });

    it('should categorize accommodation places correctly', () => {
      expect(service.detectPlaceCategory('Hotel Okura', 'Luxury hotel')).toBe('accommodation');
      expect(service.detectPlaceCategory('Youth Hostel', 'Budget accommodation')).toBe('accommodation');
      expect(service.detectPlaceCategory('Ryokan Sakura', 'Traditional inn')).toBe('accommodation');
    });

    it('should categorize shopping places correctly', () => {
      expect(service.detectPlaceCategory('Department Store', 'Large shopping center')).toBe('shopping');
      expect(service.detectPlaceCategory('Convenience Store', '7-Eleven')).toBe('shopping');
      expect(service.detectPlaceCategory('Souvenir Shop', 'Tourist gifts')).toBe('shopping');
    });

    it('should default to entertainment for unknown places', () => {
      expect(service.detectPlaceCategory('Unknown Place', 'No clear category')).toBe('entertainment');
    });
  });

  describe('extractMapIdFromUrl', () => {
    it('should extract map ID from standard My Maps URL', () => {
      const url = 'https://www.google.com/maps/d/viewer?mid=1234567890abcdef';
      const mapId = service.extractMapIdFromUrl(url);
      expect(mapId).toBe('1234567890abcdef');
    });

    it('should extract map ID from shared My Maps URL', () => {
      const url = 'https://www.google.com/maps/d/u/0/viewer?mid=abcd1234efgh5678&ll=35.6812,139.7671&z=10';
      const mapId = service.extractMapIdFromUrl(url);
      expect(mapId).toBe('abcd1234efgh5678');
    });

    it('should throw error for invalid URL', () => {
      const url = 'https://www.google.com/maps/search/tokyo';
      expect(() => service.extractMapIdFromUrl(url)).toThrow('Invalid My Maps URL - no map ID found');
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

    it('should default to Tokyo for unknown coordinates in Japan', () => {
      const city = service.detectCityFromCoordinates(36.0000, 140.0000);
      expect(city).toBe('Tokyo');
    });
  });
});