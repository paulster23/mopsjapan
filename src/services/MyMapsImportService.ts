import { Place, PlaceCategory } from './GooglePlacesService';

export class MyMapsImportService {
  parseKMLToPlaces(kmlContent: string): Place[] {
    if (!kmlContent || !kmlContent.includes('<kml')) {
      throw new Error('Invalid KML format');
    }

    const places: Place[] = [];
    
    // Simple XML parsing - extract Placemarks
    const placemarkRegex = /<Placemark>(.*?)<\/Placemark>/gs;
    let match;
    
    while ((match = placemarkRegex.exec(kmlContent)) !== null) {
      const placemarkContent = match[1];
      
      // Extract name
      const nameMatch = /<name><!\[CDATA\[(.*?)\]\]><\/name>|<name>(.*?)<\/name>/s.exec(placemarkContent);
      if (!nameMatch) continue;
      const name = nameMatch[1] || nameMatch[2];
      
      // Extract description
      const descMatch = /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/s.exec(placemarkContent);
      const description = descMatch ? (descMatch[1] || descMatch[2]) : '';
      
      // Extract coordinates
      const coordsMatch = /<coordinates>(.*?)<\/coordinates>/s.exec(placemarkContent);
      if (!coordsMatch) continue;
      
      const coordsStr = coordsMatch[1].trim();
      const [longitude, latitude] = coordsStr.split(',').map(Number);
      
      if (isNaN(latitude) || isNaN(longitude)) continue;
      
      const place: Place = {
        id: this.generatePlaceId(name),
        name,
        category: this.detectPlaceCategory(name, description),
        city: this.detectCityFromCoordinates(latitude, longitude),
        coordinates: { latitude, longitude },
        description: description || undefined
      };
      
      places.push(place);
    }
    
    return places;
  }

  detectPlaceCategory(name: string, description: string): PlaceCategory {
    const text = `${name} ${description}`.toLowerCase();
    
    // Transport keywords
    if (this.containsAny(text, ['station', 'airport', 'train', 'subway', 'bus', 'terminal'])) {
      return 'transport';
    }
    
    // Accommodation keywords
    if (this.containsAny(text, ['hotel', 'hostel', 'inn', 'ryokan', 'accommodation', 'lodge', 'guesthouse'])) {
      return 'accommodation';
    }
    
    // Restaurant keywords (check food-specific "shops" first)
    if (this.containsAny(text, ['restaurant', 'ramen', 'sushi', 'cafe', 'coffee', 'bar', 'food', 'dining', 'kitchen', 'bistro', 'bakery']) ||
        this.containsAny(text, ['ramen shop', 'sushi shop', 'coffee shop', 'food shop'])) {
      return 'restaurant';
    }
    
    // Shopping keywords
    if (this.containsAny(text, ['store', 'market', 'mall', 'department', 'convenience', 'souvenir', 'shopping']) || 
        (text.includes('shop') && !this.containsAny(text, ['ramen', 'sushi', 'coffee', 'food', 'workshop']))) {
      return 'shopping';
    }
    
    // Default to entertainment for temples, museums, parks, etc.
    return 'entertainment';
  }

  extractMapIdFromUrl(url: string): string {
    const midMatch = url.match(/[?&]mid=([^&]+)/);
    if (!midMatch) {
      throw new Error('Invalid My Maps URL - no map ID found');
    }
    return midMatch[1];
  }

  detectCityFromCoordinates(latitude: number, longitude: number): string {
    // Simple city detection based on coordinate ranges
    // Tokyo area: roughly 35.4-35.9, 139.3-140.0
    if (latitude >= 35.4 && latitude <= 35.9 && longitude >= 139.3 && longitude <= 140.0) {
      return 'Tokyo';
    }
    
    // Osaka area: roughly 34.4-34.9, 135.2-135.8  
    if (latitude >= 34.4 && latitude <= 34.9 && longitude >= 135.2 && longitude <= 135.8) {
      return 'Osaka';
    }
    
    // Kyoto area: roughly 34.8-35.2, 135.5-136.0
    if (latitude >= 34.8 && latitude <= 35.2 && longitude >= 135.5 && longitude <= 136.0) {
      return 'Kyoto';
    }
    
    // Default to Tokyo for other Japan coordinates
    return 'Tokyo';
  }

  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  private generatePlaceId(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }
}