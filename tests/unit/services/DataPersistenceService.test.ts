import { DataPersistenceService } from '../../../src/services/DataPersistenceService';
import { ItineraryParser } from '../../../src/services/ItineraryParser';

// Mock storage for testing
const mockStorage = new Map<string, string>();

const mockAsyncStorage = {
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage.get(key) || null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage.set(key, value);
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    mockStorage.delete(key);
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    mockStorage.clear();
    return Promise.resolve();
  })
};

describe('DataPersistenceService', () => {
  beforeEach(() => {
    mockStorage.clear();
    jest.clearAllMocks();
  });

  describe('saveItinerary', () => {
    it('should save itinerary data to storage', async () => {
      const persistenceService = new DataPersistenceService(mockAsyncStorage);
      const parser = new ItineraryParser();
      
      const scheduleText = `9/9/2025
- Arrive air HDN at 2:20pm local time
- Subway to apartment: COCO Nakameguro 202`;
      
      const itinerary = parser.parseScheduleText(scheduleText);
      
      await persistenceService.saveItinerary(itinerary);
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'mops_japan_itinerary',
        JSON.stringify(itinerary)
      );
    });

    it('should handle save errors gracefully', async () => {
      const persistenceService = new DataPersistenceService(mockAsyncStorage);
      mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage full'));
      
      const itinerary = [{ date: '2025-09-09', entries: [] }];
      
      const result = await persistenceService.saveItinerary(itinerary);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage full');
    });
  });

  describe('loadItinerary', () => {
    it('should load itinerary data from storage', async () => {
      const persistenceService = new DataPersistenceService(mockAsyncStorage);
      
      const testItinerary = [
        {
          date: '2025-09-09',
          entries: [
            {
              time: '2:20pm',
              type: 'arrival',
              location: 'HDN',
              description: 'Arrive air HDN at 2:20pm local time'
            }
          ]
        }
      ];
      
      mockStorage.set('mops_japan_itinerary', JSON.stringify(testItinerary));
      
      const result = await persistenceService.loadItinerary();
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(testItinerary);
    });

    it('should return null when no itinerary exists', async () => {
      const persistenceService = new DataPersistenceService(mockAsyncStorage);
      
      const result = await persistenceService.loadItinerary();
      
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle load errors gracefully', async () => {
      const persistenceService = new DataPersistenceService(mockAsyncStorage);
      mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage corrupted'));
      
      const result = await persistenceService.loadItinerary();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage corrupted');
    });

    it('should handle corrupted JSON data', async () => {
      const persistenceService = new DataPersistenceService(mockAsyncStorage);
      mockStorage.set('mops_japan_itinerary', 'invalid json {');
      
      const result = await persistenceService.loadItinerary();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse itinerary data');
    });
  });

  describe('clearItinerary', () => {
    it('should remove itinerary data from storage', async () => {
      const persistenceService = new DataPersistenceService(mockAsyncStorage);
      
      mockStorage.set('mops_japan_itinerary', JSON.stringify([]));
      
      const result = await persistenceService.clearItinerary();
      
      expect(result.success).toBe(true);
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('mops_japan_itinerary');
    });
  });

  describe('saveUserLocation', () => {
    it('should save current user location', async () => {
      const persistenceService = new DataPersistenceService(mockAsyncStorage);
      
      const location = { latitude: 35.6762, longitude: 139.6503 };
      
      await persistenceService.saveUserLocation(location);
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'mops_japan_user_location',
        JSON.stringify(location)
      );
    });
  });

  describe('loadUserLocation', () => {
    it('should load user location from storage', async () => {
      const persistenceService = new DataPersistenceService(mockAsyncStorage);
      
      const testLocation = { latitude: 35.6762, longitude: 139.6503 };
      mockStorage.set('mops_japan_user_location', JSON.stringify(testLocation));
      
      const result = await persistenceService.loadUserLocation();
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(testLocation);
    });

    it('should return null when no location exists', async () => {
      const persistenceService = new DataPersistenceService(mockAsyncStorage);
      
      const result = await persistenceService.loadUserLocation();
      
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });
});