import { LocationService } from './LocationService';

export interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  lines: string[];
  area?: string;
  amenities?: string[];
  transferLines?: string[];
  distance?: number;
}

export interface StationWithDistance extends Station {
  distance: number;
}

export class StationFinderService {
  private locationService: LocationService;
  private stations: Station[] = [
    {
      id: 'tokyo-station',
      name: 'Tokyo Station',
      latitude: 35.6812,
      longitude: 139.7671,
      lines: ['JR Yamanote', 'JR Tokaido', 'Marunouchi Line'],
      area: 'Central Tokyo'
    },
    {
      id: 'shibuya-station',
      name: 'Shibuya Station',
      latitude: 35.6580,
      longitude: 139.7016,
      lines: ['JR Yamanote', 'Ginza Line', 'Hanzomon Line'],
      area: 'Shibuya/Harajuku'
    },
    {
      id: 'ginza-station',
      name: 'Ginza Station',
      latitude: 35.6717,
      longitude: 139.7640,
      lines: ['Ginza Line', 'Marunouchi Line', 'Hibiya Line'],
      area: 'Central Tokyo'
    },
    {
      id: 'shinjuku-station',
      name: 'Shinjuku Station',
      latitude: 35.6896,
      longitude: 139.7006,
      lines: ['JR Yamanote', 'Marunouchi Line', 'Shinjuku Line'],
      area: 'Shinjuku'
    }
  ];

  constructor(locationService: LocationService) {
    this.locationService = locationService;
  }

  findNearestStation(userLocation: { latitude: number; longitude: number }): StationWithDistance | null {
    if (this.stations.length === 0) {
      return null;
    }

    let nearestStation: StationWithDistance | null = null;
    let minDistance = Infinity;

    for (const station of this.stations) {
      const distance = this.locationService.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        station.latitude,
        station.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestStation = { ...station, distance };
      }
    }

    return nearestStation;
  }

  findStationsInRadius(userLocation: { latitude: number; longitude: number }, radiusKm: number): StationWithDistance[] {
    const stationsWithDistance: StationWithDistance[] = [];

    for (const station of this.stations) {
      const distance = this.locationService.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        station.latitude,
        station.longitude
      );

      if (distance <= radiusKm) {
        stationsWithDistance.push({ ...station, distance });
      }
    }

    return stationsWithDistance.sort((a, b) => a.distance - b.distance);
  }

  findStationsByLine(lineName: string): Station[] {
    return this.stations.filter(station => 
      station.lines.some(line => line.includes(lineName))
    );
  }

  getStationsByArea(): Record<string, Station[]> {
    const stationsByArea: Record<string, Station[]> = {};

    for (const station of this.stations) {
      const area = station.area || 'Other';
      if (!stationsByArea[area]) {
        stationsByArea[area] = [];
      }
      stationsByArea[area].push(station);
    }

    return stationsByArea;
  }

  searchStations(query: string): Station[] {
    const lowercaseQuery = query.toLowerCase();
    
    return this.stations.filter(station => 
      station.name.toLowerCase().includes(lowercaseQuery) ||
      station.lines.some(line => line.toLowerCase().includes(lowercaseQuery))
    );
  }

  getAllStations(): Station[] {
    return [...this.stations];
  }

  clearStations(): void {
    this.stations = [];
  }

  loadExtendedStationData(): void {
    // Add extended station data with amenities and transfer information
    const extendedStations: Station[] = [
      {
        id: 'ikebukuro-station',
        name: 'Ikebukuro Station',
        latitude: 35.7295,
        longitude: 139.7109,
        lines: ['JR Yamanote', 'Marunouchi Line', 'Yurakucho Line'],
        area: 'Ikebukuro',
        amenities: ['shopping', 'restaurants'],
        transferLines: ['JR Saikyo Line', 'JR Shonan-Shinjuku Line']
      },
      {
        id: 'ueno-station',
        name: 'Ueno Station',
        latitude: 35.7134,
        longitude: 139.7773,
        lines: ['JR Yamanote', 'JR Keihin-Tohoku', 'Ginza Line'],
        area: 'Ueno',
        amenities: ['museums', 'park'],
        transferLines: ['JR Tohoku Shinkansen', 'Hibiya Line']
      }
    ];

    // Update existing Tokyo Station with amenities
    const tokyoStationIndex = this.stations.findIndex(s => s.name === 'Tokyo Station');
    if (tokyoStationIndex !== -1) {
      this.stations[tokyoStationIndex] = {
        ...this.stations[tokyoStationIndex],
        amenities: ['shopping', 'restaurants', 'hotels'],
        transferLines: ['JR Tohoku Shinkansen', 'JR Tokaido Shinkansen', 'Tozai Line']
      };
    }

    this.stations.push(...extendedStations);
  }
}