import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SubwayStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  lines: string[];
}

export interface SubwayLine {
  id: string;
  name: string;
  color: string;
  stations: string[];
}

export interface SubwayMapData {
  stations: SubwayStation[];
  lines: SubwayLine[];
  version: string;
  lastUpdated: string;
}

export interface OfflineMapResult<T = SubwayMapData> {
  success: boolean;
  data?: T;
  error?: string;
  updated?: boolean;
}

export interface GeographicBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export class OfflineMapService {
  private readonly STORAGE_KEY = 'tokyo_subway_map';
  private readonly API_URL = 'https://api.odpt.org/api/v4/odpt:Station';
  private readonly LINES_API_URL = 'https://api.odpt.org/api/v4/odpt:Railway';
  private readonly STALE_THRESHOLD_DAYS = 7;

  async cacheSubwayMap(mapData: SubwayMapData): Promise<OfflineMapResult<void>> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(mapData));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to cache subway map: ${(error as Error).message}`
      };
    }
  }

  async getCachedSubwayMap(): Promise<OfflineMapResult<SubwayMapData>> {
    try {
      const cachedData = await AsyncStorage.getItem(this.STORAGE_KEY);
      
      if (!cachedData) {
        return {
          success: false,
          error: 'No cached subway map found'
        };
      }

      const parsedData = JSON.parse(cachedData) as SubwayMapData;
      return { success: true, data: parsedData };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse cached data: ${(error as Error).message}`
      };
    }
  }

  async isMapDataStale(mapData: SubwayMapData): Promise<boolean> {
    const lastUpdated = new Date(mapData.lastUpdated);
    const now = new Date();
    const daysDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysDiff > this.STALE_THRESHOLD_DAYS;
  }

  async downloadSubwayMapData(): Promise<OfflineMapResult<SubwayMapData>> {
    try {
      const response = await fetch(this.API_URL);
      
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to download map data: ${response.status} ${response.statusText}`
        };
      }

      const apiData = await response.json();
      
      // Transform API data to our format
      const mapData: SubwayMapData = {
        stations: apiData.stations || [],
        lines: apiData.lines || [],
        version: '1.0.0',
        lastUpdated: new Date().toISOString()
      };

      return { success: true, data: mapData };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${(error as Error).message}`
      };
    }
  }

  async updateMapDataIfNeeded(): Promise<OfflineMapResult<SubwayMapData>> {
    try {
      // Get cached data
      const cachedResult = await this.getCachedSubwayMap();
      
      // If no cached data exists, download fresh data
      if (!cachedResult.success || !cachedResult.data) {
        const downloadResult = await this.downloadSubwayMapData();
        
        if (downloadResult.success && downloadResult.data) {
          await this.cacheSubwayMap(downloadResult.data);
          return {
            success: true,
            data: downloadResult.data,
            updated: true
          };
        }
        
        return downloadResult;
      }

      // Check if cached data is stale
      const isStale = await this.isMapDataStale(cachedResult.data);
      
      if (isStale) {
        const downloadResult = await this.downloadSubwayMapData();
        
        if (downloadResult.success && downloadResult.data) {
          await this.cacheSubwayMap(downloadResult.data);
          return {
            success: true,
            data: downloadResult.data,
            updated: true
          };
        }
        
        // If download fails, return cached data
        return {
          success: true,
          data: cachedResult.data,
          updated: false
        };
      }

      // Data is fresh, return cached data
      return {
        success: true,
        data: cachedResult.data,
        updated: false
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update map data: ${(error as Error).message}`
      };
    }
  }

  async getStationsByArea(bounds: GeographicBounds): Promise<OfflineMapResult<SubwayStation[]>> {
    try {
      const cachedResult = await this.getCachedSubwayMap();
      
      if (!cachedResult.success || !cachedResult.data) {
        return {
          success: false,
          error: 'No cached map data available'
        };
      }

      const filteredStations = cachedResult.data.stations.filter(station =>
        station.latitude >= bounds.south &&
        station.latitude <= bounds.north &&
        station.longitude >= bounds.west &&
        station.longitude <= bounds.east
      );

      return {
        success: true,
        data: filteredStations
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to filter stations: ${(error as Error).message}`
      };
    }
  }

  async clearCache(): Promise<OfflineMapResult<void>> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to clear cache: ${(error as Error).message}`
      };
    }
  }
}