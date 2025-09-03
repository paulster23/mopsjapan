import { DataPersistenceService } from './DataPersistenceService';
import { LocationService } from './LocationService';

interface OverrideLocation {
  latitude: number;
  longitude: number;
  name: string;
}

export class LocationOverrideService {
  private dataService: DataPersistenceService;
  private locationService: LocationService;
  private isActive: boolean = false;
  private currentOverride: OverrideLocation | null = null;
  private readonly STORAGE_KEY = 'location_override';

  constructor(dataService: DataPersistenceService) {
    this.dataService = dataService;
    this.locationService = new LocationService();
  }

  isOverrideActive(): boolean {
    return this.isActive;
  }

  async enableLocationOverride(location: OverrideLocation): Promise<void> {
    // Validate coordinates
    const validation = this.locationService.validateCoordinates(location.latitude, location.longitude);
    if (!validation.isValid) {
      throw new Error('Invalid coordinates provided');
    }

    // Check if location is in Japan
    if (!this.locationService.isInJapan(location.latitude, location.longitude)) {
      throw new Error('Override location must be within Japan');
    }

    // Save to storage
    await this.dataService.saveGenericData(this.STORAGE_KEY, location);

    // Update internal state
    this.isActive = true;
    this.currentOverride = location;
  }

  async disableLocationOverride(): Promise<void> {
    // Remove from storage
    await this.dataService.removeGenericData(this.STORAGE_KEY);

    // Clear internal state
    this.isActive = false;
    this.currentOverride = null;
  }

  getOverrideLocation(): OverrideLocation | null {
    return this.currentOverride;
  }

  getPresetLocations(): OverrideLocation[] {
    return [
      { latitude: 35.6580, longitude: 139.7016, name: 'Shibuya Station' },
      { latitude: 35.6812, longitude: 139.7671, name: 'Tokyo Station' },
      { latitude: 35.6896, longitude: 139.7006, name: 'Shinjuku Station' },
      { latitude: 35.6702, longitude: 139.7027, name: 'Harajuku Station' },
      { latitude: 35.6717, longitude: 139.7649, name: 'Ginza' },
      { latitude: 34.7024, longitude: 135.4959, name: 'Osaka Station' },
      { latitude: 34.6678, longitude: 135.5007, name: 'Namba Station' },
      { latitude: 34.6456, longitude: 135.5066, name: 'Tennoji Station' },
      { latitude: 34.7057, longitude: 135.4977, name: 'Umeda' }
    ];
  }

  async loadPersistedOverride(): Promise<void> {
    try {
      const result = await this.dataService.loadGenericData<OverrideLocation>(this.STORAGE_KEY);
      
      if (result.success && result.data) {
        this.isActive = true;
        this.currentOverride = result.data;
      } else {
        this.isActive = false;
        this.currentOverride = null;
      }
    } catch (error) {
      // Handle errors gracefully
      this.isActive = false;
      this.currentOverride = null;
    }
  }
}