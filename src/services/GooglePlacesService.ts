import { LocationService } from './LocationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isDevelopment } from '../config/environment';

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

export interface UserPlaceEdit {
  placeId: string;
  originalPlaceId?: string; // In case user renamed it and ID changed
  editedFields: {
    name?: string;
    category?: PlaceCategory;
    description?: string;
  };
  editedAt: string;
  version: number;
}

export interface PlaceStorageData {
  originalPlaces: Place[]; // Raw data from feeds
  userEdits: UserPlaceEdit[]; // User modifications
  lastSyncAt?: string;
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
  private originalPlaces: Place[] = [];
  private userEdits: UserPlaceEdit[] = [];
  private readonly PLACES_STORAGE_KEY = 'placesStorageData';
  private readonly LEGACY_SYNCED_PLACES_KEY = 'syncedPlaces'; // For migration

  constructor(locationService: LocationService) {
    this.locationService = locationService;
    // Load places storage data
    this.loadPlacesStorage();
    // Load development mock data if in development environment
    this.loadDevelopmentMockDataIfNeeded();
  }

  loadCustomMapPlaces(): Place[] {
    // No static places - all places are now synced from external sources
    return [];
  }

  private async loadPlacesStorage(): Promise<void> {
    try {
      // Try to load new format first
      const stored = await AsyncStorage.getItem(this.PLACES_STORAGE_KEY);
      if (stored) {
        const storageData: PlaceStorageData = JSON.parse(stored);
        this.originalPlaces = storageData.originalPlaces || [];
        this.userEdits = storageData.userEdits || [];
        return;
      }

      // Migrate from legacy format if new format not found
      await this.migrateLegacyStorage();
    } catch (error) {
      console.warn('Failed to load places storage:', error);
      this.originalPlaces = [];
      this.userEdits = [];
    }
  }

  private async migrateLegacyStorage(): Promise<void> {
    try {
      const legacyStored = await AsyncStorage.getItem(this.LEGACY_SYNCED_PLACES_KEY);
      if (legacyStored) {
        const legacyPlaces: Place[] = JSON.parse(legacyStored);
        // Treat all legacy places as original places (no edits tracked)
        this.originalPlaces = legacyPlaces;
        this.userEdits = [];
        
        // Save in new format and remove legacy
        await this.savePlacesStorage();
        await AsyncStorage.removeItem(this.LEGACY_SYNCED_PLACES_KEY);
        console.log('Successfully migrated legacy places storage');
      }
    } catch (error) {
      console.warn('Failed to migrate legacy storage:', error);
    }
  }

