interface DaySchedule {
  date: string;
  entries: any[];
}

interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

interface PersistenceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

export class DataPersistenceService {
  private storage: StorageAdapter;
  private readonly ITINERARY_KEY = 'mops_japan_itinerary';
  private readonly USER_LOCATION_KEY = 'mops_japan_user_location';

  constructor(storageAdapter: StorageAdapter) {
    this.storage = storageAdapter;
  }

  async saveItinerary(itinerary: DaySchedule[]): Promise<PersistenceResult> {
    try {
      await this.storage.setItem(this.ITINERARY_KEY, JSON.stringify(itinerary));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async loadItinerary(): Promise<PersistenceResult<DaySchedule[] | null>> {
    try {
      const data = await this.storage.getItem(this.ITINERARY_KEY);
      
      if (!data) {
        return { success: true, data: null };
      }

      try {
        const parsedData = JSON.parse(data);
        return { success: true, data: parsedData };
      } catch (parseError) {
        return {
          success: false,
          error: 'Failed to parse itinerary data'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async clearItinerary(): Promise<PersistenceResult> {
    try {
      await this.storage.removeItem(this.ITINERARY_KEY);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async saveUserLocation(location: UserLocation): Promise<PersistenceResult> {
    try {
      await this.storage.setItem(this.USER_LOCATION_KEY, JSON.stringify(location));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async loadUserLocation(): Promise<PersistenceResult<UserLocation | null>> {
    try {
      const data = await this.storage.getItem(this.USER_LOCATION_KEY);
      
      if (!data) {
        return { success: true, data: null };
      }

      try {
        const parsedData = JSON.parse(data);
        return { success: true, data: parsedData };
      } catch (parseError) {
        return {
          success: false,
          error: 'Failed to parse location data'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}