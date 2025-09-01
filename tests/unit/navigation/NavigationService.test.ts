import { NavigationService } from '../../../src/navigation/NavigationService';

describe('NavigationService', () => {
  describe('getTabConfiguration', () => {
    it('should return configuration for all 4 required tabs', () => {
      const navigationService = new NavigationService();
      
      const config = navigationService.getTabConfiguration();
      
      expect(config).toHaveLength(4);
      expect(config.map(tab => tab.name)).toEqual(['Map', 'Itinerary', 'Places', 'Debug']);
    });

    it('should include correct icons for each tab', () => {
      const navigationService = new NavigationService();
      
      const config = navigationService.getTabConfiguration();
      
      const mapTab = config.find(tab => tab.name === 'Map');
      const itineraryTab = config.find(tab => tab.name === 'Itinerary');
      const placesTab = config.find(tab => tab.name === 'Places');
      const debugTab = config.find(tab => tab.name === 'Debug');

      expect(mapTab?.icon).toBe('map');
      expect(itineraryTab?.icon).toBe('calendar');
      expect(placesTab?.icon).toBe('location');
      expect(debugTab?.icon).toBe('bug');
    });

    it('should include route names for navigation', () => {
      const navigationService = new NavigationService();
      
      const config = navigationService.getTabConfiguration();
      
      expect(config[0].route).toBe('MapScreen');
      expect(config[1].route).toBe('ItineraryScreen');
      expect(config[2].route).toBe('PlacesScreen');
      expect(config[3].route).toBe('DebugScreen');
    });
  });

  describe('validateNavigation', () => {
    it('should validate that all required screens are configured', () => {
      const navigationService = new NavigationService();
      
      const mockScreens = {
        MapScreen: { component: 'MockMapComponent' },
        ItineraryScreen: { component: 'MockItineraryComponent' },
        PlacesScreen: { component: 'MockPlacesComponent' },
        DebugScreen: { component: 'MockDebugComponent' }
      };
      
      const result = navigationService.validateNavigation(mockScreens);
      
      expect(result.isValid).toBe(true);
      expect(result.missingScreens).toHaveLength(0);
    });

    it('should identify missing screens', () => {
      const navigationService = new NavigationService();
      
      const incompleteScreens = {
        MapScreen: { component: 'MockMapComponent' },
        ItineraryScreen: { component: 'MockItineraryComponent' }
      };
      
      const result = navigationService.validateNavigation(incompleteScreens);
      
      expect(result.isValid).toBe(false);
      expect(result.missingScreens).toContain('PlacesScreen');
      expect(result.missingScreens).toContain('DebugScreen');
    });
  });

  describe('getCurrentTab', () => {
    it('should return current active tab name', () => {
      const navigationService = new NavigationService();
      
      navigationService.setCurrentTab('ItineraryScreen');
      
      const currentTab = navigationService.getCurrentTab();
      
      expect(currentTab).toBe('ItineraryScreen');
    });

    it('should default to MapScreen', () => {
      const navigationService = new NavigationService();
      
      const currentTab = navigationService.getCurrentTab();
      
      expect(currentTab).toBe('MapScreen');
    });
  });

  describe('getTabDisplayName', () => {
    it('should convert route names to display names', () => {
      const navigationService = new NavigationService();
      
      expect(navigationService.getTabDisplayName('MapScreen')).toBe('Map');
      expect(navigationService.getTabDisplayName('ItineraryScreen')).toBe('Itinerary');
      expect(navigationService.getTabDisplayName('PlacesScreen')).toBe('Places');
      expect(navigationService.getTabDisplayName('DebugScreen')).toBe('Debug');
    });

    it('should handle unknown routes gracefully', () => {
      const navigationService = new NavigationService();
      
      expect(navigationService.getTabDisplayName('UnknownScreen')).toBe('Unknown');
    });
  });
});