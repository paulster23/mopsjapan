import { StorageMonitorService } from '../../../src/services/StorageMonitorService';

// Mock localStorage for testing
const mockLocalStorage = {
  length: 3,
  key: jest.fn(),
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe('StorageMonitorService', () => {
  let service: StorageMonitorService;

  beforeEach(() => {
    service = new StorageMonitorService();
    jest.clearAllMocks();
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(service.formatBytes(0)).toBe('0 B');
      expect(service.formatBytes(1024)).toBe('1 KB');
      expect(service.formatBytes(1024 * 1024)).toBe('1 MB');
      expect(service.formatBytes(1536)).toBe('1.5 KB');
      expect(service.formatBytes(2621440)).toBe('2.5 MB');
    });
  });

  describe('getWarningLevel', () => {
    it('should return correct warning levels', () => {
      expect(service.getWarningLevel(50)).toBe('safe');
      expect(service.getWarningLevel(75)).toBe('warning');
      expect(service.getWarningLevel(95)).toBe('danger');
    });
  });

  describe('getWarningColor', () => {
    it('should return correct colors for warning levels', () => {
      expect(service.getWarningColor(50)).toBe('#4CAF50'); // Green
      expect(service.getWarningColor(75)).toBe('#FF9800'); // Orange
      expect(service.getWarningColor(95)).toBe('#F44336'); // Red
    });
  });

  describe('clearStorageItem', () => {
    it('should clear storage item successfully', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {});
      
      const result = service.clearStorageItem('test-key');
      
      expect(result).toBe(true);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key');
    });

    it('should handle storage errors gracefully', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const result = service.clearStorageItem('test-key');
      
      expect(result).toBe(false);
    });
  });

  describe('clearAppStorage', () => {
    it('should clear app-specific storage items', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {});
      
      const result = service.clearAppStorage();
      
      expect(result).toBe(true);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('mops_japan_itinerary');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('mops_japan_user_location');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('location_override');
    });
  });

  describe('getStorageQuota', () => {
    it('should calculate storage quota correctly', async () => {
      // Mock localStorage data
      mockLocalStorage.key.mockImplementation((index) => {
        const keys = ['mops_japan_itinerary', 'mops_japan_user_location', 'other_key'];
        return keys[index] || null;
      });
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        const data = {
          'mops_japan_itinerary': JSON.stringify({ large: 'data'.repeat(1000) }),
          'mops_japan_user_location': JSON.stringify({ lat: 35.6762, lng: 139.6503 }),
          'other_key': 'small value'
        };
        return data[key as keyof typeof data] || null;
      });

      const quota = await service.getStorageQuota();

      expect(quota.total).toBe(5 * 1024 * 1024); // 5MB
      expect(quota.used).toBeGreaterThan(0);
      expect(quota.usagePercentage).toBeGreaterThan(0);
      expect(quota.breakdown).toHaveLength(3);
      expect(quota.breakdown[0].key).toBeDefined();
      expect(quota.breakdown[0].sizeFormatted).toBeDefined();
    });
  });

  describe('exportStorageData', () => {
    it('should export all storage data as JSON', () => {
      mockLocalStorage.length = 2;
      mockLocalStorage.key.mockImplementation((index) => {
        return ['key1', 'key2'][index] || null;
      });
      mockLocalStorage.getItem.mockImplementation((key) => {
        return key === 'key1' ? 'value1' : 'value2';
      });

      const exportData = service.exportStorageData();
      const parsed = JSON.parse(exportData);

      expect(parsed).toEqual({
        key1: 'value1',
        key2: 'value2'
      });
    });
  });
});