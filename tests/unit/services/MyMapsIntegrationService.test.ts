import { MyMapsImportService } from '../../../src/services/MyMapsImportService';
import { NetlifyApiService } from '../../../src/services/NetlifyApiService';

// Integration service that combines both services
class MyMapsIntegrationService {
  constructor(
    private importService: MyMapsImportService,
    private apiService: NetlifyApiService
  ) {}

  async importFromMyMapsUrl(url: string) {
    // Extract map ID from URL
    const mapId = this.importService.extractMapIdFromUrl(url);
    
    // Fetch KML from Netlify function
    const response = await this.apiService.fetchMyMapsKML(mapId);
    
    if (!response.success || !response.kmlContent) {
      throw new Error(response.error || 'Failed to fetch KML data');
    }
    
    // Parse KML to places
    const places = this.importService.parseKMLToPlaces(response.kmlContent);
    
    return {
      places,
      mapId: response.mapId,
      fetchedAt: response.fetchedAt
    };
  }
}

describe('MyMapsIntegrationService', () => {
  let integrationService: MyMapsIntegrationService;
  let mockApiService: jest.Mocked<NetlifyApiService>;
  let importService: MyMapsImportService;

  beforeEach(() => {
    importService = new MyMapsImportService();
    mockApiService = new NetlifyApiService() as jest.Mocked<NetlifyApiService>;
    mockApiService.fetchMyMapsKML = jest.fn();
    mockApiService.setBaseUrl = jest.fn();
    
    integrationService = new MyMapsIntegrationService(importService, mockApiService);
  });

  describe('importFromMyMapsUrl', () => {
    it('should successfully import places from My Maps URL', async () => {
      const testUrl = 'https://www.google.com/maps/d/viewer?mid=test123&ll=35.6812,139.7671&z=10';
      const mockKML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Test Restaurant</name>
      <description>Great sushi place</description>
      <Point>
        <coordinates>139.7671,35.6812,0</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>`;

      mockApiService.fetchMyMapsKML.mockResolvedValue({
        success: true,
        kmlContent: mockKML,
        mapId: 'test123',
        fetchedAt: '2025-01-01T12:00:00Z'
      });

      const result = await integrationService.importFromMyMapsUrl(testUrl);

      expect(mockApiService.fetchMyMapsKML).toHaveBeenCalledWith('test123');
      expect(result.places).toHaveLength(1);
      expect(result.places[0]).toEqual({
        id: 'test-restaurant',
        name: 'Test Restaurant',
        category: 'restaurant',
        city: 'Tokyo',
        coordinates: { latitude: 35.6812, longitude: 139.7671 },
        description: 'Great sushi place'
      });
      expect(result.mapId).toBe('test123');
      expect(result.fetchedAt).toBe('2025-01-01T12:00:00Z');
    });

    it('should handle API errors gracefully', async () => {
      const testUrl = 'https://www.google.com/maps/d/viewer?mid=test123';
      
      mockApiService.fetchMyMapsKML.mockResolvedValue({
        success: false,
        error: 'Map not found',
        details: 'The map may be private or deleted'
      });

      await expect(integrationService.importFromMyMapsUrl(testUrl))
        .rejects.toThrow('Map not found');
    });

    it('should handle invalid URLs', async () => {
      const invalidUrl = 'https://www.google.com/maps/search/tokyo';
      
      await expect(integrationService.importFromMyMapsUrl(invalidUrl))
        .rejects.toThrow('Invalid My Maps URL - no map ID found');
    });
  });
});