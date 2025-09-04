import { MapSyncConfig, MapConfig, SyncHistory } from '../../../src/services/MapSyncConfig';

describe('MapSyncConfig', () => {
  let config: MapSyncConfig;

  beforeEach(() => {
    config = new MapSyncConfig();
  });

  describe('getMapConfigs', () => {
    it('should return both Paul and Michelle map configurations', () => {
      const configs = config.getMapConfigs();
      
      expect(configs).toHaveLength(2);
      expect(configs[0]).toEqual({
        id: 'pauls-map',
        name: "Paul's Map",
        owner: 'Paul',
        mapId: '1o8S4w05Z4gPt7s6mfCoZXT46mOJEtV4',
        lastSyncAt: undefined
      });
      expect(configs[1]).toEqual({
        id: 'michelles-map',
        name: "Michelle's Map", 
        owner: 'Michelle',
        mapId: '1LQROJade9LoCh-Y1kyXgpKtT-CCRZaU',
        lastSyncAt: undefined
      });
    });
  });

  describe('getMapConfig', () => {
    it('should return Paul map config by ID', () => {
      const paulConfig = config.getMapConfig('pauls-map');
      
      expect(paulConfig).toEqual({
        id: 'pauls-map',
        name: "Paul's Map",
        owner: 'Paul',
        mapId: '1o8S4w05Z4gPt7s6mfCoZXT46mOJEtV4',
        lastSyncAt: undefined
      });
    });

    it('should return Michelle map config by ID', () => {
      const michelleConfig = config.getMapConfig('michelles-map');
      
      expect(michelleConfig).toEqual({
        id: 'michelles-map',
        name: "Michelle's Map",
        owner: 'Michelle', 
        mapId: '1LQROJade9LoCh-Y1kyXgpKtT-CCRZaU',
        lastSyncAt: undefined
      });
    });

    it('should return undefined for unknown map ID', () => {
      const unknownConfig = config.getMapConfig('unknown-map');
      
      expect(unknownConfig).toBeUndefined();
    });
  });

  describe('updateLastSyncTime', () => {
    it('should update last sync time for Paul map', () => {
      const testDate = '2025-01-01T12:00:00Z';
      
      config.updateLastSyncTime('pauls-map', testDate);
      const paulConfig = config.getMapConfig('pauls-map');
      
      expect(paulConfig?.lastSyncAt).toBe(testDate);
    });

    it('should update last sync time for Michelle map', () => {
      const testDate = '2025-01-01T13:00:00Z';
      
      config.updateLastSyncTime('michelles-map', testDate);
      const michelleConfig = config.getMapConfig('michelles-map');
      
      expect(michelleConfig?.lastSyncAt).toBe(testDate);
    });

    it('should not affect other maps when updating one', () => {
      const testDate = '2025-01-01T12:00:00Z';
      
      config.updateLastSyncTime('pauls-map', testDate);
      
      const paulConfig = config.getMapConfig('pauls-map');
      const michelleConfig = config.getMapConfig('michelles-map');
      
      expect(paulConfig?.lastSyncAt).toBe(testDate);
      expect(michelleConfig?.lastSyncAt).toBeUndefined();
    });
  });

  describe('getMapIdFromUrl', () => {
    it('should extract map ID from edit URL', () => {
      const editUrl = 'https://www.google.com/maps/d/u/0/edit?hl=en&mid=1o8S4w05Z4gPt7s6mfCoZXT46mOJEtV4&ll=34.68473561338665%2C135.4605171&z=18';
      
      const mapId = config.getMapIdFromUrl(editUrl);
      
      expect(mapId).toBe('1o8S4w05Z4gPt7s6mfCoZXT46mOJEtV4');
    });

    it('should extract map ID from viewer URL', () => {
      const viewerUrl = 'https://www.google.com/maps/d/u/0/viewer?mid=1LQROJade9LoCh-Y1kyXgpKtT-CCRZaU&ll=35.651834808721134%2C139.6465813097736&z=12';
      
      const mapId = config.getMapIdFromUrl(viewerUrl);
      
      expect(mapId).toBe('1LQROJade9LoCh-Y1kyXgpKtT-CCRZaU');
    });

    it('should throw error for invalid URL', () => {
      const invalidUrl = 'https://www.example.com/not-a-maps-url';
      
      expect(() => config.getMapIdFromUrl(invalidUrl)).toThrow('Invalid My Maps URL - no map ID found');
    });
  });

  describe('findMapByMapId', () => {
    it('should find Paul map by map ID', () => {
      const foundConfig = config.findMapByMapId('1o8S4w05Z4gPt7s6mfCoZXT46mOJEtV4');
      
      expect(foundConfig?.id).toBe('pauls-map');
      expect(foundConfig?.name).toBe("Paul's Map");
    });

    it('should find Michelle map by map ID', () => {
      const foundConfig = config.findMapByMapId('1LQROJade9LoCh-Y1kyXgpKtT-CCRZaU');
      
      expect(foundConfig?.id).toBe('michelles-map');
      expect(foundConfig?.name).toBe("Michelle's Map");
    });

    it('should return undefined for unknown map ID', () => {
      const foundConfig = config.findMapByMapId('unknown-map-id');
      
      expect(foundConfig).toBeUndefined();
    });
  });

  describe('getDisplayName', () => {
    it('should return display name for Paul map', () => {
      const displayName = config.getDisplayName('pauls-map');
      
      expect(displayName).toBe("Paul's Map");
    });

    it('should return display name for Michelle map', () => {
      const displayName = config.getDisplayName('michelles-map');
      
      expect(displayName).toBe("Michelle's Map");
    });

    it('should return Unknown Map for invalid ID', () => {
      const displayName = config.getDisplayName('unknown-map');
      
      expect(displayName).toBe('Unknown Map');
    });
  });
});