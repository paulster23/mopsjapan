import { LocationService } from '../../services/LocationService';
import { StationFinderService } from '../../services/StationFinderService';
import { TokyoODPTService, StationStatus } from '../../services/TokyoODPTService';
import { RouteCalculationService, RouteOption, Route } from '../../services/RouteCalculationService';
import { OfflineMapService, SubwayStation as OfflineSubwayStation, GeographicBounds } from '../../services/OfflineMapService';

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface LocationResult {
  success: boolean;
  location?: UserLocation;
  error?: string;
}

interface SubwayStation {
  name: string;
  latitude: number;
  longitude: number;
  distance: number;
  lines: string[];
}

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}


interface StationWithStatus extends SubwayStation {
  status: string;
  delays: Array<{
    line: string;
    delayMinutes: number;
    reason: string;
  }>;
  lastUpdated?: string;
}

interface DirectionStep {
  type: 'walk' | 'transit' | 'transfer';
  instruction: string;
  duration?: number;
  line?: string;
  fromStation?: string;
  toStation?: string;
}

interface OfflineStationsResult {
  success: boolean;
  stations?: StationWithStatus[];
  fromCache: boolean;
  error?: string;
}

export class MapScreenService {
  private locationService: LocationService;
  private stationFinder: StationFinderService;
  private odptService?: TokyoODPTService;
  private routeService?: RouteCalculationService;
  public offlineMapService: OfflineMapService;
  private defaultLocation: UserLocation = {
    latitude: 35.6762, // Tokyo Station
    longitude: 139.6503
  };

  constructor(locationService: LocationService, odptService?: TokyoODPTService, routeService?: RouteCalculationService) {
    this.locationService = locationService;
    this.stationFinder = new StationFinderService(locationService);
    this.odptService = odptService;
    this.routeService = routeService;
    this.offlineMapService = new OfflineMapService();
  }

