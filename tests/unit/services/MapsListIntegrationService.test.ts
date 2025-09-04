import { MapsListImportService } from '../../../src/services/MapsListImportService';
import { MapsListApiService } from '../../../src/services/MapsListApiService';

// Integration service that combines both services
class MapsListIntegrationService {
  constructor(
    private importService: MapsListImportService,
    private apiService: MapsListApiService
  ) {}

  async importFromMapsListUrl(url: string) {
    // Extract list ID from URL
    const listId = this.importService.extractListIdFromUrl(url);
    
    // Fetch list data from Netlify function
    const response = await this.apiService.fetchMapsList(listId);
    
    if (!response.success || !response.listData) {
      throw new Error(response.error || 'Failed to fetch Maps List data');
    }
    
    // Parse list data to places
    const places = this.importService.parseGoogleListJson(response.listData);
    
    return {
      places,
      listId: response.listId,
      fetchedAt: response.fetchedAt
    };
  }
}

describe('MapsListIntegrationService', () => {
  let integrationService: MapsListIntegrationService;
  let mockApiService: jest.Mocked<MapsListApiService>;
  let importService: MapsListImportService;

  beforeEach(() => {
    importService = new MapsListImportService();
    mockApiService = new MapsListApiService() as jest.Mocked<MapsListApiService>;
    mockApiService.fetchMapsList = jest.fn();
    mockApiService.setBaseUrl = jest.fn();
    
    integrationService = new MapsListIntegrationService(importService, mockApiService);
  });

  describe('importFromMapsListUrl', () => {
    it('should successfully import places from Maps List URL', async () => {
      const testUrl = 'https://www.google.com/maps/@35.7023392,136.1781809,986081m/data=!3m2!1e3!4b1!4m2!6m1!1s1LQROJade9LoCh-Y1kyXgpKtT-CCRZaU?entry=ttu&g_ep=EgoyMDI1MDgzMC4wIKXMDSoASAFQAw%3D%3D';
      const mockListData = `)]}'
{
  "data": [
    null,
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      [
        [
          [
            "Tokyo Restaurant",
            null,
            null,
            [139.7671, 35.6812],
            null,
            "Great restaurant in Tokyo"
          ]
        ]
      ]
    ]
  ]
}`;

      mockApiService.fetchMapsList.mockResolvedValue({
        success: true,
        listData: mockListData,
        listId: '1LQROJade9LoCh-Y1kyXgpKtT-CCRZaU',
        fetchedAt: '2025-01-01T12:00:00Z'
      });

      const result = await integrationService.importFromMapsListUrl(testUrl);

      expect(mockApiService.fetchMapsList).toHaveBeenCalledWith('1LQROJade9LoCh-Y1kyXgpKtT-CCRZaU');
      expect(result.places).toHaveLength(1);
      expect(result.places[0]).toEqual({
        id: 'tokyo-restaurant',
        name: 'Tokyo Restaurant',
        category: 'restaurant',
        city: 'Tokyo',
        coordinates: { latitude: 35.6812, longitude: 139.7671 },
        description: 'Great restaurant in Tokyo'
      });
      expect(result.listId).toBe('1LQROJade9LoCh-Y1kyXgpKtT-CCRZaU');
      expect(result.fetchedAt).toBe('2025-01-01T12:00:00Z');
    });

    it('should handle API errors gracefully', async () => {
      const testUrl = 'https://www.google.com/maps/@35.7023392,136.1781809,986081m/data=!3m2!1e3!4b1!4m2!6m1!1s1LQROJade9LoCh-Y1kyXgpKtT-CCRZaU';
      
      mockApiService.fetchMapsList.mockResolvedValue({
        success: false,
        error: 'List not found',
        details: 'The list may be private or require authentication'
      });

      await expect(integrationService.importFromMapsListUrl(testUrl))
        .rejects.toThrow('List not found');
    });

    it('should handle invalid URLs', async () => {
      const invalidUrl = 'https://www.google.com/maps/search/tokyo';
      
      await expect(integrationService.importFromMapsListUrl(invalidUrl))
        .rejects.toThrow('Invalid Google Maps List URL - no list ID found');
    });

    it('should handle empty list data', async () => {
      const testUrl = 'https://www.google.com/maps/@35.7023392,136.1781809,986081m/data=!3m2!1e3!4b1!4m2!6m1!1sEMPTY_LIST_123';
      const emptyListData = `)]}'
{
  "data": [
    null,
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      []
    ]
  ]
}`;

      mockApiService.fetchMapsList.mockResolvedValue({
        success: true,
        listData: emptyListData,
        listId: 'EMPTY_LIST_123',
        fetchedAt: '2025-01-01T12:00:00Z'
      });

      const result = await integrationService.importFromMapsListUrl(testUrl);

      expect(result.places).toHaveLength(0);
      expect(result.listId).toBe('EMPTY_LIST_123');
    });
  });
});