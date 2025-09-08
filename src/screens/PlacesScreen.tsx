import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, Alert, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Place, PlaceCategory } from '../services/GooglePlacesService';
import { sharedGooglePlacesService } from '../services/SharedServices';

export function PlacesScreen() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [filteredPlaces, setFilteredPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory | 'all'>('all');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [editPlace, setEditPlace] = useState({
    name: '',
    category: 'restaurant' as PlaceCategory,
    description: ''
  });

  // Services
  const googlePlacesService = sharedGooglePlacesService;

  useEffect(() => {
    loadPlaces();
  }, []);

  useEffect(() => {
    filterPlaces();
  }, [places, selectedCategory]);

  // Reload places when screen comes into focus (e.g., returning from DebugScreen after sync)
  useFocusEffect(
    useCallback(() => {
      loadPlaces();
    }, [])
  );


  const loadPlaces = async () => {
    try {
      const loadedPlaces = googlePlacesService.getAllPlaces();
      setPlaces(loadedPlaces);
    } finally {
      setLoading(false);
    }
  };

  const filterPlaces = () => {
    let filtered = places;

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = googlePlacesService.getPlacesByCategory(selectedCategory);
    }

    setFilteredPlaces(filtered);
  };

  const handleCategoryFilter = (category: PlaceCategory | 'all') => {
    setSelectedCategory(category);
  };



  const handleEditPlace = (place: Place) => {
    setEditingPlace(place);
    setEditPlace({
      name: place.name,
      category: place.category,
      description: place.description || ''
    });
    setShowEditModal(true);
  };

  const handleUpdatePlace = async () => {
    if (!editPlace.name.trim()) {
      Alert.alert('Error', 'Place name cannot be empty');
      return;
    }

    if (!editingPlace) return;

    const success = googlePlacesService.updatePlace(editingPlace.id, {
      name: editPlace.name,
      category: editPlace.category,
      description: editPlace.description || undefined
    });

    if (success) {
      setShowEditModal(false);
      setEditingPlace(null);
      setEditPlace({ name: '', category: 'restaurant', description: '' });
      loadPlaces(); // Reload places
    } else {
      Alert.alert('Error', 'Failed to update place. Name might already exist or place is read-only.');
    }
  };


  const stats = googlePlacesService.getPlaceStatistics();

  const isCustomPlace = (place: Place): boolean => {
    // All places are editable in the new storage system
    // Original places from feeds can be edited (edits are stored separately)
    return true;
  };

  const renderPlace = ({ item }: { item: Place }) => (
    <TouchableOpacity
      style={styles.placeItem}
      onPress={() => setSelectedPlace(item)}
    >
      <View style={styles.placeHeader}>
        <Text style={styles.placeName}>{item.name}</Text>
        <View style={styles.placeHeaderRight}>
          <Text style={styles.placeCategory}>{item.category.charAt(0).toUpperCase() + item.category.slice(1)}</Text>
          {isCustomPlace(item) && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={(e) => {
                e.stopPropagation();
                handleEditPlace(item);
              }}
            >
              <Text style={styles.editButtonText}>✏️</Text>
            </TouchableOpacity>
          )}
        </View>
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
          <Text>{stats.byCategory.hardware} hardware</Text>
          
          <Text style={styles.statsTitle}>Cities:</Text>
          {Object.entries(stats.byCity).map(([city, count]) => (
            <Text key={city}>{count} in {city}</Text>
          ))}
        </View>
      )}


      {/* Category Filters */}
      <View testID="category-filter" style={styles.categoryContainer}>
        <CategoryButton category="all" label="All" />
        <CategoryButton category="accommodation" label="Hotels" />
        <CategoryButton category="restaurant" label="Restaurants" />
        <CategoryButton category="entertainment" label="Entertainment" />
        <CategoryButton category="transport" label="Transport" />
        <CategoryButton category="shopping" label="Shopping" />
        <CategoryButton category="hardware" label="Hardware" />
      </View>

      {/* Places List */}
      <FlatList
        testID="places-list"
        data={filteredPlaces}
        renderItem={renderPlace}
        keyExtractor={(item) => item.id}
        style={styles.placesList}
      />


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


      {/* Edit Place Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View testID="edit-place-modal" style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Place</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Place name"
              value={editPlace.name}
              onChangeText={(text) => setEditPlace({...editPlace, name: text})}
            />

            <Text style={styles.categoryLabel}>Category:</Text>
            <View style={styles.categorySelector}>
              {['accommodation', 'restaurant', 'entertainment', 'transport', 'shopping', 'hardware'].map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categorySelectorButton,
                    editPlace.category === category && styles.categorySelectorButtonActive
                  ]}
                  onPress={() => setEditPlace({...editPlace, category: category as PlaceCategory})}
                >
                  <Text style={[
                    styles.categorySelectorButtonText,
                    editPlace.category === category && styles.categorySelectorButtonTextActive
                  ]}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Description (optional)"
              value={editPlace.description}
              onChangeText={(text) => setEditPlace({...editPlace, description: text})}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                testID="update-place-button"
                style={styles.saveButton}
                onPress={handleUpdatePlace}
              >
                <Text style={styles.saveButtonText}>Update</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowEditModal(false);
                  setEditingPlace(null);
                }}
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
    paddingTop: 16,
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
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  activeCategoryButton: {
    backgroundColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 12,
    color: '#333',
  },
  activeCategoryButtonText: {
    color: '#fff',
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
  placeHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  editButtonText: {
    fontSize: 14,
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
  // Edit modal styles
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  categorySelectorButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categorySelectorButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categorySelectorButtonText: {
    fontSize: 12,
    color: '#333',
  },
  categorySelectorButtonTextActive: {
    color: '#fff',
  },
});