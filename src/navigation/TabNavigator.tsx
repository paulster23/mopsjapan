import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { NavigationService } from './NavigationService';
import { ItineraryScreen } from '../screens/ItineraryScreen';

// Placeholder screen components
const MapScreen = () => (
  <div style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <h2>Map Screen</h2>
    <p>GPS location and nearby subway stations</p>
  </div>
);

const PlacesScreen = () => (
  <div style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <h2>Places Screen</h2>
    <p>Google Calendar favorites</p>
  </div>
);

const DebugScreen = () => (
  <div style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <h2>Debug Screen</h2>
    <p>Test suite health and debugging tools</p>
  </div>
);

const Tab = createBottomTabNavigator();

export function TabNavigator() {
  const navigationService = new NavigationService();
  const tabConfig = navigationService.getTabConfiguration();

  const getIconName = (iconName: string, focused: boolean): keyof typeof Ionicons.glyphMap => {
    const iconMap: Record<string, string> = {
      map: focused ? 'map' : 'map-outline',
      calendar: focused ? 'calendar' : 'calendar-outline',
      location: focused ? 'location' : 'location-outline',
      bug: focused ? 'bug' : 'bug-outline'
    };
    return (iconMap[iconName] || 'help-outline') as keyof typeof Ionicons.glyphMap;
  };

  const screenComponents = {
    MapScreen,
    ItineraryScreen,
    PlacesScreen,
    DebugScreen
  };

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false
      }}
    >
      {tabConfig.map(tab => (
        <Tab.Screen
          key={tab.route}
          name={tab.route}
          component={screenComponents[tab.route as keyof typeof screenComponents]}
          options={{
            title: tab.name,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={getIconName(tab.icon, focused)}
                size={24}
                color={color}
              />
            )
          }}
        />
      ))}
    </Tab.Navigator>
  );
}