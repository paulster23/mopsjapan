import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList } from 'react-native';
import { MapScreenService } from './services/MapScreenService';
import { LocationService } from '../services/LocationService';
import { TokyoODPTService } from '../services/TokyoODPTService';
import { RouteCalculationService, RouteOption, Route } from '../services/RouteCalculationService';
import { StationFinderService } from '../services/StationFinderService';

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface SubwayStation {
  name: string;
  latitude: number;
  longitude: number;
  distance: number;
  lines: string[];
}

interface StationWithStatus extends SubwayStation {
  status: string;
  delays: Array<{
    line: string;
    delayMinutes: number;
    reason: string;
  }>;
  lastUpdated?: string;
}

interface DirectionStep {
  type: 'walk' | 'transit' | 'transfer';
  instruction: string;
  duration?: number;
  line?: string;
  fromStation?: string;
  toStation?: string;
}

export function MapScreen() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [nearbyStations, setNearbyStations] = useState<StationWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('Not requested');
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [directions, setDirections] = useState<DirectionStep[]>([]);
  const [showDirections, setShowDirections] = useState(false);
  
  const locationService = new LocationService();
  const mapService = new MapScreenService(
    locationService, 
    new TokyoODPTService(),
    new RouteCalculationService(locationService, new StationFinderService(locationService))
  );

  useEffect(() => {
    // Auto-request location on component mount
    handleGetLocation();
  }, []);

  const handleGetLocation = async () => {
    setLoading(true);
    setLocationStatus('Requesting location...');
    
    try {
      const result = await mapService.getUserLocation();
      
      if (result.success && result.location) {
        setUserLocation(result.location);
        setLocationStatus(`Located: ${mapService.formatLocationForDisplay(result.location.latitude, result.location.longitude)}`);
        
        // Find nearby stations with real-time status
        const stations = await mapService.getNearbyStationsWithStatus(result.location, 3.0);
        setNearbyStations(stations);
      } else {
        setLocationStatus(`Error: ${result.error}`);
        Alert.alert('Location Error', result.error || 'Failed to get location');
        
        // Use default Tokyo location
        const defaultLocation = { latitude: 35.6762, longitude: 139.6503 };
        setUserLocation(defaultLocation);
        const stations = await mapService.getNearbyStationsWithStatus(defaultLocation, 3.0);
        setNearbyStations(stations);
      }
    } catch (error) {
      setLocationStatus('Location request failed');
      console.error('Location error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateRoute = async (destination: StationWithStatus) => {
    if (!userLocation) {
      Alert.alert('Location Required', 'Please get your location first');
      return;
    }

    try {
      const toLocation = { latitude: destination.latitude, longitude: destination.longitude };
      const options = await mapService.getRouteOptions(userLocation, toLocation);
      setRouteOptions(options);
      
      // Auto-select the fastest route (first in sorted array)
      if (options.length > 0 && options[0].route) {
        setSelectedRoute(options[0].route);
        const routeDirections = await mapService.getDirections(options[0].route);
        setDirections(routeDirections);
      }
    } catch (error) {
      console.error('Route calculation error:', error);
      Alert.alert('Route Error', 'Failed to calculate route');
    }
  };

  const handleShowDirections = () => {
    setShowDirections(true);
  };

  const renderStation = ({ item }: { item: StationWithStatus }) => (
    <View style={styles.stationItem}>
      <View style={styles.stationHeader}>
        <Text style={styles.stationName}>{item.name}</Text>
        <View style={styles.stationMeta}>
          <Text style={styles.stationDistance}>{item.distance}km</Text>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.stationLines}>
        Lines: {item.lines.join(', ')}
      </Text>
      {item.delays.length > 0 && (
        <View style={styles.delaysContainer}>
          {item.delays.map((delay, index) => (
            <Text key={index} style={styles.delayText}>
              🚫 {delay.line}: +{delay.delayMinutes}min ({delay.reason})
            </Text>
          ))}
        </View>
      )}
      {item.lastUpdated && (
        <Text style={styles.lastUpdated}>
          Last updated: {new Date(item.lastUpdated).toLocaleTimeString()}
        </Text>
      )}
      <TouchableOpacity 
        style={styles.routeButton} 
        onPress={() => handleCalculateRoute(item)}
        disabled={!userLocation}
      >
        <Text style={styles.routeButtonText}>📍 Get Directions</Text>
      </TouchableOpacity>
    </View>
  );

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Normal': return '#28a745';
      case 'Delayed': return '#fd7e14';
      case 'Suspended': return '#dc3545';
      default: return '#6c757d';
    }
  };

  return (
    <View style={styles.container} testID="map-container">
      <Text style={styles.title}>Map & Location</Text>
      
      <View style={styles.locationSection}>
        <Text style={styles.sectionTitle}>Your Location</Text>
        <Text style={styles.locationStatus}>{locationStatus}</Text>
        
        <TouchableOpacity 
          style={styles.locationButton} 
          onPress={handleGetLocation}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Getting Location...' : 'Update Location'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.stationsSection}>
        <Text style={styles.sectionTitle}>
          Nearby Subway Stations ({nearbyStations.length})
        </Text>
        
        {nearbyStations.length > 0 ? (
          <FlatList
            data={nearbyStations}
            renderItem={renderStation}
            keyExtractor={(item) => item.name}
            style={styles.stationsList}
            testID="stations-list"
          />
        ) : (
          <Text style={styles.noStationsText}>
            {loading ? 'Finding stations...' : 'No nearby stations found'}
          </Text>
        )}
      </View>

      {selectedRoute && (
        <View style={styles.routeSection}>
          <Text style={styles.sectionTitle}>
            Route to {selectedRoute.segments[selectedRoute.segments.length - 1]?.toStation}
          </Text>
          <View style={styles.routeSummary}>
            <Text style={styles.routeTime}>⏱️ {selectedRoute.totalDuration} min</Text>
            <Text style={styles.routeDistance}>📏 {selectedRoute.totalDistance.toFixed(1)} km</Text>
            {selectedRoute.transferCount > 0 && (
              <Text style={styles.routeTransfers}>🔄 {selectedRoute.transferCount} transfers</Text>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.directionsButton} 
            onPress={handleShowDirections}
          >
            <Text style={styles.directionsButtonText}>🗺️ Show Step-by-Step Directions</Text>
          </TouchableOpacity>
        </View>
      )}

      {showDirections && directions.length > 0 && (
        <View style={styles.directionsSection}>
          <Text style={styles.sectionTitle}>Turn-by-Turn Directions</Text>
          <FlatList
            data={directions}
            renderItem={({ item, index }) => (
              <View style={styles.directionStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepInstruction}>{item.instruction}</Text>
                  {item.duration && (
                    <Text style={styles.stepDuration}>⏱️ {item.duration} min</Text>
                  )}
                </View>
              </View>
            )}
            keyExtractor={(_, index) => index.toString()}
            style={styles.directionsList}
          />
          <TouchableOpacity 
            style={styles.hideDirectionsButton} 
            onPress={() => setShowDirections(false)}
          >
            <Text style={styles.hideDirectionsButtonText}>Hide Directions</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderText}>
          📍 Interactive Map
        </Text>
        <Text style={styles.mapPlaceholderSubtext}>
          Map view will show your location and nearby stations
        </Text>
        {userLocation && (
          <Text style={styles.coordinatesText}>
            {mapService.formatLocationForDisplay(userLocation.latitude, userLocation.longitude)}
          </Text>
        )}
      </View>
    </View>
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
    marginBottom: 20,
    textAlign: 'center',
  },
  locationSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  locationStatus: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  locationButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  stationsSection: {
    flex: 1,
    marginBottom: 16,
  },
  stationsList: {
    flex: 1,
  },
  stationItem: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  stationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  stationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stationDistance: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  stationLines: {
    fontSize: 12,
    color: '#666',
  },
  noStationsText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 20,
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: '#e8f4f8',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  mapPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  mapPlaceholderSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#007AFF',
    fontFamily: 'monospace',
  },
  delaysContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  delayText: {
    fontSize: 11,
    color: '#fd7e14',
    marginBottom: 2,
    fontWeight: '500',
  },
  lastUpdated: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  routeButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
    alignItems: 'center',
  },
  routeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  routeSection: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#e8f4f8',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  routeSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  routeTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  routeDistance: {
    fontSize: 14,
    fontWeight: '600',
    color: '#28a745',
  },
  routeTransfers: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fd7e14',
  },
  directionsButton: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  directionsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  directionsSection: {
    marginBottom: 16,
  },
  directionsList: {
    maxHeight: 200,
    marginBottom: 8,
  },
  directionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 2,
  },
  stepDuration: {
    fontSize: 12,
    color: '#666',
  },
  hideDirectionsButton: {
    backgroundColor: '#6c757d',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  hideDirectionsButtonText: {
    color: '#fff',
    fontSize: 12,
  },
});