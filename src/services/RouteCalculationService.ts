import { LocationService } from './LocationService';
import { StationFinderService, StationWithDistance } from './StationFinderService';

export interface Location {
  latitude: number;
  longitude: number;
}

export interface RouteSegment {
  line: string;
  fromStation: string;
  toStation: string;
  duration: number;
  stationCount: number;
  transferTime?: number;
}

export interface Route {
  segments: RouteSegment[];
  totalDuration: number;
  totalDistance: number;
  transferCount: number;
}

export interface RouteResult {
  success: boolean;
  route?: Route;
  error?: string;
}

export interface WalkingRoute {
  distance: number;
  duration: number;
  mode: 'walking';
}

export interface RouteOption {
  type: 'transit' | 'walking';
  route?: Route;
  walkingRoute?: WalkingRoute;
  duration: number;
  distance: number;
}

export class RouteCalculationService {
  private locationService: LocationService;
  private stationFinder: StationFinderService;

  constructor(locationService: LocationService, stationFinder: StationFinderService) {
    this.locationService = locationService;
    this.stationFinder = stationFinder;
  }

  async calculateRoute(fromLocation: Location, toLocation: Location): Promise<RouteResult> {
    // Find nearest stations to start and end locations
    const fromStation = this.stationFinder.findNearestStation(fromLocation);
    const toStation = this.stationFinder.findNearestStation(toLocation);

    if (!fromStation || !toStation) {
      return {
        success: false,
        error: 'Cannot find nearest stations'
      };
    }

    // Check for direct connection (common line)
    const commonLines = this.findCommonLines(fromStation.lines, toStation.lines);
    
    if (commonLines.length === 0) {
      return {
        success: false,
        error: 'No route found between stations'
      };
    }

    // Use the first common line for direct route
    const selectedLine = commonLines[0];
    const estimatedStations = this.estimateStationCount(fromStation, toStation);
    const duration = this.estimateTransitTime(selectedLine, estimatedStations);
    const distance = this.locationService.calculateDistance(
      fromLocation.latitude,
      fromLocation.longitude,
      toLocation.latitude,
      toLocation.longitude
    );

    const route: Route = {
      segments: [{
        line: selectedLine,
        fromStation: fromStation.name,
        toStation: toStation.name,
        duration,
        stationCount: estimatedStations
      }],
      totalDuration: duration,
      totalDistance: distance,
      transferCount: 0
    };

    return {
      success: true,
      route
    };
  }

  calculateWalkingRoute(fromLocation: Location, toLocation: Location): WalkingRoute {
    const distance = this.locationService.calculateDistance(
      fromLocation.latitude,
      fromLocation.longitude,
      toLocation.latitude,
      toLocation.longitude
    );

    // Walking speed: ~5 km/h, so duration = distance * 12 minutes per km
    const duration = Math.round(distance * 12);

    return {
      distance,
      duration,
      mode: 'walking'
    };
  }

  findCommonLines(fromLines: string[], toLines: string[]): string[] {
    return fromLines.filter(line => toLines.includes(line));
  }

  estimateTransitTime(line: string, stationCount: number): number {
    const isJRLine = line.includes('JR');
    const averageTimePerStation = isJRLine ? 3 : 2; // JR: 3 min, Subway: 2 min
    const minimumTime = 5;
    
    return Math.max(stationCount * averageTimePerStation, minimumTime);
  }

  async getRouteOptions(fromLocation: Location, toLocation: Location): Promise<RouteOption[]> {
    const options: RouteOption[] = [];

    // Try transit route
    const transitResult = await this.calculateRoute(fromLocation, toLocation);
    if (transitResult.success && transitResult.route) {
      options.push({
        type: 'transit',
        route: transitResult.route,
        duration: transitResult.route.totalDuration,
        distance: transitResult.route.totalDistance
      });
    }

    // Always include walking option
    const walkingRoute = this.calculateWalkingRoute(fromLocation, toLocation);
    options.push({
      type: 'walking',
      walkingRoute,
      duration: walkingRoute.duration,
      distance: walkingRoute.distance
    });

    // Sort by duration (fastest first)
    return options.sort((a, b) => a.duration - b.duration);
  }

  private estimateStationCount(fromStation: StationWithDistance, toStation: StationWithDistance): number {
    // Simple estimation based on distance - roughly 1 station per 0.8km
    const distance = this.locationService.calculateDistance(
      fromStation.latitude,
      fromStation.longitude,
      toStation.latitude,
      toStation.longitude
    );
    
    return Math.max(Math.round(distance / 0.8), 1);
  }
}