  private loadDevelopmentMockDataIfNeeded(): void {
    // Only load mock data in development environment
    if (!isDevelopment()) {
      return;
    }

    // Only load mock data if we have no original places (fresh start)
    if (this.originalPlaces.length > 0) {
      return;
    }

    // Create realistic Tokyo places for testing
    const mockPlaces: Place[] = [
      // Accommodation
      {
        id: 'hotel-gracery-shinjuku',
        name: 'Hotel Gracery Shinjuku',
        category: 'accommodation',
        city: 'Tokyo',
        coordinates: { latitude: 35.6943, longitude: 139.7006 },
        description: 'Modern hotel in the heart of Shinjuku with great city views'
      },
      {
        id: 'richmond-hotel-tokyo-suidobashi',
        name: 'Richmond Hotel Tokyo Suidobashi',
        category: 'accommodation', 
        city: 'Tokyo',
        coordinates: { latitude: 35.7022, longitude: 139.7528 },
        description: 'Comfortable business hotel near Tokyo Dome'
      },
      
      // Restaurants
      {
        id: 'sukiyabashi-jiro',
        name: 'Sukiyabashi Jiro',
        category: 'restaurant',
        city: 'Tokyo',
        coordinates: { latitude: 35.6717, longitude: 139.7633 },
        description: 'World-famous sushi restaurant in Ginza'
      },
      {
        id: 'nabezo-shibuya',
        name: 'Nabezo Shibuya',
        category: 'restaurant',
        city: 'Tokyo', 
        coordinates: { latitude: 35.6581, longitude: 139.7016 },
        description: 'All-you-can-eat shabu-shabu and sushi buffet'
      },
      {
        id: 'ichiran-ramen-shibuya',
        name: 'Ichiran Ramen Shibuya',
        category: 'restaurant',
        city: 'Tokyo',
        coordinates: { latitude: 35.6590, longitude: 139.7016 },
        description: 'Famous tonkotsu ramen chain with individual booths'
      },
      
      // Entertainment
      {
        id: 'tokyo-skytree',
        name: 'Tokyo Skytree',
        category: 'entertainment',
        city: 'Tokyo',
        coordinates: { latitude: 35.7101, longitude: 139.8107 },
        description: 'Iconic broadcasting tower with observation decks'
      },
      {
        id: 'teamlabs-borderless',
        name: 'teamLab Borderless',
        category: 'entertainment',
        city: 'Tokyo',
        coordinates: { latitude: 35.6249, longitude: 139.7798 },
        description: 'Digital art museum in Odaiba'
      },
      {
        id: 'sensoji-temple',
        name: 'Sensoji Temple',
        category: 'entertainment',
        city: 'Tokyo',
        coordinates: { latitude: 35.7148, longitude: 139.7967 },
        description: 'Historic Buddhist temple in Asakusa'
      },
      
      // Transport
      {
        id: 'jr-shinjuku-station',
        name: 'JR Shinjuku Station',
        category: 'transport',
        city: 'Tokyo',
        coordinates: { latitude: 35.6896, longitude: 139.7006 },
        description: 'Major railway station and transport hub'
      },
      {
        id: 'haneda-airport-terminal-2',
        name: 'Haneda Airport Terminal 2',
        category: 'transport',
        city: 'Tokyo',
        coordinates: { latitude: 35.5494, longitude: 139.7798 },
        description: 'Domestic flights terminal at Tokyo Haneda Airport'
      },
      
      // Shopping
      {
        id: 'shibuya-crossing',
        name: 'Shibuya Sky',
        category: 'shopping',
        city: 'Tokyo',
        coordinates: { latitude: 35.6598, longitude: 139.7006 },
        description: 'Shopping and observation deck complex'
      },
      {
        id: 'don-quijote-shibuya',
        name: 'Don Quijote Shibuya',
        category: 'shopping',
        city: 'Tokyo',
        coordinates: { latitude: 35.6617, longitude: 139.7040 },
        description: '24-hour discount store with unique Japanese goods'
      },
      
      // Hardware  
      {
        id: 'yodobashi-akiba',
        name: 'Yodobashi-Akiba',
        category: 'hardware',
        city: 'Tokyo',
        coordinates: { latitude: 35.6989, longitude: 139.7732 },
        description: 'Massive electronics store in Akihabara'
      },
      {
        id: 'bic-camera-shinjuku-east',
        name: 'Bic Camera Shinjuku East',
        category: 'hardware',
        city: 'Tokyo',
        coordinates: { latitude: 35.6911, longitude: 139.7041 },
        description: 'Large electronics retailer near Shinjuku Station'
      }
    ];

    // Add mock places as original places (they can be edited like synced data)
    this.originalPlaces = [...mockPlaces];
    
    // Save the mock data so it persists between sessions
    this.savePlacesStorage().catch(error => {
      console.warn('Failed to save mock places storage:', error);
    });
    
    console.log('Loaded', mockPlaces.length, 'development mock places');
  }

