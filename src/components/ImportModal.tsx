import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ActivityIndicator,
  ScrollView 
} from 'react-native';
import { MyMapsImportService } from '../services/MyMapsImportService';
import { NetlifyApiService } from '../services/NetlifyApiService';
import { MapsListImportService } from '../services/MapsListImportService';
import { MapsListApiService } from '../services/MapsListApiService';
import { Place } from '../services/GooglePlacesService';

interface ImportModalProps {
  visible: boolean;
  onClose: () => void;
  onImportComplete: (places: Place[]) => void;
  netlifyBaseUrl?: string;
}

interface ImportPreviewData {
  places: Place[];
  id: string;
  fetchedAt: string;
  type: 'mymaps' | 'mapslist';
}

type ImportType = 'mymaps' | 'mapslist';

export function ImportModal({
  visible,
  onClose,
  onImportComplete,
  netlifyBaseUrl = 'http://localhost:8888'
}: ImportModalProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [importType, setImportType] = useState<ImportType>('mymaps');

  const myMapsImportService = new MyMapsImportService();
  const myMapsApiService = new NetlifyApiService(netlifyBaseUrl);
  const mapsListImportService = new MapsListImportService();
  const mapsListApiService = new MapsListApiService(netlifyBaseUrl);

  const detectImportType = (url: string): ImportType => {
    // Check if it's a My Maps URL (contains /viewer or /edit and mid parameter)
    if (url.includes('/viewer') || url.includes('/edit') || url.includes('mid=')) {
      return 'mymaps';
    }
    // Check if it's a Maps List URL (contains 1s parameter)
    if (url.includes('1s')) {
      return 'mapslist';
    }
    // Default to My Maps for backwards compatibility
    return 'mymaps';
  };

  const handleFetchPlaces = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a Google Maps URL');
      return;
    }

    setLoading(true);
    try {
      const detectedType = detectImportType(url);
      setImportType(detectedType);

      let places: Place[];
      let id: string;
      let fetchedAt: string;

      if (detectedType === 'mymaps') {
        // Handle My Maps import
        const mapId = myMapsImportService.extractMapIdFromUrl(url);
        const response = await myMapsApiService.fetchMyMapsKML(mapId);
        
        if (!response.success || !response.kmlContent) {
          throw new Error(response.error || 'Failed to fetch My Maps data');
        }
        
        places = myMapsImportService.parseKMLToPlaces(response.kmlContent);
        id = response.mapId || mapId;
        fetchedAt = response.fetchedAt || new Date().toISOString();
      } else {
        // Handle Maps List import
        const listId = mapsListImportService.extractListIdFromUrl(url);
        const response = await mapsListApiService.fetchMapsList(listId);
        
        if (!response.success || !response.listData) {
          throw new Error(response.error || 'Failed to fetch Maps List data');
        }
        
        places = mapsListImportService.parseGoogleListJson(response.listData);
        id = response.listId || listId;
        fetchedAt = response.fetchedAt || new Date().toISOString();
      }
      
      if (places.length === 0) {
        Alert.alert('Info', `No places found in this ${detectedType === 'mymaps' ? 'My Maps' : 'Maps List'}. Make sure it contains location markers.`);
        return;
      }
      
      setPreviewData({
        places,
        id,
        fetchedAt,
        type: detectedType
      });
      
      // Select all places by default
      setSelectedPlaces(new Set(places.map(p => p.id)));
      setStep('preview');
      
    } catch (error) {
      Alert.alert(
        'Import Error', 
        error instanceof Error ? error.message : 'Failed to import places'
      );
    } finally {
      setLoading(false);
    }
  };

  const togglePlaceSelection = (placeId: string) => {
    const newSelected = new Set(selectedPlaces);
    if (newSelected.has(placeId)) {
      newSelected.delete(placeId);
    } else {
      newSelected.add(placeId);
    }
    setSelectedPlaces(newSelected);
  };

  const handleImport = () => {
    if (!previewData || selectedPlaces.size === 0) {
      Alert.alert('Error', 'Please select at least one place to import');
      return;
    }
    
    const placesToImport = previewData.places.filter(place => 
      selectedPlaces.has(place.id)
    );
    
    onImportComplete(placesToImport);
    handleClose();
  };

  const handleClose = () => {
    setUrl('');
    setPreviewData(null);
    setSelectedPlaces(new Set());
    setStep('input');
    setImportType('mymaps');
    onClose();
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  const getImportTypeDisplayName = () => {
    return importType === 'mymaps' ? 'My Maps' : 'Maps List';
  };

  const getPlaceholderText = () => {
    return importType === 'mymaps' 
      ? 'https://www.google.com/maps/d/viewer?mid=...'
      : 'https://www.google.com/maps/@lat,lng,zoom/data=...1s...';
  };

  const getHelpText = () => {
    return importType === 'mymaps'
      ? 'Paste the share URL from your Google My Maps. Make sure the map is publicly accessible.'
      : 'Paste the share URL from your Google Maps List. The app will automatically detect the type.';
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {step === 'input' ? 'Import from Google Maps' : `Select Places from ${getImportTypeDisplayName()}`}
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {step === 'input' && (
          <View style={styles.inputSection}>
            <Text style={styles.label}>Google Maps URL:</Text>
            <TextInput
              style={styles.textInput}
              value={url}
              onChangeText={setUrl}
              placeholder={getPlaceholderText()}
              multiline
              testID="maps-url-input"
            />
            
            <Text style={styles.helpText}>
              {getHelpText()}
            </Text>

            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]} 
              onPress={handleFetchPlaces}
              disabled={loading}
              testID="fetch-places-button"
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Fetch Places</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {step === 'preview' && previewData && (
          <View style={styles.previewSection}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewInfo}>
                Found {previewData.places.length} places from {getImportTypeDisplayName()}
              </Text>
              <Text style={styles.previewDate}>
                Fetched: {formatDate(previewData.fetchedAt)}
              </Text>
            </View>

            <ScrollView style={styles.placesList}>
              {previewData.places.map((place) => (
                <TouchableOpacity
                  key={place.id}
                  style={[
                    styles.placeItem,
                    selectedPlaces.has(place.id) && styles.placeItemSelected
                  ]}
                  onPress={() => togglePlaceSelection(place.id)}
                  testID={`place-item-${place.id}`}
                >
                  <View style={styles.placeHeader}>
                    <Text style={styles.placeName}>{place.name}</Text>
                    <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(place.category) }]}>
                      <Text style={styles.categoryText}>{place.category}</Text>
                    </View>
                  </View>
                  <Text style={styles.placeCity}>{place.city}</Text>
                  {place.description && (
                    <Text style={styles.placeDescription}>{place.description}</Text>
                  )}
                  <View style={styles.checkbox}>
                    {selectedPlaces.has(place.id) ? '☑️' : '☐'}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton]} 
                onPress={() => setStep('input')}
              >
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]} 
                onPress={handleImport}
                testID="import-selected-button"
              >
                <Text style={styles.buttonText}>
                  Import Selected ({selectedPlaces.size})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

function getCategoryColor(category: string): string {
  const colors = {
    accommodation: '#FF9800',
    restaurant: '#4CAF50', 
    entertainment: '#9C27B0',
    transport: '#2196F3',
    shopping: '#FF5722'
  };
  return colors[category as keyof typeof colors] || '#757575';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  inputSection: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  previewSection: {
    flex: 1,
  },
  previewHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  previewInfo: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  placesList: {
    flex: 1,
  },
  placeItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    position: 'relative',
  },
  placeItemSelected: {
    backgroundColor: '#f0f8ff',
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
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  placeCity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  placeDescription: {
    fontSize: 14,
    color: '#333',
  },
  checkbox: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -10 }],
    fontSize: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
});