import { LocationService } from './LocationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PlaceCategory = 'accommodation' | 'restaurant' | 'entertainment' | 'transport' | 'shopping' | 'hardware';

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
  private syncedPlaces: Place[] = [];
  private readonly SYNCED_PLACES_KEY = 'syncedPlaces';

  constructor(locationService: LocationService) {
    this.locationService = locationService;
    // Load synced places from storage
    this.loadSyncedPlaces();
  }

  loadCustomMapPlaces(): Place[] {
    // No static places - all places are now synced from external sources
    return [];
  }

  private async loadSyncedPlaces(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.SYNCED_PLACES_KEY);
      if (stored) {
        this.syncedPlaces = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load synced places from storage:', error);
      this.syncedPlaces = [];
    }
  }

  private async saveSyncedPlaces(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.SYNCED_PLACES_KEY, JSON.stringify(this.syncedPlaces));
    } catch (error) {
      console.error('Failed to save synced places to storage:', error);
    }
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
    // Check if place already exists in both static and synced places
    const existingPlace = this.getPlaceDetails(newPlace.name);
    if (existingPlace) {
      return false;
    }

    const place: Place = {
      ...newPlace,
      id: this.generatePlaceId(newPlace.name)
    };

    this.syncedPlaces.push(place);
    
    // Save to storage asynchronously (but don't wait for it)
    this.saveSyncedPlaces().catch(error => {
      console.error('Failed to save synced places after adding:', error);
    });
    
    return true;
  }

  updatePlace(placeId: string, updates: Partial<Pick<Place, 'name' | 'category' | 'description'>>): boolean {
    // Find place in synced places
    const placeIndex = this.syncedPlaces.findIndex(place => place.id === placeId);
    
    if (placeIndex === -1) {
      return false;
    }

    // Check if new name conflicts with existing places (if name is being updated)
    if (updates.name && updates.name !== this.syncedPlaces[placeIndex].name) {
      const conflictingPlace = this.getPlaceDetails(updates.name);
      if (conflictingPlace && conflictingPlace.id !== placeId) {
        return false; // Name conflict
      }
    }

    // Update the place
    this.syncedPlaces[placeIndex] = {
      ...this.syncedPlaces[placeIndex],
      ...updates
    };

    // If name changed, update the ID as well
    if (updates.name) {
      this.syncedPlaces[placeIndex].id = this.generatePlaceId(updates.name);
    }

    // Save to storage asynchronously
    this.saveSyncedPlaces().catch(error => {
      console.error('Failed to save synced places after updating:', error);
    });

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
      shopping: 0,
      hardware: 0
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

  getAllPlaces(): Place[] {
    // Return only synced places
    return [...this.syncedPlaces];
  }

  private generatePlaceId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }
}