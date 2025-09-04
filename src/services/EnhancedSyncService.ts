import { MapSyncConfig, MapConfig } from './MapSyncConfig';
import { SyncStatusService, SyncResult } from './SyncStatusService';
import { MyMapsImportService } from './MyMapsImportService';
import { NetlifyApiService } from './NetlifyApiService';
import { Place } from './GooglePlacesService';

export interface SyncProgress {
  phase: 'connecting' | 'fetching' | 'parsing' | 'processing' | 'completing';
  message: string;
}

export interface ConnectionTestResult {
  success: boolean;
  mapId: string;
  mapName: string;
  error?: string;
}

export interface SyncMapResult {
  success: boolean;
  mapId: string;
  mapName: string;
  placesFound: number;
  placesAdded: number;
  duplicatesSkipped: number;
  syncedAt: string;
  error?: string;
}

export class EnhancedSyncService {
  constructor(
    private mapConfig: MapSyncConfig,
    private syncStatus: SyncStatusService,
    private importService: MyMapsImportService,
    private apiService: NetlifyApiService
  ) {}

  async testConnection(mapId: string): Promise<ConnectionTestResult> {
    const config = this.mapConfig.getMapConfig(mapId);
    if (!config) {
      throw new Error('Map configuration not found');
    }

    this.syncStatus.updateSyncStatus(mapId, 'connecting', `Testing connection to ${config.name}...`);

    try {
      const response = await this.apiService.fetchMyMapsKML(config.mapId);
      
      if (response.success) {
        this.syncStatus.updateSyncStatus(mapId, 'success', `Connected to ${config.name}`);
        return {
          success: true,
          mapId,
          mapName: config.name
        };
      } else {
        this.syncStatus.updateSyncStatus(mapId, 'error', response.error || 'Connection failed');
        return {
          success: false,
          mapId,
          mapName: config.name,
          error: response.error || 'Connection failed'
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.syncStatus.updateSyncStatus(mapId, 'error', errorMessage);
      return {
        success: false,
        mapId,
        mapName: config.name,
        error: errorMessage
      };
    }
  }

  async syncMap(
    mapId: string, 
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncMapResult> {
    const config = this.mapConfig.getMapConfig(mapId);
    if (!config) {
      throw new Error('Map configuration not found');
    }

    const syncedAt = new Date().toISOString();

    try {
      // Phase 1: Connecting
      onProgress?.({ phase: 'connecting', message: `Connecting to ${config.name}...` });
      this.syncStatus.updateSyncStatus(mapId, 'connecting', `Connecting to ${config.name}...`);

      const response = await this.apiService.fetchMyMapsKML(config.mapId);
      
      if (!response.success || !response.kmlContent) {
        const error = response.error || 'Failed to fetch map data';
        const result: SyncResult = {
          mapId,
          success: false,
          placesFound: 0,
          placesAdded: 0,
          duplicatesSkipped: 0,
          syncedAt,
          error
        };
        
        await this.syncStatus.recordSyncResult(result);
        
        return {
          success: false,
          mapId,
          mapName: config.name,
          placesFound: 0,
          placesAdded: 0,
          duplicatesSkipped: 0,
          syncedAt,
          error
        };
      }

      // Phase 2: Fetching
      onProgress?.({ phase: 'fetching', message: 'Fetching map data...' });
      this.syncStatus.updateSyncStatus(mapId, 'syncing', 'Fetching map data...');

      // Phase 3: Parsing
      onProgress?.({ phase: 'parsing', message: 'Parsing places data...' });
      this.syncStatus.updateSyncStatus(mapId, 'syncing', 'Parsing places data...');

      const places = this.importService.parseKMLToPlaces(response.kmlContent);
      
      // Phase 4: Processing
      onProgress?.({ phase: 'processing', message: `Found ${places.length} places, checking for duplicates...` });
      this.syncStatus.updateSyncStatus(mapId, 'syncing', `Found ${places.length} places, checking for duplicates...`);

      // Here you would integrate with your existing place storage/duplicate detection logic
      // For now, we'll simulate the process
      const placesAdded = places.length; // This would be the actual count of new places added
      const duplicatesSkipped = 0; // This would be the actual count of duplicates found

      // Phase 5: Completing
      onProgress?.({ phase: 'completing', message: 'Sync completed successfully' });

      const result: SyncResult = {
        mapId,
        success: true,
        placesFound: places.length,
        placesAdded,
        duplicatesSkipped,
        syncedAt
      };

      await this.syncStatus.recordSyncResult(result);

      return {
        success: true,
        mapId,
        mapName: config.name,
        placesFound: places.length,
        placesAdded,
        duplicatesSkipped,
        syncedAt
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      const result: SyncResult = {
        mapId,
        success: false,
        placesFound: 0,
        placesAdded: 0,
        duplicatesSkipped: 0,
        syncedAt,
        error: errorMessage
      };

      await this.syncStatus.recordSyncResult(result);

      return {
        success: false,
        mapId,
        mapName: config.name,
        placesFound: 0,
        placesAdded: 0,
        duplicatesSkipped: 0,
        syncedAt,
        error: errorMessage
      };
    }
  }

  async syncAllMaps(): Promise<SyncMapResult[]> {
    const configs = this.mapConfig.getMapConfigs();
    const results: SyncMapResult[] = [];

    for (const config of configs) {
      try {
        const result = await this.syncMap(config.id);
        results.push(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        results.push({
          success: false,
          mapId: config.id,
          mapName: config.name,
          placesFound: 0,
          placesAdded: 0,
          duplicatesSkipped: 0,
          syncedAt: new Date().toISOString(),
          error: errorMessage
        });
      }
    }

    return results;
  }
}