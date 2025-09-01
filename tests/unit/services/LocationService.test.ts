import { LocationService } from '../../../src/services/LocationService';

describe('LocationService', () => {
  describe('validateCoordinates', () => {
    it('should validate correct latitude and longitude coordinates', () => {
      const locationService = new LocationService();
      
      // Valid Tokyo coordinates
      const result = locationService.validateCoordinates(35.6762, 139.6503);
      
      expect(result.isValid).toBe(true);
      expect(result.latitude).toBe(35.6762);
      expect(result.longitude).toBe(139.6503);
    });

    it('should reject invalid latitude coordinates', () => {
      const locationService = new LocationService();
      
      // Invalid latitude (> 90)
      const result = locationService.validateCoordinates(95.0, 139.6503);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid latitude: must be between -90 and 90');
    });

    it('should reject invalid longitude coordinates', () => {
      const locationService = new LocationService();
      
      // Invalid longitude (> 180)
      const result = locationService.validateCoordinates(35.6762, 185.0);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid longitude: must be between -180 and 180');
    });
  });

  describe('isInJapan', () => {
    it('should return true for coordinates in Tokyo', () => {
      const locationService = new LocationService();
      
      // Tokyo Station coordinates
      const result = locationService.isInJapan(35.6762, 139.6503);
      
      expect(result).toBe(true);
    });

    it('should return true for coordinates in Osaka', () => {
      const locationService = new LocationService();
      
      // Osaka Station coordinates  
      const result = locationService.isInJapan(34.7024, 135.4959);
      
      expect(result).toBe(true);
    });

    it('should return false for coordinates outside Japan', () => {
      const locationService = new LocationService();
      
      // New York coordinates
      const result = locationService.isInJapan(40.7128, -74.0060);
      
      expect(result).toBe(false);
    });

    it('should return true for coordinates at Japan border edges', () => {
      const locationService = new LocationService();
      
      // Okinawa (southern border)
      const okinawaResult = locationService.isInJapan(26.2123, 127.6792);
      expect(okinawaResult).toBe(true);
      
      // Hokkaido (northern border)  
      const hokkaidoResult = locationService.isInJapan(43.0642, 141.3469);
      expect(hokkaidoResult).toBe(true);
    });

    it('should return false for coordinates just outside Japan borders', () => {
      const locationService = new LocationService();
      
      // Just south of Japan
      const southResult = locationService.isInJapan(23.9, 140.0);
      expect(southResult).toBe(false);
      
      // Just west of Japan  
      const westResult = locationService.isInJapan(35.0, 122.9);
      expect(westResult).toBe(false);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points in kilometers', () => {
      const locationService = new LocationService();
      
      // Distance between Tokyo Station and Shibuya Station
      const distance = locationService.calculateDistance(
        35.6762, 139.6503, // Tokyo Station
        35.6580, 139.7016  // Shibuya Station  
      );
      
      // Should be approximately 4-5 km
      expect(distance).toBeGreaterThan(4);
      expect(distance).toBeLessThan(6);
    });
  });
});