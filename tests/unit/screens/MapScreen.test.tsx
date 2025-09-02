// Mock AsyncStorage before imports
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: mockRemoveItem,
    getAllKeys: jest.fn(),
    clear: jest.fn()
  }
}));

// Simple integration test for offline functionality
import { MapScreenService } from '../../../src/screens/services/MapScreenService';
import { LocationService } from '../../../src/services/LocationService';

describe('MapScreen Offline Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should integrate offline map service with MapScreen service', async () => {
    const locationService = new LocationService();
    const service = new MapScreenService(locationService);
    
    const userLocation = { latitude: 35.6812, longitude: 139.7671 };
    
    const cachedMapData = {
      stations: [
        { 
          id: 'tokyo', 
          name: 'Tokyo Station', 
          latitude: 35.6812, 
          longitude: 139.7671, 
          lines: ['JR Yamanote'] 
        }
      ],
      lines: [],
      version: '1.0.0',
      lastUpdated: new Date().toISOString()
    };

    mockGetItem.mockResolvedValue(JSON.stringify(cachedMapData));

    // Test that the MapScreen service can use offline functionality
    const result = await service.findNearbyStationsWithOffline(userLocation, 1.0);

    expect(result.success).toBe(true);
    expect(result.fromCache).toBe(true);
    expect(result.stations).toHaveLength(1);
    expect(result.stations?.[0].name).toBe('Tokyo Station');
    expect(result.stations?.[0].status).toBe('Unknown'); // Offline mode default
  });
});