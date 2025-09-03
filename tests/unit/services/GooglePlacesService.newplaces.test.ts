import { GooglePlacesService } from '../../../src/services/GooglePlacesService';
import { LocationService } from '../../../src/services/LocationService';

describe('GooglePlacesService - New Google Maps Places', () => {
  let service: GooglePlacesService;
  let mockLocationService: LocationService;

  beforeEach(() => {
    mockLocationService = new LocationService();
    service = new GooglePlacesService(mockLocationService);
  });

  it('should include new places from Google Map in loadCustomMapPlaces results', () => {
    const places = service.loadCustomMapPlaces();
    
    // Verify we have more than the original 23 places
    expect(places.length).toBeGreaterThan(23);
    
    // Look for some expected new places (these should fail initially)
    const placeNames = places.map(p => p.name);
    expect(placeNames).toContain('Don Quijote Shibuya');
    expect(placeNames).toContain('Sensoji Temple');
    expect(placeNames).toContain('Meiji Shrine');
  });

  it('should maintain existing place structure for new places', () => {
    const places = service.loadCustomMapPlaces();
    const newPlaces = places.slice(23); // Get places after original 23
    
    // Each new place should have required properties
    newPlaces.forEach(place => {
      expect(place).toHaveProperty('id');
      expect(place).toHaveProperty('name');
      expect(place).toHaveProperty('category');
      expect(place).toHaveProperty('city');
      expect(typeof place.id).toBe('string');
      expect(typeof place.name).toBe('string');
      expect(['accommodation', 'restaurant', 'entertainment', 'transport', 'shopping']).toContain(place.category);
      expect(typeof place.city).toBe('string');
    });
  });
});