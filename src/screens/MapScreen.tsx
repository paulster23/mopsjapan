import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, Modal } from 'react-native';
import { MapView, Marker } from '../components/PlatformMapView';
import { useTheme } from '../contexts/ThemeContext';
import { MapScreenService } from './services/MapScreenService';
import { LocationService } from '../services/LocationService';
import { TokyoODPTService } from '../services/TokyoODPTService';
import { RouteCalculationService, RouteOption, Route } from '../services/RouteCalculationService';
import { StationFinderService } from '../services/StationFinderService';
import { sharedGooglePlacesService } from '../services/SharedServices';
import { Place, PlaceCategory } from '../services/GooglePlacesService';

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
  const { theme, colors } = useTheme();
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [nearbyStations, setNearbyStations] = useState<StationWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('Not requested');
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [directions, setDirections] = useState<DirectionStep[]>([]);
  const [showDirections, setShowDirections] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [hasCachedData, setHasCachedData] = useState(false);
  
  // Map-related state
  const [places, setPlaces] = useState<Place[]>([]);
  const [filteredPlaces, setFilteredPlaces] = useState<Place[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory | 'all'>('all');
  const [mapRegion, setMapRegion] = useState({
    latitude: 35.6812, // Default to Tokyo
    longitude: 139.7671,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [currentZoom, setCurrentZoom] = useState<number>(13); // Track zoom level for label visibility
  const [selectedMapPlace, setSelectedMapPlace] = useState<Place | null>(null);
  
  const locationService = new LocationService();
  const mapService = new MapScreenService(
    locationService, 
    new TokyoODPTService(),
    new RouteCalculationService(locationService, new StationFinderService(locationService))
  );

  useEffect(() => {
    // Auto-request location on component mount
    handleGetLocation();
    checkOfflineData();
    loadPlaces();
  }, []);

  // Update map region when user location changes
  useEffect(() => {
    if (userLocation) {
      setMapRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  }, [userLocation]);

  // Filter places when category or places change
  useEffect(() => {
    filterPlaces();
  }, [places, selectedCategory]);

  const loadPlaces = () => {
    const allPlaces = sharedGooglePlacesService.getAllPlaces();
    setPlaces(allPlaces);
  };

  const filterPlaces = () => {
    if (selectedCategory === 'all') {
      setFilteredPlaces(places);
    } else {
      const filtered = sharedGooglePlacesService.getPlacesByCategory(selectedCategory);
      setFilteredPlaces(filtered);
    }
  };

  const handleCategoryFilter = (category: PlaceCategory | 'all') => {
    setSelectedCategory(category);
  };

  const checkOfflineData = async () => {
    try {
      // Check if there's cached map data available
      const result = await mapService.offlineMapService.getCachedSubwayMap();
      setHasCachedData(result.success);
    } catch (error) {
      setHasCachedData(false);
    }
  };

  const handleGetLocation = async () => {
    setLoading(true);
    setLocationStatus('Requesting location...');
    
    try {
      const result = await mapService.getUserLocation();
      
      if (result.success && result.location) {
        setUserLocation(result.location);
        setLocationStatus(`Located: ${mapService.formatLocationForDisplay(result.location.latitude, result.location.longitude)}`);
        
        // Find nearby stations with real-time status or offline data
        const stations = offlineMode 
          ? await handleGetOfflineStations(result.location, 3.0)
          : await mapService.getNearbyStationsWithStatus(result.location, 3.0);
        setNearbyStations(stations);
      } else {
        setLocationStatus(`Error: ${result.error}`);
        Alert.alert('Location Error', result.error || 'Failed to get location');
        
        // Use default Tokyo location
        const defaultLocation = { latitude: 35.6762, longitude: 139.6503 };
        setUserLocation(defaultLocation);
        const stations = offlineMode 
          ? await handleGetOfflineStations(defaultLocation, 3.0)
          : await mapService.getNearbyStationsWithStatus(defaultLocation, 3.0);
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

  const handleGetOfflineStations = async (location: UserLocation, radius: number): Promise<StationWithStatus[]> => {
    const result = await mapService.findNearbyStationsWithOffline(location, radius);
    if (result.success && result.stations) {
      return result.stations;
    }
    return [];
  };

  const handleToggleOfflineMode = async () => {
    const newOfflineMode = !offlineMode;
    setOfflineMode(newOfflineMode);
    
    if (userLocation) {
      setLoading(true);
      const stations = newOfflineMode 
        ? await handleGetOfflineStations(userLocation, 3.0)
        : await mapService.getNearbyStationsWithStatus(userLocation, 3.0);
      setNearbyStations(stations);
      setLoading(false);
    }
  };

  const handleMarkerPress = (place: Place) => {
    if (!place.coordinates) {
      Alert.alert('No Location', 'This place does not have location coordinates');
      return;
    }

    // Show modal with place details
    setSelectedMapPlace(place);
  };

  const handleOpenInGoogleMaps = async (place: Place) => {
    if (!place.coordinates) {
      Alert.alert('No Location', 'This place does not have coordinates available');
      return;
    }

    const { latitude, longitude } = place.coordinates;
    
    // Use the same working URL pattern from Leaflet popup
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    
    // Close modal first for better UX
    setSelectedMapPlace(null);
    
    try {
      // Open the working URL in browser
      window.open(googleMapsUrl, '_blank');
    } catch (error) {
      console.error('Error opening Google Maps:', error);
      Alert.alert('Error', 'Could not open Google Maps');
    }
  };

  const handleZoomChange = (zoom: number) => {
    setCurrentZoom(zoom);
  };

  const getMaxPlacesToShow = (zoomLevel: number) => {
    // Smart density control to prevent UI cramming
    if (zoomLevel <= 13) return 10;  // Very few at overview level
    if (zoomLevel <= 14) return 20;  // Moderate at neighborhood level
    if (zoomLevel <= 15) return 35;  // More at street level
    return 50; // Maximum at close zoom
  };

  const getPlacesToShow = () => {
    const maxPlaces = getMaxPlacesToShow(currentZoom);
    
    // Show closest places first if user location is available
    if (userLocation) {
      return filteredPlaces
        .filter(place => place.coordinates)
        .map(place => ({
          ...place,
          distance: calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            place.coordinates!.latitude,
            place.coordinates!.longitude
          )
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, maxPlaces);
    }
    
    // If no user location, just limit by max count
    return filteredPlaces
      .filter(place => place.coordinates)
      .slice(0, maxPlaces);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const renderStation = ({ item }: { item: StationWithStatus }) => (
    <View style={themedStyles.stationItem}>
      <View style={themedStyles.stationHeader}>
        <Text style={themedStyles.stationName}>{item.name}</Text>
        <View style={themedStyles.stationMeta}>
          <Text style={themedStyles.stationDistance}>{item.distance}km</Text>
          <View style={[themedStyles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={[themedStyles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>
      <Text style={themedStyles.stationLines}>
        Lines: {item.lines.join(', ')}
      </Text>
      {item.delays.length > 0 && (
        <View style={themedStyles.delaysContainer}>
          {item.delays.map((delay, index) => (
            <Text key={index} style={themedStyles.delayText}>
              🚫 {delay.line}: +{delay.delayMinutes}min ({delay.reason})
            </Text>
          ))}
        </View>
      )}
      {item.lastUpdated && (
        <Text style={themedStyles.lastUpdated}>
          Last updated: {new Date(item.lastUpdated).toLocaleTimeString()}
        </Text>
      )}
      <TouchableOpacity 
        style={themedStyles.routeButton} 
        onPress={() => handleCalculateRoute(item)}
        disabled={!userLocation}
      >
        <Text style={themedStyles.routeButtonText}>📍 Get Directions</Text>
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

  const getMarkerColorByCategory = (category: string): string => {
    switch (category) {
      case 'accommodation': return 'purple';
      case 'restaurant': return 'orange';
      case 'entertainment': return 'green';
      case 'transport': return 'blue';
      case 'shopping': return 'red';
      case 'hardware': return 'gray';
      default: return 'red';
    }
  };

  const getCategoryBackgroundColor = (category: PlaceCategory | 'all'): string => {
    switch (category) {
      case 'accommodation': return '#8B5CF6'; // purple
      case 'restaurant': return '#F97316';     // orange
      case 'entertainment': return '#10B981';  // green
      case 'transport': return '#3B82F6';      // blue
      case 'shopping': return '#EF4444';       // red
      case 'hardware': return '#6B7280';       // gray
      default: return colors.primary;          // default blue for "all"
    }
  };

  const CategoryButton = ({ category, label }: { category: PlaceCategory | 'all'; label: string }) => (
    <TouchableOpacity
      testID={`filter-${category}`}
      style={[
        themedStyles.categoryButton,
        selectedCategory === category && {
          backgroundColor: getCategoryBackgroundColor(category),
          borderColor: getCategoryBackgroundColor(category),
        }
      ]}
      onPress={() => handleCategoryFilter(category)}
    >
      <Text style={[
        themedStyles.categoryButtonText,
        selectedCategory === category && themedStyles.activeCategoryButtonText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const themedStyles = createThemedStyles(colors, theme);
  
  return (
    <View style={[themedStyles.container]} testID="map-container">
      <View style={themedStyles.header}>
        <Text style={themedStyles.title}>Map & Location</Text>
        <View style={themedStyles.headerControls}>
          <View style={themedStyles.compactLocationControls}>
            <TouchableOpacity 
              style={themedStyles.compactLocationButton} 
              onPress={handleGetLocation}
              disabled={loading}
            >
              <Text style={themedStyles.compactButtonText}>
                {loading ? '📍...' : '📍'}
              </Text>
            </TouchableOpacity>
            {hasCachedData && (
              <TouchableOpacity 
                style={[themedStyles.compactLocationButton, offlineMode ? themedStyles.compactOfflineActive : themedStyles.compactOffline]} 
                onPress={handleToggleOfflineMode}
                disabled={loading}
              >
                <Text style={themedStyles.compactButtonText}>
                  {offlineMode ? '📶' : '📴'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={themedStyles.compactLocationStatus}>{locationStatus}</Text>
        </View>
      </View>

      {/* Category Filters */}
      <View testID="category-filter" style={themedStyles.categoryContainer}>
        <CategoryButton category="all" label="All" />
        <CategoryButton category="accommodation" label="Hotels" />
        <CategoryButton category="restaurant" label="Restaurants" />
        <CategoryButton category="entertainment" label="Entertainment" />
        <CategoryButton category="transport" label="Transport" />
        <CategoryButton category="shopping" label="Shopping" />
        <CategoryButton category="hardware" label="Hardware" />
      </View>

      <MapView
        testID="interactive-map-view"
        style={themedStyles.mapContainer}
        region={mapRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onRegionChangeComplete={setMapRegion}
        onZoomChange={handleZoomChange}
        currentZoom={currentZoom}
      >
        {/* Current location marker */}
        {userLocation && (
          <Marker
            testID="current-location-marker"
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            title="Your Location"
            description="Current position"
            pinColor="blue"
          />
        )}

        {/* Place markers */}
        <View testID="place-markers">
          {getPlacesToShow().map((place) => (
            <Marker
              key={place.id}
              coordinate={{
                latitude: place.coordinates!.latitude,
                longitude: place.coordinates!.longitude,
              }}
              title={place.name}
              description={`${place.category} in ${place.city}`}
              onPress={() => handleMarkerPress(place)}
              pinColor={getMarkerColorByCategory(place.category)}
              category={place.category}
              showLabel={currentZoom >= 14}
              zoomLevel={currentZoom}
            />
          ))}
        </View>
      </MapView>

      <View style={themedStyles.stationsSection}>
        <Text style={themedStyles.sectionTitle}>
          Nearby Subway Stations ({nearbyStations.length})
          {offlineMode && <Text style={themedStyles.offlineIndicator}> 📴 OFFLINE</Text>}
        </Text>
        
        {nearbyStations.length > 0 ? (
          <View style={themedStyles.stationsContainer}>
            {nearbyStations.map((station) => (
              <View key={station.name}>
                {renderStation({ item: station })}
              </View>
            ))}
          </View>
        ) : (
          <Text style={themedStyles.noStationsText}>
            {loading ? 'Finding stations...' : 'No nearby stations found'}
          </Text>
        )}
      </View>

      {selectedRoute && (
        <View style={themedStyles.routeSection}>
          <Text style={themedStyles.sectionTitle}>
            Route to {selectedRoute.segments[selectedRoute.segments.length - 1]?.toStation}
          </Text>
          <View style={themedStyles.routeSummary}>
            <Text style={themedStyles.routeTime}>⏱️ {selectedRoute.totalDuration} min</Text>
            <Text style={themedStyles.routeDistance}>📏 {selectedRoute.totalDistance.toFixed(1)} km</Text>
            {selectedRoute.transferCount > 0 && (
              <Text style={themedStyles.routeTransfers}>🔄 {selectedRoute.transferCount} transfers</Text>
            )}
          </View>
          
          <TouchableOpacity 
            style={themedStyles.directionsButton} 
            onPress={handleShowDirections}
          >
            <Text style={themedStyles.directionsButtonText}>🗺️ Show Step-by-Step Directions</Text>
          </TouchableOpacity>
        </View>
      )}

      {showDirections && directions.length > 0 && (
        <View style={themedStyles.directionsSection}>
          <Text style={themedStyles.sectionTitle}>Turn-by-Turn Directions</Text>
          <FlatList
            data={directions}
            renderItem={({ item, index }) => (
              <View style={themedStyles.directionStep}>
                <View style={themedStyles.stepNumber}>
                  <Text style={themedStyles.stepNumberText}>{index + 1}</Text>
                </View>
                <View style={themedStyles.stepContent}>
                  <Text style={themedStyles.stepInstruction}>{item.instruction}</Text>
                  {item.duration && (
                    <Text style={themedStyles.stepDuration}>⏱️ {item.duration} min</Text>
                  )}
                </View>
              </View>
            )}
            keyExtractor={(_, index) => index.toString()}
            style={themedStyles.directionsList}
          />
          <TouchableOpacity 
            style={themedStyles.hideDirectionsButton} 
            onPress={() => setShowDirections(false)}
          >
            <Text style={themedStyles.hideDirectionsButtonText}>Hide Directions</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Place Details Modal */}
      <Modal
        visible={selectedMapPlace !== null}
        animationType="slide"
        transparent={true}
        testID="map-place-modal"
      >
        <View style={themedStyles.modalOverlay}>
          <View style={themedStyles.modalContent}>
            {selectedMapPlace && (
              <>
                <Text style={themedStyles.modalTitle}>{selectedMapPlace.name}</Text>
                <Text style={themedStyles.modalCategory}>
                  {selectedMapPlace.category.charAt(0).toUpperCase() + selectedMapPlace.category.slice(1)}
                </Text>
                <Text style={themedStyles.modalCity}>{selectedMapPlace.city}</Text>
                {selectedMapPlace.description && (
                  <Text style={themedStyles.modalDescription}>{selectedMapPlace.description}</Text>
                )}
                {selectedMapPlace.coordinates && (
                  <Text style={themedStyles.modalCoordinates}>
                    📍 {selectedMapPlace.coordinates.latitude.toFixed(4)}, {selectedMapPlace.coordinates.longitude.toFixed(4)}
                  </Text>
                )}
                
                <TouchableOpacity
                  testID="open-google-maps-button"
                  style={themedStyles.googleMapsButton}
                  onPress={() => handleOpenInGoogleMaps(selectedMapPlace)}
                >
                  <Text style={themedStyles.googleMapsButtonText}>🗺️ Open in Google Maps</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  testID="close-place-modal-button"
                  style={themedStyles.closeButton}
                  onPress={() => setSelectedMapPlace(null)}
                >
                  <Text style={themedStyles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

const createThemedStyles = (colors: any, theme: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  locationSection: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.text,
  },
  locationStatus: {
    fontSize: 14,
    color: colors.secondary,
    marginBottom: 12,
  },
  locationButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  offlineButton: {
    backgroundColor: colors.secondary,
  },
  offlineButtonActive: {
    backgroundColor: colors.accent,
  },
  offlineButtonText: {
    fontWeight: '600',
  },
  offlineIndicator: {
    fontSize: 14,
    color: colors.warning,
    fontWeight: '600',
  },
  stationsSection: {
    flex: 1,
    marginBottom: 16,
  },
  stationsList: {
    flex: 1,
  },
  stationItem: {
    backgroundColor: colors.background,
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    elevation: 1,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.text,
    flex: 1,
  },
  stationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stationDistance: {
    fontSize: 14,
    color: colors.primary,
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
    color: colors.secondary,
  },
  noStationsText: {
    textAlign: 'center',
    color: colors.secondary,
    fontStyle: 'italic',
    marginTop: 20,
  },
  mapContainer: {
    height: 400,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  headerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    minHeight: 44,
  },
  compactLocationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactLocationButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  compactButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  compactLocationStatus: {
    fontSize: 12,
    color: colors.secondary,
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  compactOffline: {
    backgroundColor: colors.secondary,
  },
  compactOfflineActive: {
    backgroundColor: colors.accent,
  },
  stationsContainer: {
    gap: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  categoryButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeCategoryButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryButtonText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  activeCategoryButtonText: {
    color: colors.background,
    fontWeight: '600',
  },
  delaysContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  delayText: {
    fontSize: 11,
    color: colors.warning,
    marginBottom: 2,
    fontWeight: '500',
  },
  lastUpdated: {
    fontSize: 10,
    color: colors.secondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  routeButton: {
    backgroundColor: colors.primary,
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
    backgroundColor: theme === 'dark' ? '#2d4a3a' : '#e8f4f8',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
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
    color: colors.primary,
  },
  routeDistance: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  routeTransfers: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warning,
  },
  directionsButton: {
    backgroundColor: colors.accent,
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
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 6,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
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
    color: colors.text,
    lineHeight: 20,
    marginBottom: 2,
  },
  stepDuration: {
    fontSize: 12,
    color: colors.secondary,
  },
  hideDirectionsButton: {
    backgroundColor: colors.secondary,
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  hideDirectionsButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    maxWidth: 400, // Better for iPhone 13 Mini
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: colors.text,
  },
  modalCategory: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
    color: colors.primary,
  },
  modalCity: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
    color: colors.secondary,
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
    color: colors.text,
    lineHeight: 20,
  },
  modalCoordinates: {
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center',
    color: colors.secondary,
    fontFamily: 'monospace',
  },
  googleMapsButton: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    minHeight: 44, // iPhone-friendly touch target
  },
  googleMapsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: colors.secondary,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    minHeight: 44, // iPhone-friendly touch target
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  locationSection: {
    marginBottom: 16,
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
    marginBottom: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  offlineButton: {
    backgroundColor: '#6c757d',
  },
  offlineButtonActive: {
    backgroundColor: '#28a745',
  },
  offlineButtonText: {
    fontWeight: '600',
  },
  offlineIndicator: {
    fontSize: 14,
    color: '#fd7e14',
    fontWeight: '600',
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