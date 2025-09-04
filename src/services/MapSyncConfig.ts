export interface MapConfig {
  id: string;
  name: string;
  owner: string;
  mapId: string;
  lastSyncAt?: string;
}

export interface SyncHistory {
  mapId: string;
  syncedAt: string;
  placesFound: number;
  placesAdded: number;
  duplicatesSkipped: number;
  success: boolean;
  error?: string;
}

export class MapSyncConfig {
  private mapConfigs: MapConfig[] = [
    {
      id: 'pauls-map',
      name: "Paul's Map",
      owner: 'Paul',
      mapId: '1o8S4w05Z4gPt7s6mfCoZXT46mOJEtV4',
    },
    {
      id: 'michelles-map',
      name: "Michelle's Map",
      owner: 'Michelle',
      mapId: '1LQROJade9LoCh-Y1kyXgpKtT-CCRZaU',
    }
  ];

  getMapConfigs(): MapConfig[] {
    return [...this.mapConfigs];
  }

  getMapConfig(id: string): MapConfig | undefined {
    return this.mapConfigs.find(config => config.id === id);
  }

  updateLastSyncTime(mapId: string, syncTime: string): void {
    const config = this.mapConfigs.find(c => c.id === mapId);
    if (config) {
      config.lastSyncAt = syncTime;
    }
  }

  getMapIdFromUrl(url: string): string {
    // Extract map ID from My Maps URL - matches both edit and viewer URLs
    const match = url.match(/[?&]mid=([A-Za-z0-9_-]+)/);
    if (!match) {
      throw new Error('Invalid My Maps URL - no map ID found');
    }
    return match[1];
  }

  findMapByMapId(mapId: string): MapConfig | undefined {
    return this.mapConfigs.find(config => config.mapId === mapId);
  }

  getDisplayName(mapId: string): string {
    const config = this.getMapConfig(mapId);
    return config?.name || 'Unknown Map';
  }
}