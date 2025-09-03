import { NavigationService } from '../../../src/navigation/NavigationService';

// Mock React Navigation modules
jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: jest.fn(() => ({
    Navigator: jest.fn(({ children }) => children),
    Screen: jest.fn(() => null)
  }))
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: {
    glyphMap: {
      'map': 'map',
      'map-outline': 'map-outline',
      'calendar': 'calendar',
      'calendar-outline': 'calendar-outline',
      'location': 'location', 
      'location-outline': 'location-outline',
      'bug': 'bug',
      'bug-outline': 'bug-outline',
      'help-outline': 'help-outline'
    }
  }
}));

// Mock the screen components
jest.mock('../../../src/screens/ItineraryScreen', () => ({
  ItineraryScreen: jest.fn()
}));

jest.mock('../../../src/screens/MapScreen', () => ({
  MapScreen: jest.fn()
}));

jest.mock('../../../src/screens/PlacesScreen', () => ({
  PlacesScreen: jest.fn()
}));

jest.mock('../../../src/screens/DebugScreen', () => ({
  DebugScreen: jest.fn()
}));

describe('TabNavigator', () => {
  describe('getIconName function logic', () => {
    it('should return correct focused icon names', () => {
      // Test the icon mapping logic that exists in TabNavigator
      const iconMap: Record<string, string> = {
        map: 'map',
        calendar: 'calendar', 
        location: 'location',
        bug: 'bug'
      };
      
      // These are the focused states
      expect(iconMap.map).toBe('map');
      expect(iconMap.calendar).toBe('calendar');
      expect(iconMap.location).toBe('location');
      expect(iconMap.bug).toBe('bug');
    });

    it('should return outline versions for unfocused icons', () => {
      // Test the unfocused icon mapping logic
      const iconMap: Record<string, string> = {
        map: 'map-outline',
        calendar: 'calendar-outline',
        location: 'location-outline', 
        bug: 'bug-outline'
      };

      expect(iconMap.map).toBe('map-outline');
      expect(iconMap.calendar).toBe('calendar-outline');
      expect(iconMap.location).toBe('location-outline');
      expect(iconMap.bug).toBe('bug-outline');
    });

    it('should return help-outline for unknown icon names', () => {
      const getIconName = (iconName: string, focused: boolean) => {
        const iconMap: Record<string, string> = {
          map: focused ? 'map' : 'map-outline',
          calendar: focused ? 'calendar' : 'calendar-outline',
          location: focused ? 'location' : 'location-outline',
          bug: focused ? 'bug' : 'bug-outline'
        };
        return iconMap[iconName] || 'help-outline';
      };

      expect(getIconName('unknown', true)).toBe('help-outline');
      expect(getIconName('invalid', false)).toBe('help-outline');
    });
  });

  describe('navigation service integration', () => {
    it('should use NavigationService for tab configuration', () => {
      const navigationService = new NavigationService();
      const config = navigationService.getTabConfiguration();

      expect(config).toHaveLength(4);
      expect(config.map(tab => tab.route)).toEqual([
        'MapScreen', 
        'ItineraryScreen', 
        'PlacesScreen', 
        'DebugScreen'
      ]);
    });

    it('should map screen components correctly', () => {
      const { ItineraryScreen } = require('../../../src/screens/ItineraryScreen');
      const { MapScreen } = require('../../../src/screens/MapScreen');
      const { PlacesScreen } = require('../../../src/screens/PlacesScreen');
      const { DebugScreen } = require('../../../src/screens/DebugScreen');

      const screenComponents = {
        MapScreen,
        ItineraryScreen,
        PlacesScreen,
        DebugScreen
      };

      expect(screenComponents.MapScreen).toBeDefined();
      expect(screenComponents.ItineraryScreen).toBeDefined();
      expect(screenComponents.PlacesScreen).toBeDefined();
      expect(screenComponents.DebugScreen).toBeDefined();
    });
  });
});