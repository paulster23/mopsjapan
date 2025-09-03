import { LocationService } from './LocationService';

export type PlaceCategory = 'accommodation' | 'restaurant' | 'entertainment' | 'transport' | 'shopping';

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  city: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  description?: string;
  distance?: number;
}

export interface PlaceWithDistance extends Place {
  distance: number;
}

export interface CalendarEvent {
  summary: string;
  description: string;
  location: string;
}

export interface PlaceStatistics {
  total: number;
  byCategory: Record<PlaceCategory, number>;
  byCity: Record<string, number>;
}

export class GooglePlacesService {
  private locationService: LocationService;
  private customPlaces: Place[] = [];

  constructor(locationService: LocationService) {
    this.locationService = locationService;
  }

  loadCustomMapPlaces(): Place[] {
    // Custom places from the user's Google My Maps
    const places: Place[] = [
      // Accommodations
      {
        id: 'sakura-hotel-hatagaya',
        name: 'Sakura Hotel Hatagaya',
        category: 'accommodation',
        city: 'Tokyo',
        coordinates: { latitude: 35.6684, longitude: 139.6645 },
        description: "Devin's Hotel"
      },
      {
        id: 'hotel-fukudaya',
        name: 'Hotel Fukudaya',
        category: 'accommodation',
        city: 'Tokyo',
        coordinates: { latitude: 35.6762, longitude: 139.6503 },
        description: 'booked on Agoda 9/15-17'
      },
      {
        id: 'smile-hotel-nara',
        name: 'Smile Hotel Nara',
        category: 'accommodation',
        city: 'Nara',
        coordinates: { latitude: 34.6851, longitude: 135.8048 }
      },
      {
        id: 'minoo-kakogawasanso',
        name: 'Minoo Kakogawasanso',
        category: 'accommodation',
        city: 'Osaka',
        coordinates: { latitude: 34.7695, longitude: 135.4698 },
        description: 'Ryokan Stay'
      },
      
      // Restaurants/Bars
      {
        id: 'shinjuku-nine-spices',
        name: 'Shinjuku NINE SPICES',
        category: 'restaurant',
        city: 'Tokyo',
        coordinates: { latitude: 35.6938, longitude: 139.7034 }
      },
      {
        id: 'ich-ni-san-hibiya',
        name: 'Ich-ni-san (Hibiya branch)',
        category: 'restaurant',
        city: 'Tokyo',
        coordinates: { latitude: 35.6751, longitude: 139.7594 },
        description: 'beef katsu'
      },
      {
        id: 'gyukatsu-ichi-ni-san',
        name: 'Gyukatsu Ichi Ni San',
        category: 'restaurant',
        city: 'Tokyo',
        coordinates: { latitude: 35.6684, longitude: 139.7034 },
        description: 'hole in the wall jazz cook beef katsu'
      },
      {
        id: 'conpass-osaka',
        name: 'Conpass',
        category: 'restaurant',
        city: 'Osaka',
        coordinates: { latitude: 34.6937, longitude: 135.5023 }
      },
      
      // Entertainment
      {
        id: 'live-house-fever',
        name: 'Live House Fever',
        category: 'entertainment',
        city: 'Tokyo',
        coordinates: { latitude: 35.6684, longitude: 139.7034 }
      },
      {
        id: 'stiff-slack-nagoya',
        name: 'Stiff Slack',
        category: 'entertainment',
        city: 'Nagoya',
        coordinates: { latitude: 35.1815, longitude: 136.9066 }
      },
      {
        id: 'kapital-legs-roppongi',
        name: 'KAPITAL Legs Roppongi',
        category: 'entertainment',
        city: 'Tokyo',
        coordinates: { latitude: 35.6627, longitude: 139.7345 }
      },
      
      // Transport
      {
        id: 'haneda-airport',
        name: 'Haneda Airport',
        category: 'transport',
        city: 'Tokyo',
        coordinates: { latitude: 35.5494, longitude: 139.7798 }
      },
      {
        id: 'akihabara-station',
        name: 'Akihabara Station',
        category: 'transport',
        city: 'Tokyo',
        coordinates: { latitude: 35.6986, longitude: 139.7731 }
      },
      {
        id: 'tokyo-station',
        name: 'Tokyo Station',
        category: 'transport',
        city: 'Tokyo',
        coordinates: { latitude: 35.6812, longitude: 139.7671 }
      },
      {
        id: 'naka-meguro-station',
        name: 'Naka-meguro Station',
        category: 'transport',
        city: 'Tokyo',
        coordinates: { latitude: 35.6439, longitude: 139.6988 }
      },
      {
        id: 'nikko-station',
        name: 'Nikko Station',
        category: 'transport',
        city: 'Nikko',
        coordinates: { latitude: 36.7569, longitude: 139.6231 }
      },
      
      // Shopping
      {
        id: 'shimokitazawa',
        name: 'Shimokitazawa',
        category: 'shopping',
        city: 'Tokyo',
        coordinates: { latitude: 35.6617, longitude: 139.6681 },
        description: 'vintage shops & cafes'
      },
      {
        id: 'koenjikita',
        name: 'Koenjikita',
        category: 'shopping',
        city: 'Tokyo',
        coordinates: { latitude: 35.7057, longitude: 139.6489 },
        description: 'thrift stores'
      },
      {
        id: 'hands-shibuya',
        name: 'Hands Shibuya',
        category: 'shopping',
        city: 'Tokyo',
        coordinates: { latitude: 35.6598, longitude: 139.7023 }
      },
      
      // New places from Google Map
      {
        id: 'don-quijote-shibuya',
        name: 'Don Quijote Shibuya',
        category: 'shopping',
        city: 'Tokyo'
      },
      {
        id: 'sensoji-temple',
        name: 'Sensoji Temple',
        category: 'entertainment',
        city: 'Tokyo'
      },
      {
        id: 'meiji-shrine',
        name: 'Meiji Shrine',
        category: 'entertainment',
        city: 'Tokyo'
      },
      {
        id: 'tsukiji-outer-market',
        name: 'Tsukiji Outer Market',
        category: 'restaurant',
        city: 'Tokyo'
      },
      {
        id: 'golden-gai',
        name: 'Golden Gai',
        category: 'restaurant',
        city: 'Tokyo'
      }
    ];

    this.customPlaces = places;
    return places;
  }

