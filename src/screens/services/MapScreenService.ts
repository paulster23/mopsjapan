import { LocationService } from '../../services/LocationService';

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

export class MapScreenService {
  private locationService: LocationService;
  private defaultLocation: UserLocation = {
    latitude: 35.6762, // Tokyo Station
    longitude: 139.6503
  };

  // Major Tokyo subway stations
  private tokyoStations: Omit<SubwayStation, 'distance'>[] = [
    {
      name: 'Tokyo Station',
      latitude: 35.6812,
      longitude: 139.7671,
      lines: ['JR Yamanote', 'JR Tokaido', 'Marunouchi Line']
    },
    {
      name: 'Shibuya Station',
      latitude: 35.6580,
      longitude: 139.7016,
      lines: ['JR Yamanote', 'Ginza Line', 'Hanzomon Line']
    },
    {
      name: 'Shinjuku Station',
      latitude: 35.6896,
      longitude: 139.7006,
      lines: ['JR Yamanote', 'Marunouchi Line', 'Shinjuku Line']
    },
    {
      name: 'Ikebukuro Station',
      latitude: 35.7295,
      longitude: 139.7109,
      lines: ['JR Yamanote', 'Marunouchi Line', 'Yurakucho Line']
    }
  ];

  constructor(locationService: LocationService) {
    this.locationService = locationService;
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
    const stationsWithDistance: SubwayStation[] = [];

    for (const station of this.tokyoStations) {
      const distance = this.locationService.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        station.latitude,
        station.longitude
      );

      if (distance <= radiusKm) {
        stationsWithDistance.push({
          ...station,
          distance: Math.round(distance * 10) / 10 // Round to 1 decimal
        });
      }
    }

    // Sort by distance (closest first)
    return stationsWithDistance.sort((a, b) => a.distance - b.distance);
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
}