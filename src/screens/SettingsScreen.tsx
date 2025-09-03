import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { LocationOverrideService } from '../services/LocationOverrideService';
import { DataPersistenceService } from '../services/DataPersistenceService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OverrideLocation {
  latitude: number;
  longitude: number;
  name: string;
}

export function SettingsScreen() {
  const [overrideService] = useState(() => new LocationOverrideService(new DataPersistenceService(AsyncStorage)));
  const [isOverrideActive, setIsOverrideActive] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<OverrideLocation | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [presetLocations] = useState(() => overrideService.getPresetLocations());

  useEffect(() => {
    // Initialize service state
    const initializeService = async () => {
      await overrideService.loadPersistedOverride();
      setIsOverrideActive(overrideService.isOverrideActive());
      setCurrentLocation(overrideService.getOverrideLocation());
    };

    initializeService();
  }, []);

  const handleToggleOverride = async (value: boolean) => {
    if (value) {
      // Show location picker when enabling override
      setShowLocationPicker(true);
    } else {
      // Disable override immediately
      await overrideService.disableLocationOverride();
      setIsOverrideActive(false);
      setCurrentLocation(null);
      setShowLocationPicker(false);
    }
  };

  const handleLocationSelect = async (location: OverrideLocation) => {
    try {
      await overrideService.enableLocationOverride(location);
      setIsOverrideActive(true);
      setCurrentLocation(location);
      setShowLocationPicker(false);
    } catch (error) {
      // Handle validation errors - could show alert here
      console.error('Failed to set location override:', error);
    }
  };

  const handleResetToGPS = async () => {
    await overrideService.disableLocationOverride();
    setIsOverrideActive(false);
    setCurrentLocation(null);
    setShowLocationPicker(false);
  };

  const getLocationStatusText = () => {
    if (isOverrideActive && currentLocation) {
      return `Override: ${currentLocation.name}`;
    }
    return 'Using real GPS location';
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Development Settings</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Location Override</Text>
            <Text style={styles.settingDescription}>{getLocationStatusText()}</Text>
          </View>
          <Switch
            testID="location-override-toggle"
            value={isOverrideActive}
            onValueChange={handleToggleOverride}
            trackColor={{ false: '#767577', true: '#007AFF' }}
            thumbColor={isOverrideActive ? '#007AFF' : '#f4f3f4'}
          />
        </View>

        {showLocationPicker && (
          <View testID="location-picker" style={styles.locationPicker}>
            <Text style={styles.pickerTitle}>Select Test Location:</Text>
            {presetLocations.map((location) => (
              <TouchableOpacity
                key={location.name}
                testID={`location-preset-${location.name}`}
                style={styles.locationButton}
                onPress={() => handleLocationSelect(location)}
              >
                <Text style={styles.locationButtonText}>{location.name}</Text>
                <Text style={styles.locationCoords}>
                  {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {isOverrideActive && (
          <TouchableOpacity
            testID="reset-gps-button"
            style={styles.resetButton}
            onPress={handleResetToGPS}
          >
            <Text style={styles.resetButtonText}>Reset to Real GPS</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  locationPicker: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  locationButton: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  locationButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  locationCoords: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  resetButton: {
    backgroundColor: '#ff6b6b',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});