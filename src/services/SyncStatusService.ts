import AsyncStorage from '@react-native-async-storage/async-storage';

export type SyncStatusType = 'idle' | 'connecting' | 'syncing' | 'success' | 'error';

export interface SyncStatus {
  mapId: string;
  status: SyncStatusType;
  message: string;
  lastSyncAt?: string;
  placesFound: number;
  placesAdded: number;
  duplicatesSkipped: number;
}

export interface SyncResult {
  mapId: string;
  success: boolean;
  placesFound: number;
  placesAdded: number;
  duplicatesSkipped: number;
  syncedAt: string;
  error?: string;
}

export class SyncStatusService {
  private syncStatuses: Map<string, SyncStatus> = new Map();

  getSyncStatus(mapId: string): SyncStatus {
    return this.syncStatuses.get(mapId) || {
      mapId,
      status: 'idle',
      message: '',
      lastSyncAt: undefined,
      placesFound: 0,
      placesAdded: 0,
      duplicatesSkipped: 0
    };
  }

  updateSyncStatus(mapId: string, status: SyncStatusType, message: string): void {
    const currentStatus = this.getSyncStatus(mapId);
    const updatedStatus: SyncStatus = {
      ...currentStatus,
      status,
      message
    };
    this.syncStatuses.set(mapId, updatedStatus);
  }

  async recordSyncResult(result: SyncResult): Promise<void> {
    // Update in-memory status
    const status: SyncStatus = {
      mapId: result.mapId,
      status: result.success ? 'success' : 'error',
      message: result.success 
        ? `Added ${result.placesAdded} new places, ${result.duplicatesSkipped} duplicates skipped`
        : result.error || 'Sync failed',
      lastSyncAt: result.syncedAt,
      placesFound: result.placesFound,
      placesAdded: result.placesAdded,
      duplicatesSkipped: result.duplicatesSkipped
    };
    
    this.syncStatuses.set(result.mapId, status);

    // Save to persistent storage
    await this.saveSyncHistory(result);
  }

  private async saveSyncHistory(result: SyncResult): Promise<void> {
    try {
      const key = `sync_history_${result.mapId}`;
      const existingHistory = await this.getSyncHistory(result.mapId);
      const newHistory = [...existingHistory, result];
      
      // Keep only last 50 sync records per map
      const trimmedHistory = newHistory.slice(-50);
      
      await AsyncStorage.setItem(key, JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error('Failed to save sync history:', error);
    }
  }

  async getSyncHistory(mapId: string): Promise<SyncResult[]> {
    try {
      const key = `sync_history_${mapId}`;
      const historyJson = await AsyncStorage.getItem(key);
      
      if (!historyJson) {
        return [];
      }
      
      return JSON.parse(historyJson);
    } catch (error) {
      console.error('Failed to load sync history:', error);
      return [];
    }
  }

  async getLastSyncTime(mapId: string): Promise<string | undefined> {
    const history = await this.getSyncHistory(mapId);
    if (history.length === 0) {
      return undefined;
    }
    
    // Return the most recent sync time
    return history[history.length - 1].syncedAt;
  }

  async clearSyncHistory(mapId: string): Promise<void> {
    try {
      const key = `sync_history_${mapId}`;
      await AsyncStorage.removeItem(key);
      
      // Also reset in-memory status
      this.syncStatuses.delete(mapId);
    } catch (error) {
      console.error('Failed to clear sync history:', error);
    }
  }

  getAllMapStatuses(): Record<string, SyncStatus> {
    const statuses: Record<string, SyncStatus> = {};
    
    for (const [mapId, status] of this.syncStatuses.entries()) {
      statuses[mapId] = status;
    }
    
    return statuses;
  }
}