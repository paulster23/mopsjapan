import { SyncStatusService, SyncStatus, SyncResult } from '../../../src/services/SyncStatusService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');

describe('SyncStatusService', () => {
  let service: SyncStatusService;

  beforeEach(() => {
    service = new SyncStatusService();
    jest.clearAllMocks();
  });

  describe('getSyncStatus', () => {
    it('should return idle status by default', () => {
      const status = service.getSyncStatus('pauls-map');
      
      expect(status).toEqual({
        mapId: 'pauls-map',
        status: 'idle',
        message: '',
        lastSyncAt: undefined,
        placesFound: 0,
        placesAdded: 0,
        duplicatesSkipped: 0
      });
    });

    it('should return current status for map being synced', () => {
      service.updateSyncStatus('michelles-map', 'connecting', 'Connecting to Michelle\'s Map...');
      
      const status = service.getSyncStatus('michelles-map');
      
      expect(status.status).toBe('connecting');
      expect(status.message).toBe('Connecting to Michelle\'s Map...');
    });
  });

  describe('updateSyncStatus', () => {
    it('should update sync status for specific map', () => {
      service.updateSyncStatus('pauls-map', 'syncing', 'Found 10 places');
      
      const status = service.getSyncStatus('pauls-map');
      
      expect(status.status).toBe('syncing');
      expect(status.message).toBe('Found 10 places');
    });

    it('should not affect other maps when updating one', () => {
      service.updateSyncStatus('pauls-map', 'syncing', 'Syncing Paul\'s map');
      
      const paulStatus = service.getSyncStatus('pauls-map');
      const michelleStatus = service.getSyncStatus('michelles-map');
      
      expect(paulStatus.status).toBe('syncing');
      expect(michelleStatus.status).toBe('idle');
    });
  });

  describe('recordSyncResult', () => {
    it('should record successful sync result', async () => {
      const result: SyncResult = {
        mapId: 'pauls-map',
        success: true,
        placesFound: 15,
        placesAdded: 5,
        duplicatesSkipped: 2,
        syncedAt: '2025-01-01T12:00:00Z'
      };

      await service.recordSyncResult(result);
      
      const status = service.getSyncStatus('pauls-map');
      
      expect(status.status).toBe('success');
      expect(status.lastSyncAt).toBe('2025-01-01T12:00:00Z');
      expect(status.placesFound).toBe(15);
      expect(status.placesAdded).toBe(5);
      expect(status.duplicatesSkipped).toBe(2);
      expect(status.message).toBe('Added 5 new places, 2 duplicates skipped');
    });

    it('should record failed sync result', async () => {
      const result: SyncResult = {
        mapId: 'michelles-map',
        success: false,
        placesFound: 0,
        placesAdded: 0,
        duplicatesSkipped: 0,
        syncedAt: '2025-01-01T12:00:00Z',
        error: 'Connection failed'
      };

      await service.recordSyncResult(result);
      
      const status = service.getSyncStatus('michelles-map');
      
      expect(status.status).toBe('error');
      expect(status.message).toBe('Connection failed');
      expect(status.lastSyncAt).toBe('2025-01-01T12:00:00Z');
    });

    it('should save sync result to AsyncStorage', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      
      const result: SyncResult = {
        mapId: 'pauls-map',
        success: true,
        placesFound: 10,
        placesAdded: 3,
        duplicatesSkipped: 1,
        syncedAt: '2025-01-01T12:00:00Z'
      };

      await service.recordSyncResult(result);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'sync_history_pauls-map',
        expect.stringContaining('"mapId":"pauls-map"')
      );
    });
  });

  describe('getSyncHistory', () => {
    it('should return empty array when no history exists', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      
      const history = await service.getSyncHistory('pauls-map');
      
      expect(history).toEqual([]);
    });

    it('should return parsed sync history from storage', async () => {
      const mockHistory = [
        {
          mapId: 'pauls-map',
          success: true,
          placesFound: 10,
          placesAdded: 3,
          duplicatesSkipped: 1,
          syncedAt: '2025-01-01T12:00:00Z'
        }
      ];
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockHistory));
      
      const history = await service.getSyncHistory('pauls-map');
      
      expect(history).toEqual(mockHistory);
    });

    it('should handle corrupted storage data', async () => {
      AsyncStorage.getItem.mockResolvedValue('invalid json');
      
      const history = await service.getSyncHistory('pauls-map');
      
      expect(history).toEqual([]);
    });
  });

  describe('getLastSyncTime', () => {
    it('should return undefined when no sync history exists', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      
      const lastSync = await service.getLastSyncTime('pauls-map');
      
      expect(lastSync).toBeUndefined();
    });

    it('should return most recent sync time', async () => {
      const mockHistory = [
        { syncedAt: '2025-01-01T10:00:00Z', mapId: 'pauls-map', success: true, placesFound: 5, placesAdded: 2, duplicatesSkipped: 0 },
        { syncedAt: '2025-01-01T12:00:00Z', mapId: 'pauls-map', success: true, placesFound: 8, placesAdded: 3, duplicatesSkipped: 1 }
      ];
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockHistory));
      
      const lastSync = await service.getLastSyncTime('pauls-map');
      
      expect(lastSync).toBe('2025-01-01T12:00:00Z');
    });
  });

  describe('clearSyncHistory', () => {
    it('should clear sync history for specific map', async () => {
      await service.clearSyncHistory('pauls-map');
      
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('sync_history_pauls-map');
    });
  });

  describe('getAllMapStatuses', () => {
    it('should return status for all tracked maps', () => {
      service.updateSyncStatus('pauls-map', 'syncing', 'Syncing...');
      service.updateSyncStatus('michelles-map', 'success', 'Completed');
      
      const allStatuses = service.getAllMapStatuses();
      
      expect(allStatuses).toHaveProperty('pauls-map');
      expect(allStatuses).toHaveProperty('michelles-map');
      expect(allStatuses['pauls-map'].status).toBe('syncing');
      expect(allStatuses['michelles-map'].status).toBe('success');
    });
  });
});