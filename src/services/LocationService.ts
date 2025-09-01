interface CoordinateValidationResult {
  isValid: boolean;
  latitude?: number;
  longitude?: number;
  error?: string;
}

export class LocationService {
  validateCoordinates(latitude: number, longitude: number): CoordinateValidationResult {
    if (latitude < -90 || latitude > 90) {
      return {
        isValid: false,
        error: 'Invalid latitude: must be between -90 and 90'
      };
    }
    
    if (longitude < -180 || longitude > 180) {
      return {
        isValid: false,
        error: 'Invalid longitude: must be between -180 and 180'
      };
    }
    
    return {
      isValid: true,
      latitude,
      longitude
    };
  }

  isInJapan(latitude: number, longitude: number): boolean {
    // Japan approximate bounding box
    // Latitude: 24-46 degrees North
    // Longitude: 123-146 degrees East
    return (
      latitude >= 24 && latitude <= 46 &&
      longitude >= 123 && longitude <= 146
    );
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Haversine formula for calculating distance between two points on Earth
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(lat1)) * Math.cos(this.degreesToRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
      
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distance in kilometers
  }

  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}