  async getUserLocation(): Promise<LocationResult> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({
          success: false,
          error: 'Geolocation not supported'
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          // Validate coordinates
          const validation = this.locationService.validateCoordinates(latitude, longitude);
          if (!validation.isValid) {
            resolve({
              success: false,
              error: validation.error
            });
            return;
          }

          // Check if location is in Japan
          if (!this.locationService.isInJapan(latitude, longitude)) {
            resolve({
              success: false,
              error: 'Location is not in Japan'
            });
            return;
          }

          resolve({
            success: true,
            location: { latitude, longitude }
          });
        },
        (error) => {
          let errorMessage = 'Unknown location error';
          
          switch (error.code) {
            case 1:
              errorMessage = 'Location permission denied';
              break;
            case 2:
              errorMessage = 'Location unavailable';
              break;
            case 3:
              errorMessage = 'Location request timeout';
              break;
          }

          resolve({
            success: false,
            error: errorMessage
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  findNearbyStations(userLocation: UserLocation, radiusKm: number = 5.0): SubwayStation[] {
    return this.stationFinder.findStationsInRadius(userLocation, radiusKm).map(station => ({
      name: station.name,
      latitude: station.latitude,
      longitude: station.longitude,
      distance: Math.round(station.distance * 10) / 10,
      lines: station.lines
    }));
  }

  getMapRegion(userLocation?: UserLocation): MapRegion {
    const location = userLocation || this.defaultLocation;
    
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.0922, // ~10km
      longitudeDelta: 0.0421  // ~4km
    };
  }

  formatLocationForDisplay(latitude: number, longitude: number): string {
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }

  getLocationPermissionStatus(): Promise<PermissionState | 'unsupported'> {
    if (!navigator.permissions) {
      return Promise.resolve('unsupported');
    }

    return navigator.permissions.query({ name: 'geolocation' as PermissionName })
      .then(result => result.state)
      .catch(() => 'unsupported');
  }

  isLocationInTokyoArea(location: UserLocation): boolean {
    // Tokyo metropolitan area rough bounds
    const tokyoBounds = {
      north: 35.8986,
      south: 35.4969,
      east: 139.9194,
      west: 139.2584
    };

    return (
      location.latitude >= tokyoBounds.south &&
      location.latitude <= tokyoBounds.north &&
      location.longitude >= tokyoBounds.west &&
      location.longitude <= tokyoBounds.east
    );
  }

  async getStationStatus(stationName: string): Promise<StationStatus> {
    if (!this.odptService) {
      return {
        stationId: '',
        status: 'Unknown',
        delays: [],
        lastUpdated: new Date().toISOString()
      };
    }

    try {
      const status = await this.odptService.getStationStatus(stationName);
      return status;
    } catch (error) {
      return {
        stationId: '',
        status: 'Unknown',
        delays: [],
        lastUpdated: new Date().toISOString()
      };
    }
  }

  async getNearbyStationsWithStatus(userLocation: UserLocation, radiusKm: number = 5.0): Promise<StationWithStatus[]> {
    const nearbyStations = this.findNearbyStations(userLocation, radiusKm);
    
    const stationsWithStatus: StationWithStatus[] = [];
    
    for (const station of nearbyStations) {
      const status = await this.getStationStatus(station.name);
      stationsWithStatus.push({
        ...station,
        status: status.status,
        delays: status.delays,
        lastUpdated: status.lastUpdated
      });
    }
    
    return stationsWithStatus;
  }

  async getRouteOptions(fromLocation: UserLocation, toLocation: UserLocation): Promise<RouteOption[]> {
    if (!this.routeService) {
      return [];
    }

    try {
      const options = await this.routeService.getRouteOptions(fromLocation, toLocation);
      return options;
    } catch (error) {
      return [];
    }
  }

  async getDirections(route: Route): Promise<DirectionStep[]> {
    const directions: DirectionStep[] = [];

    if (route.segments.length === 0) {
      return directions;
    }

    // Add initial walking step to first station
    const firstSegment = route.segments[0];
    directions.push({
      type: 'walk',
      instruction: `Walk to ${firstSegment.fromStation} Station`,
      duration: 5 // Estimated walking time
    });

    // Add transit and transfer steps
    for (let i = 0; i < route.segments.length; i++) {
      const segment = route.segments[i];
      
      // Add transit step
      directions.push({
        type: 'transit',
        instruction: `Take ${segment.line} to ${segment.toStation}`,
        duration: segment.duration,
        line: segment.line,
        fromStation: segment.fromStation,
        toStation: segment.toStation
      });

      // Add transfer step if there's a next segment
      if (i < route.segments.length - 1) {
        const nextSegment = route.segments[i + 1];
        directions.push({
          type: 'transfer',
          instruction: `Transfer to ${nextSegment.line}`,
          duration: segment.transferTime || 3
        });
      }
    }

    // Add final walking step from last station
    const lastSegment = route.segments[route.segments.length - 1];
    directions.push({
      type: 'walk',
      instruction: `Walk to destination from ${lastSegment.toStation} Station`,
      duration: 5 // Estimated walking time
    });

    return directions;
  }

  async findNearbyStationsWithOffline(userLocation: UserLocation, radiusKm: number = 5.0): Promise<OfflineStationsResult> {
    try {
      // Try to get cached data first
      const cachedResult = await this.offlineMapService.getCachedSubwayMap();
      
      if (cachedResult.success && cachedResult.data) {
        // Use cached data to find nearby stations
        const bounds: GeographicBounds = {
          north: userLocation.latitude + (radiusKm / 111), // Rough km to degrees conversion
          south: userLocation.latitude - (radiusKm / 111),
          east: userLocation.longitude + (radiusKm / (111 * Math.cos(userLocation.latitude * Math.PI / 180))),
          west: userLocation.longitude - (radiusKm / (111 * Math.cos(userLocation.latitude * Math.PI / 180)))
        };

        const stationsResult = await this.offlineMapService.getStationsByArea(bounds);
        
        if (stationsResult.success && stationsResult.data) {
          // Convert offline stations to StationWithStatus format
          const stationsWithStatus: StationWithStatus[] = stationsResult.data.map(station => ({
            name: station.name,
            latitude: station.latitude,
            longitude: station.longitude,
            distance: Math.round(this.locationService.calculateDistance(
              userLocation.latitude, userLocation.longitude,
              station.latitude, station.longitude
            ) * 10) / 10,
            lines: station.lines,
            status: 'Unknown', // Default status when using cached data
            delays: [],
            lastUpdated: new Date().toISOString()
          }));

          return {
            success: true,
            stations: stationsWithStatus,
            fromCache: true,
            error: 'API unavailable, using cached data'
          };
        }
      }

      // No cache available and no API fallback implemented yet
      return {
        success: false,
        fromCache: false,
        error: 'No cached data available and API failed'
      };
    } catch (error) {
      return {
        success: false,
        fromCache: false,
        error: `Failed to find stations: ${(error as Error).message}`
      };
    }
  }
}