  private async savePlacesStorage(): Promise<void> {
    try {
      const storageData: PlaceStorageData = {
        originalPlaces: this.originalPlaces,
        userEdits: this.userEdits,
        lastSyncAt: new Date().toISOString()
      };
      await AsyncStorage.setItem(this.PLACES_STORAGE_KEY, JSON.stringify(storageData));
    } catch (error) {
      console.error('Failed to save places storage:', error);
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
    // Check if place already exists
    const existingPlace = this.getPlaceDetails(newPlace.name);
    if (existingPlace) {
      return false;
    }

    const place: Place = {
      ...newPlace,
      id: this.generatePlaceId(newPlace.name)
    };

    // Add to original places (treat as new original data)
    this.originalPlaces.push(place);
    
    // Save to storage asynchronously (but don't wait for it)
    this.savePlacesStorage().catch(error => {
      console.error('Failed to save places storage after adding:', error);
    });
    
    return true;
  }

  // New method for sync operations to add places from external feeds
  addOriginalPlace(newPlace: Place): boolean {
    // Check if place already exists in original places
    const existingPlace = this.originalPlaces.find(place => 
      place.id === newPlace.id || place.name === newPlace.name
    );
    if (existingPlace) {
      return false;
    }

    this.originalPlaces.push({ ...newPlace });
    return true;
  }

  // Method to bulk replace original places (for sync operations)
  replaceOriginalPlaces(newPlaces: Place[]): void {
    this.originalPlaces = [...newPlaces];
  }

  // Public method for sync services to trigger storage save
  async saveStorage(): Promise<void> {
    await this.savePlacesStorage();
  }

  // Export user edits for backup/transfer
  exportUserEdits(): string {
    const exportData = {
      userEdits: this.userEdits,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    return JSON.stringify(exportData, null, 2);
  }

  // Import user edits from backup
  async importUserEdits(exportedData: string): Promise<{ success: boolean; message: string; editsImported: number }> {
    try {
      const importData = JSON.parse(exportedData);
      
      if (!importData.userEdits || !Array.isArray(importData.userEdits)) {
        return { success: false, message: 'Invalid export format', editsImported: 0 };
      }

      // Validate edit structure
      const validEdits: UserPlaceEdit[] = [];
      for (const edit of importData.userEdits) {
        if (edit.placeId && edit.editedFields && edit.editedAt && typeof edit.version === 'number') {
          validEdits.push(edit);
        }
      }

      // Merge with existing edits (imported edits take precedence for conflicts)
      const mergedEdits: UserPlaceEdit[] = [...this.userEdits];
      let importedCount = 0;

      for (const importedEdit of validEdits) {
        const existingIndex = mergedEdits.findIndex(edit => 
          edit.placeId === importedEdit.placeId || edit.originalPlaceId === importedEdit.placeId
        );

        if (existingIndex >= 0) {
          // Replace existing edit if imported one is newer
          if (importedEdit.version > mergedEdits[existingIndex].version) {
            mergedEdits[existingIndex] = importedEdit;
            importedCount++;
          }
        } else {
          // Add new edit
          mergedEdits.push(importedEdit);
          importedCount++;
        }
      }

      this.userEdits = mergedEdits;
      await this.savePlacesStorage();

      return { 
        success: true, 
        message: `Successfully imported ${importedCount} edits`, 
        editsImported: importedCount 
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Import failed: ${(error as Error).message}`, 
        editsImported: 0 
      };
    }
  }

  // Get edit statistics
  getEditStatistics(): { 
    totalEdits: number; 
    editedPlaces: number; 
    lastEditAt?: string 
  } {
    const lastEdit = this.userEdits.reduce((latest, edit) => {
      return !latest || edit.editedAt > latest.editedAt ? edit : latest;
    }, null as UserPlaceEdit | null);

    return {
      totalEdits: this.userEdits.length,
      editedPlaces: this.userEdits.length, // Each edit is for a different place
      lastEditAt: lastEdit?.editedAt
    };
  }

  updatePlace(placeId: string, updates: Partial<Pick<Place, 'name' | 'category' | 'description'>>): boolean {
    // Find original place
    const originalPlace = this.originalPlaces.find(place => place.id === placeId);
    if (!originalPlace) {
      // Check if this is an edited place ID (user might have renamed it)
      const editedPlace = this.getAllPlaces().find(place => place.id === placeId);
      if (!editedPlace) {
        return false;
      }
    }

    // Check if new name conflicts with existing places (if name is being updated)
    if (updates.name) {
      const conflictingPlace = this.getPlaceDetails(updates.name);
      if (conflictingPlace && conflictingPlace.id !== placeId) {
        return false; // Name conflict
      }
    }

    // Find existing edit for this place or create new one
    const originalPlaceForEdit = originalPlace || this.findOriginalPlaceByCurrentId(placeId);
    if (!originalPlaceForEdit) {
      return false;
    }

    let existingEditIndex = this.userEdits.findIndex(edit => 
      edit.placeId === originalPlaceForEdit.id || edit.originalPlaceId === originalPlaceForEdit.id
    );

    if (existingEditIndex === -1) {
      // Create new edit
      const newEdit: UserPlaceEdit = {
        placeId: originalPlaceForEdit.id,
        editedFields: { ...updates },
        editedAt: new Date().toISOString(),
        version: 1
      };
      this.userEdits.push(newEdit);
    } else {
      // Update existing edit
      this.userEdits[existingEditIndex] = {
        ...this.userEdits[existingEditIndex],
        editedFields: {
          ...this.userEdits[existingEditIndex].editedFields,
          ...updates
        },
        editedAt: new Date().toISOString(),
        version: this.userEdits[existingEditIndex].version + 1
      };
    }

    // Save to storage asynchronously
    this.savePlacesStorage().catch(error => {
      console.error('Failed to save places storage after updating:', error);
    });

    return true;
  }

  private findOriginalPlaceByCurrentId(currentId: string): Place | undefined {
    // Find original place by checking if any edit resulted in this current ID
    for (const edit of this.userEdits) {
      if (edit.editedFields.name && this.generatePlaceId(edit.editedFields.name) === currentId) {
        return this.originalPlaces.find(place => 
          place.id === edit.placeId || place.id === edit.originalPlaceId
        );
      }
    }
    return undefined;
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
    return this.mergeOriginalPlacesWithEdits();
  }

  private mergeOriginalPlacesWithEdits(): Place[] {
    const mergedPlaces: Place[] = [];
    
    for (const originalPlace of this.originalPlaces) {
      // Find user edits for this place
      const userEdit = this.userEdits.find(edit => 
        edit.placeId === originalPlace.id || edit.originalPlaceId === originalPlace.id
      );
      
      if (userEdit) {
        // Apply user edits to the original place
        const mergedPlace: Place = {
          ...originalPlace,
          ...userEdit.editedFields,
          // If user renamed the place, use the new ID
          id: userEdit.editedFields.name ? 
              this.generatePlaceId(userEdit.editedFields.name) : 
              originalPlace.id
        };
        mergedPlaces.push(mergedPlace);
      } else {
        // No edits, use original place as-is
        mergedPlaces.push({ ...originalPlace });
      }
    }
    
    return mergedPlaces;
  }

  private generatePlaceId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }
}