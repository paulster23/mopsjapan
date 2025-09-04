import { GooglePlacesService } from './GooglePlacesService';
import { LocationService } from './LocationService';

// Create shared service instances to ensure data consistency between screens
export const sharedLocationService = new LocationService();
export const sharedGooglePlacesService = new GooglePlacesService(sharedLocationService);