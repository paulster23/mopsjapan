import { Place, PlaceCategory } from './GooglePlacesService';

interface GoogleListPlace {
  name: string;
  coordinates?: [number, number];
  description?: string;
}

export class MapsListImportService {
  extractListIdFromUrl(url: string): string {
    // Look for 1s parameter in the URL data parameter
    const match = url.match(/[!&]1s([A-Za-z0-9_-]+)/);
    if (!match) {
      throw new Error('Invalid Google Maps List URL - no list ID found');
    }
    return match[1];
  }

  parseGoogleListJson(jsonResponse: string): Place[] {
    try {
      // Remove the first 4 characters (security prefix: )]}'<newline>)
      const cleanJson = jsonResponse.substring(4);
      const parsed = JSON.parse(cleanJson);
      
      // Navigate to the nested array structure: data[1][9][0]
      const placesData = parsed?.data?.[1]?.[9]?.[0];
      
      if (!placesData || !Array.isArray(placesData)) {
        return [];
      }

      return placesData
        .filter((placeArray: any[]) => {
          // Must have name and coordinates
          return placeArray?.[0] && placeArray?.[3] && Array.isArray(placeArray[3]);
        })
        .map((placeArray: any[]) => {
          const name = placeArray[0];
          const coords = placeArray[3]; // [longitude, latitude]
          const description = placeArray[5] || '';
          
          const longitude = coords[0];
          const latitude = coords[1];
          
          return {
            id: this.generatePlaceId(name),
            name,
            category: this.categorizePlace(name, description),
            city: this.detectCityFromCoordinates(latitude, longitude),
            coordinates: { latitude, longitude },
            description
          } as Place;
        });
    } catch (error) {
      throw new Error('Invalid response format from Google Maps');
    }
  }

  detectCityFromCoordinates(latitude: number, longitude: number): string {
    // Tokyo area: roughly 35.5-35.8 lat, 139.3-139.9 lng
    if (latitude >= 35.5 && latitude <= 35.8 && longitude >= 139.3 && longitude <= 139.9) {
      return 'Tokyo';
    }
    
    // Osaka area: roughly 34.5-34.8 lat, 135.3-135.7 lng
    if (latitude >= 34.5 && latitude <= 34.8 && longitude >= 135.3 && longitude <= 135.7) {
      return 'Osaka';
    }
    
    // Kyoto area: roughly 34.9-35.1 lat, 135.6-135.9 lng
    if (latitude >= 34.9 && latitude <= 35.1 && longitude >= 135.6 && longitude <= 135.9) {
      return 'Kyoto';
    }
    
    return 'Unknown';
  }

  categorizePlace(name: string, description: string): PlaceCategory {
    const text = `${name} ${description}`.toLowerCase();
    
    // Check for accommodation keywords first (most specific)
    if (text.includes('hotel') || text.includes('inn') || text.includes('hostel') || 
        text.includes('ryokan') || text.includes('accommodation') || text.includes('lodge')) {
      return 'accommodation';
    }
    
    // Check for entertainment keywords
    if (text.includes('museum') || text.includes('temple') || text.includes('shrine') || 
        text.includes('park') || text.includes('garden') || text.includes('theater') ||
        text.includes('entertainment') || text.includes('attraction') || text.includes('zoo') ||
        text.includes('aquarium') || text.includes('gallery')) {
      return 'entertainment';
    }
    
    // Check for transport keywords
    if (text.includes('station') || text.includes('airport') || text.includes('terminal') ||
        text.includes('train') || text.includes('subway') || text.includes('bus') ||
        text.includes('transport')) {
      return 'transport';
    }
    
    // Check for restaurant keywords (before shopping to catch food shops correctly)
    if (text.includes('restaurant') || text.includes('cafe') || text.includes('bar') ||
        text.includes('sushi') || text.includes('ramen') || text.includes('food') ||
        text.includes('dining') || text.includes('kitchen') || text.includes('grill') ||
        text.includes('bistro') || text.includes('eatery') || text.includes('takoyaki')) {
      return 'restaurant';
    }
    
    // Check for shopping keywords (after restaurant to avoid food shops being miscategorized)
    if (text.includes('shop') || text.includes('store') || text.includes('mall') || 
        text.includes('market') || text.includes('shopping') || text.includes('boutique') ||
        text.includes('outlet')) {
      return 'shopping';
    }
    
    // Default to restaurant for unrecognized places
    return 'restaurant';
  }

  private generatePlaceId(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}