  getPlacesByCategory(category: PlaceCategory): Place[] {
    const allPlaces = this.getAllPlaces();
    return allPlaces.filter(place => place.category === category);
  }

  getPlacesByCity(city: string): Place[] {
    const allPlaces = this.getAllPlaces();
    return allPlaces.filter(place => 
      place.city.toLowerCase() === city.toLowerCase()
    );
  }

  findNearbyPlaces(userLocation: { latitude: number; longitude: number }, radiusKm: number): PlaceWithDistance[] {
    const allPlaces = this.getAllPlaces();
    const placesWithDistance: PlaceWithDistance[] = [];

    for (const place of allPlaces) {
      if (!place.coordinates) continue;

      const distance = this.locationService.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        place.coordinates.latitude,
        place.coordinates.longitude
      );

      if (distance <= radiusKm) {
        placesWithDistance.push({
          ...place,
          distance
        });
      }
    }

    // Sort by distance (closest first)
    return placesWithDistance.sort((a, b) => a.distance - b.distance);
  }

  searchPlaces(query: string): Place[] {
    const allPlaces = this.getAllPlaces();
    const lowercaseQuery = query.toLowerCase();

    return allPlaces.filter(place =>
      place.name.toLowerCase().includes(lowercaseQuery) ||
      (place.description && place.description.toLowerCase().includes(lowercaseQuery))
    );
  }

  getPlaceDetails(placeName: string): Place | null {
    const allPlaces = this.getAllPlaces();
    return allPlaces.find(place => place.name === placeName) || null;
  }

  getPlacesForItineraryDay(dayLocation: string, preferences: PlaceCategory[]): Place[] {
    const cityPlaces = this.getPlacesByCity(dayLocation);
    return cityPlaces.filter(place => preferences.includes(place.category));
  }

  addCustomPlace(newPlace: Omit<Place, 'id'>): boolean {
    // Check if place already exists
    const existingPlace = this.getPlaceDetails(newPlace.name);
    if (existingPlace) {
      return false;
    }

    const place: Place = {
      ...newPlace,
      id: this.generatePlaceId(newPlace.name)
    };

    this.customPlaces.push(place);
    return true;
  }

  exportPlacesForCalendar(places: Place[]): CalendarEvent[] {
    return places.map(place => ({
      summary: place.name,
      description: place.description || `${place.category} in ${place.city}`,
      location: place.coordinates 
        ? `${place.name}, ${place.city} (${place.coordinates.latitude},${place.coordinates.longitude})`
        : `${place.name}, ${place.city}`
    }));
  }

  getPlaceStatistics(): PlaceStatistics {
    const allPlaces = this.getAllPlaces();
    
    const byCategory: Record<PlaceCategory, number> = {
      accommodation: 0,
      restaurant: 0,
      entertainment: 0,
      transport: 0,
      shopping: 0
    };

    const byCity: Record<string, number> = {};

    for (const place of allPlaces) {
      byCategory[place.category]++;
      
      if (byCity[place.city]) {
        byCity[place.city]++;
      } else {
        byCity[place.city] = 1;
      }
    }

    return {
      total: allPlaces.length,
      byCategory,
      byCity
    };
  }

  private getAllPlaces(): Place[] {
    if (this.customPlaces.length === 0) {
      this.loadCustomMapPlaces();
    }
    return this.customPlaces;
  }

  private generatePlaceId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }
}