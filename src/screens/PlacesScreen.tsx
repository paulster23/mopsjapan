import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Modal, Alert } from 'react-native';
import { GooglePlacesService, Place, PlaceCategory } from '../services/GooglePlacesService';
import { LocationService } from '../services/LocationService';
import { SyncStatus } from '../components/SyncStatus';
import { MapSyncConfig } from '../services/MapSyncConfig';
import { SyncStatusService } from '../services/SyncStatusService';
import { EnhancedSyncService } from '../services/EnhancedSyncService';
import { MyMapsImportService } from '../services/MyMapsImportService';
import { NetlifyApiService } from '../services/NetlifyApiService';
import { getNetlifyBaseUrl, getEnvironment, isDevelopment } from '../config/environment';

export function PlacesScreen() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [filteredPlaces, setFilteredPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [syncStatuses, setSyncStatuses] = useState<Record<string, any>>({});
  const [newPlace, setNewPlace] = useState({
    name: '',
    city: '',
    description: '',
    category: 'restaurant' as PlaceCategory
  });

  // Services
  const googlePlacesService = new GooglePlacesService(new LocationService());
  const mapConfig = new MapSyncConfig();
  const syncStatusService = new SyncStatusService();
  const myMapsImportService = new MyMapsImportService();
  const netlifyApiService = new NetlifyApiService(getNetlifyBaseUrl());
  const enhancedSyncService = new EnhancedSyncService(
    mapConfig,
    syncStatusService,
    myMapsImportService,
    netlifyApiService
  );

  useEffect(() => {
    loadPlaces();
    loadSyncStatuses();
  }, []);

  useEffect(() => {
    filterPlaces();
  }, [places, selectedCategory, searchText]);

  const loadSyncStatuses = async () => {
    const configs = mapConfig.getMapConfigs();
    const statuses: Record<string, any> = {};
    
    for (const config of configs) {
      statuses[config.id] = syncStatusService.getSyncStatus(config.id);
      
      // Load last sync time from storage
      const lastSyncTime = await syncStatusService.getLastSyncTime(config.id);
      if (lastSyncTime) {
        statuses[config.id].lastSyncAt = lastSyncTime;
      }
    }
    
    setSyncStatuses(statuses);
  };

  const loadPlaces = async () => {
    try {
      const loadedPlaces = googlePlacesService.loadCustomMapPlaces();
      setPlaces(loadedPlaces);
    } finally {
      setLoading(false);
    }
  };

  const filterPlaces = () => {
    let filtered = places;

    // Apply search filter
    if (searchText.trim()) {
      filtered = googlePlacesService.searchPlaces(searchText);
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = googlePlacesService.getPlacesByCategory(selectedCategory);
    }

    setFilteredPlaces(filtered);
  };

  const handleCategoryFilter = (category: PlaceCategory | 'all') => {
    setSelectedCategory(category);
    setSearchText(''); // Clear search when changing category
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    setSelectedCategory('all'); // Reset category when searching
  };

  const handleAddPlace = async () => {
    if (!newPlace.name.trim() || !newPlace.city.trim()) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    const success = googlePlacesService.addCustomPlace({
      name: newPlace.name,
      category: newPlace.category,
      city: newPlace.city,
      description: newPlace.description || undefined
    });

    if (success) {
      setShowAddModal(false);
      setNewPlace({ name: '', city: '', description: '', category: 'restaurant' });
      loadPlaces(); // Reload places
    } else {
      Alert.alert('Error', 'Place already exists');
    }
  };

  const testNetworkConnectivity = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      // Test basic connectivity to Netlify functions endpoint
      const baseUrl = getNetlifyBaseUrl();
      const testUrl = `${baseUrl}/.netlify/functions/fetch-mymaps-kml`;
      
      // Debug logging
      console.log('🐛 DEBUG - Environment detection:', {
        environment: getEnvironment(),
        baseUrl,
        testUrl,
        isDev: isDevelopment(),
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
        __DEV__: typeof __DEV__ !== 'undefined' ? __DEV__ : 'N/A',
        NODE_ENV: typeof process !== 'undefined' ? process.env.NODE_ENV : 'N/A'
      });
      
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapId: 'test' }),
        // Short timeout for connectivity test
        signal: AbortSignal.timeout(10000)
      });

      // Debug logging for response
      console.log('🐛 DEBUG - Response details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url
      });

      // Function exists if we get any of these responses:
      // - 200: Success (shouldn't happen with test data but valid)
      // - 400: Bad request (expected with test mapId - function processed request)  
      // - 405: Method not allowed (function exists but wrong HTTP method)
      if (response.status === 200 || response.status === 400 || response.status === 405) {
        console.log('🐛 DEBUG - Connectivity test PASSED with status:', response.status);
        return { success: true };
      }
      
      console.log('🐛 DEBUG - Connectivity test FAILED with status:', response.status);
      return { 
        success: false, 
        error: `Server responded with status ${response.status}. This indicates functions may not be deployed or are returning unexpected errors.` 
      };
    } catch (error) {
      console.log('🐛 DEBUG - Connectivity test ERROR:', error);
      if (error instanceof Error) {
        if (error.name === 'TimeoutError') {
          return { success: false, error: 'Connection timeout. Check your internet connection.' };
        }
        if (error.message.includes('fetch')) {
          const env = getEnvironment();
          return { 
            success: false, 
            error: `Cannot reach ${getNetlifyBaseUrl()}. ${env === 'development' ? 'Is netlify dev running?' : 'Are functions deployed?'}` 
          };
        }
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Network connectivity test failed' };
    }
  };

  const handleSyncMap = async (mapId: string) => {
    const mapName = mapConfig.getDisplayName(mapId);
    
    try {
      // Step 1: Test network connectivity first
      setSyncStatuses(prev => ({
        ...prev,
        [mapId]: {
          ...prev[mapId],
          status: 'connecting',
          message: 'Testing network connectivity...'
        }
      }));

      const connectivityTest = await testNetworkConnectivity();
      if (!connectivityTest.success) {
        throw new Error(connectivityTest.error);
      }

      // Step 2: Proceed with sync
      const result = await enhancedSyncService.syncMap(mapId, (progress) => {
        // Update status in real-time during sync
        setSyncStatuses(prev => ({
          ...prev,
          [mapId]: {
            ...prev[mapId],
            status: progress.phase,
            message: progress.message
          }
        }));
      });

      // Step 3: Process the result
      if (result.success && result.placesAdded > 0) {
        // Here you would integrate with your place storage
        // For now, we'll simulate adding places
        loadPlaces(); // Reload places
      }

      // Step 4: Update final status
      setSyncStatuses(prev => ({
        ...prev,
        [mapId]: syncStatusService.getSyncStatus(mapId)
      }));

      // Step 5: Show result message
      if (result.success) {
        const message = result.placesFound === 0 
          ? `No places found in ${result.mapName}`
          : `Sync completed!\n${result.placesAdded} new places added${result.duplicatesSkipped > 0 ? `\n${result.duplicatesSkipped} duplicates skipped` : ''}`;
        Alert.alert('Sync Success', message);
      } else {
        Alert.alert('Sync Failed', result.error || 'Unknown error occurred');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Provide more specific error messages
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('fetch')) {
        userFriendlyMessage += `\n\nTroubleshooting:\n• Check internet connection\n• Environment: ${getEnvironment()}\n• URL: ${getNetlifyBaseUrl()}`;
      }
      
      Alert.alert('Sync Error', userFriendlyMessage);
      
      // Update status to show error
      setSyncStatuses(prev => ({
        ...prev,
        [mapId]: {
          ...prev[mapId],
          status: 'error',
          message: errorMessage
        }
      }));
    }
  };

  const stats = googlePlacesService.getPlaceStatistics();

  const renderPlace = ({ item }: { item: Place }) => (
    <TouchableOpacity
      style={styles.placeItem}
      onPress={() => setSelectedPlace(item)}
    >
      <View style={styles.placeHeader}>
        <Text style={styles.placeName}>{item.name}</Text>
        <Text style={styles.placeCategory}>{item.category.charAt(0).toUpperCase() + item.category.slice(1)}</Text>
      </View>
      <Text style={styles.placeCity}>{item.city}</Text>
      {item.description && (
        <Text style={styles.placeDescription}>{item.description}</Text>
      )}
    </TouchableOpacity>
  );

  const CategoryButton = ({ category, label }: { category: PlaceCategory | 'all'; label: string }) => (
    <TouchableOpacity
      testID={`filter-${category}`}
      style={[
        styles.categoryButton,
        selectedCategory === category && styles.activeCategoryButton
      ]}
      onPress={() => handleCategoryFilter(category)}
    >
      <Text style={[
        styles.categoryButtonText,
        selectedCategory === category && styles.activeCategoryButtonText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text testID="loading-indicator" style={styles.loadingText}>Loading places...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="places-container">
      <Text style={styles.title}>Places & Favorites</Text>
      
      {/* Statistics */}
      <TouchableOpacity 
        testID="places-stats" 
        style={styles.statsContainer}
        onPress={() => setShowStats(!showStats)}
      >
        <Text style={styles.statsText}>
          {stats.total} places • {Object.keys(stats.byCity).length} cities
        </Text>
      </TouchableOpacity>

      {showStats && (
        <View style={styles.statsBreakdown}>
          <Text style={styles.statsTitle}>Categories:</Text>
          <Text>{stats.byCategory.accommodation} accommodations</Text>
          <Text>{stats.byCategory.restaurant} restaurants</Text>
          <Text>{stats.byCategory.entertainment} entertainment</Text>
          <Text>{stats.byCategory.transport} transport</Text>
          <Text>{stats.byCategory.shopping} shopping</Text>
          
          <Text style={styles.statsTitle}>Cities:</Text>
          {Object.entries(stats.byCity).map(([city, count]) => (
            <Text key={city}>{count} in {city}</Text>
          ))}
        </View>
      )}

      {/* Search */}
      <TextInput
        testID="search-input"
        style={styles.searchInput}
        placeholder="Search places..."
        value={searchText}
        onChangeText={handleSearch}
      />

      {/* Category Filters */}
      <View testID="category-filter" style={styles.categoryContainer}>
        <CategoryButton category="all" label="All" />
        <CategoryButton category="accommodation" label="Hotels" />
        <CategoryButton category="restaurant" label="Restaurants" />
        <CategoryButton category="entertainment" label="Entertainment" />
        <CategoryButton category="transport" label="Transport" />
        <CategoryButton category="shopping" label="Shopping" />
      </View>

      {/* View Toggle */}
      <View testID="view-toggle" style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'list' && styles.activeToggle]}
          onPress={() => setViewMode('list')}
        >
          <Text style={styles.toggleText}>List</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'map' && styles.activeToggle]}
          onPress={() => setViewMode('map')}
        >
          <Text style={styles.toggleText}>Map</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {viewMode === 'list' ? (
        <FlatList
          testID="places-list"
          data={filteredPlaces}
          renderItem={renderPlace}
          keyExtractor={(item) => item.id}
          style={styles.placesList}
        />
      ) : (
        <View testID="map-view-active" style={styles.mapContainer}>
          <View testID="map-view-placeholder" style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderText}>📍 Interactive Map</Text>
            <Text style={styles.mapPlaceholderSubtext}>Places will be shown on the map</Text>
          </View>
        </View>
      )}

      {/* Maps Sync Section */}
      <View style={styles.syncSection}>
        <Text style={styles.syncSectionTitle}>My Maps Sync</Text>
        
        {/* Paul's Map */}
        <View style={styles.mapSyncContainer}>
          <View style={styles.mapSyncHeader}>
            <TouchableOpacity
              testID="sync-pauls-map-button"
              style={[styles.syncButton, styles.paulsMapButton]}
              onPress={() => handleSyncMap('pauls-map')}
              disabled={syncStatuses['pauls-map']?.status === 'connecting' || syncStatuses['pauls-map']?.status === 'syncing'}
            >
              <Text style={styles.syncButtonText}>👨‍💼 Sync Paul's Map</Text>
            </TouchableOpacity>
          </View>
          {syncStatuses['pauls-map'] && (
            <SyncStatus status={syncStatuses['pauls-map']} compact />
          )}
        </View>

        {/* Michelle's Map */}
        <View style={styles.mapSyncContainer}>
          <View style={styles.mapSyncHeader}>
            <TouchableOpacity
              testID="sync-michelles-map-button"
              style={[styles.syncButton, styles.michellesMapButton]}
              onPress={() => handleSyncMap('michelles-map')}
              disabled={syncStatuses['michelles-map']?.status === 'connecting' || syncStatuses['michelles-map']?.status === 'syncing'}
            >
              <Text style={styles.syncButtonText}>👩‍💼 Sync Michelle's Map</Text>
            </TouchableOpacity>
          </View>
          {syncStatuses['michelles-map'] && (
            <SyncStatus status={syncStatuses['michelles-map']} compact />
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          testID="add-place-button"
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>➕ Add Place</Text>
        </TouchableOpacity>
      </View>

      {/* Place Details Modal */}
      <Modal
        visible={selectedPlace !== null}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View testID="place-details-modal" style={styles.modalContent}>
            {selectedPlace && (
              <>
                <Text style={styles.modalTitle}>{selectedPlace.name}</Text>
                <Text style={styles.modalCategory}>
                  {selectedPlace.category.charAt(0).toUpperCase() + selectedPlace.category.slice(1)}
                </Text>
                <Text style={styles.modalCity}>{selectedPlace.city}</Text>
                {selectedPlace.description && (
                  <Text style={styles.modalDescription}>{selectedPlace.description}</Text>
                )}
                {selectedPlace.coordinates && (
                  <Text testID="place-coordinates" style={styles.modalCoordinates}>
                    {selectedPlace.coordinates.latitude}, {selectedPlace.coordinates.longitude}
                  </Text>
                )}
                <TouchableOpacity
                  testID="close-modal-button"
                  style={styles.closeButton}
                  onPress={() => setSelectedPlace(null)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Place Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View testID="add-place-modal" style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Custom Place</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Place name"
              value={newPlace.name}
              onChangeText={(text) => setNewPlace({...newPlace, name: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="City"
              value={newPlace.city}
              onChangeText={(text) => setNewPlace({...newPlace, city: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Description"
              value={newPlace.description}
              onChangeText={(text) => setNewPlace({...newPlace, description: text})}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                testID="save-place-button"
                style={styles.saveButton}
                onPress={handleAddPlace}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsContainer: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 16,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  statsBreakdown: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  activeCategoryButton: {
    backgroundColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#333',
  },
  activeCategoryButtonText: {
    color: '#fff',
  },
  viewToggle: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeToggle: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    fontSize: 14,
    color: '#333',
  },
  placesList: {
    flex: 1,
  },
  placeItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  placeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  placeCategory: {
    fontSize: 12,
    color: '#007AFF',
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  placeCity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  placeDescription: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  mapContainer: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
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
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalCategory: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalCity: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  modalCoordinates: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginRight: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  // Sync section styles
  syncSection: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  syncSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#333',
  },
  mapSyncContainer: {
    marginBottom: 12,
  },
  mapSyncHeader: {
    marginBottom: 8,
  },
  syncButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  paulsMapButton: {
    backgroundColor: '#007AFF',
  },
  michellesMapButton: {
    backgroundColor: '#FF6B6B',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Action buttons styles
  actionButtonsContainer: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});