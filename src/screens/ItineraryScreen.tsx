import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ItineraryScreenService } from './services/ItineraryScreenService';
import { DataPersistenceService } from '../services/DataPersistenceService';

interface DaySchedule {
  date: string;
  entries: Array<{
    time: string | null;
    type: string;
    location?: string;
    destination?: string;
    description: string;
  }>;
}

interface ItineraryEntry {
  time: string | null;
  type: string;
  location?: string;
  destination?: string;
  description: string;
}

export function ItineraryScreen() {
  const [itinerary, setItinerary] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<{
    dayIndex: number;
    entryIndex: number;
    entry: ItineraryEntry;
  } | null>(null);
  const [newEntry, setNewEntry] = useState<ItineraryEntry>({
    time: '',
    type: 'event',
    description: ''
  });
  const [currentStep, setCurrentStep] = useState<{ dayIndex: number; entryIndex: number; isToday: boolean; isUpcoming: boolean } | null>(null);
  const [nextStep, setNextStep] = useState<{ dayIndex: number; entryIndex: number } | null>(null);
  const service = new ItineraryScreenService();
  const persistenceService = new DataPersistenceService({
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
    removeItem: AsyncStorage.removeItem,
    clear: AsyncStorage.clear
  });

  useEffect(() => {
    loadItinerary();
  }, []);

  const loadItinerary = async () => {
    try {
      // First try to load from cache
      const cachedResult = await persistenceService.loadItinerary();
      if (cachedResult.success && cachedResult.data && cachedResult.data.length > 0) {
        setItinerary(cachedResult.data);
        updateCurrentAndNextSteps(cachedResult.data);
        setLoading(false);
        // Still load fresh data in background
        loadFreshItinerary();
        return;
      }

      // Load fresh data if no cache available
      await loadFreshItinerary();
    } catch (error) {
      console.error('Failed to load itinerary:', error);
      setItinerary([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFreshItinerary = async () => {
    try {
      const parsedItinerary = await service.loadRealJapanScheduleForScreen();
      if (parsedItinerary.length > 0) {
        setItinerary(parsedItinerary);
        // Update current and next steps
        updateCurrentAndNextSteps(parsedItinerary);
        // Cache the loaded data
        await persistenceService.saveItinerary(parsedItinerary);
      }
    } catch (error) {
      console.error('Failed to load fresh itinerary:', error);
    }
  };

  const updateCurrentAndNextSteps = (itineraryData: DaySchedule[]) => {
    const current = service.getCurrentStep(itineraryData);
    setCurrentStep(current);
    
    const next = service.getNextStep(itineraryData, current);
    setNextStep(next);
  };

  const handleAddEntry = (dayDate: string) => {
    setEditingEntry(null);
    setNewEntry({ time: '', type: 'event', description: '' });
    setShowEntryModal(true);
  };

  const handleEditEntry = (dayIndex: number, entryIndex: number, entry: ItineraryEntry) => {
    setEditingEntry({ dayIndex, entryIndex, entry: { ...entry } });
    setNewEntry({ ...entry });
    setShowEntryModal(true);
  };

  const handleDeleteEntry = (dayDate: string, entryIndex: number) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedItinerary = service.deleteEntry(itinerary, dayDate, entryIndex);
            setItinerary(updatedItinerary);
            updateCurrentAndNextSteps(updatedItinerary);
            // Persist changes
            await persistenceService.saveItinerary(updatedItinerary);
          }
        }
      ]
    );
  };

  const handleSaveEntry = async (dayDate: string) => {
    if (!newEntry.description.trim()) {
      Alert.alert('Error', 'Description is required');
      return;
    }

    let updatedItinerary;
    
    if (editingEntry) {
      // Update existing entry
      updatedItinerary = service.updateEntry(itinerary, dayDate, editingEntry.entryIndex, {
        ...newEntry,
        time: newEntry.time || null
      });
    } else {
      // Add new entry
      updatedItinerary = service.addEntry(itinerary, dayDate, {
        ...newEntry,
        time: newEntry.time || null
      });
    }
    
    setItinerary(updatedItinerary);
    updateCurrentAndNextSteps(updatedItinerary);
    setShowEntryModal(false);
    setEditingEntry(null);
    
    // Persist changes
    await persistenceService.saveItinerary(updatedItinerary);
  };

  const handleCancelEdit = () => {
    setShowEntryModal(false);
    setEditingEntry(null);
    setNewEntry({ time: '', type: 'event', description: '' });
  };

  if (loading) {
    return (
      <View style={styles.container} testID="itinerary-container">
        <Text style={styles.title}>Japan Trip Itinerary</Text>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (itinerary.length === 0) {
    return (
      <View style={styles.container} testID="itinerary-container">
        <Text style={styles.title}>Japan Trip Itinerary</Text>
        <Text>No itinerary loaded</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="itinerary-container">
      <View style={styles.header}>
        <Text style={styles.title}>Japan Trip Itinerary</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => setEditMode(!editMode)}
        >
          <Text style={styles.editButtonText}>
            {editMode ? '✅ Done' : '✏️ Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Current Activity and Next Up Sections */}
      {(currentStep || nextStep) && (
        <View style={styles.guidanceContainer}>
          {currentStep && (
            <View style={styles.currentActivityContainer}>
              <Text style={styles.guidanceTitle}>📍 {currentStep.isToday ? 'Current Activity' : 'Next Activity'}</Text>
              <View style={[styles.guidanceEntry, styles.currentEntry]}>
                <View style={styles.guidanceEntryHeader}>
                  {itinerary[currentStep.dayIndex].entries[currentStep.entryIndex].time && (
                    <Text style={styles.guidanceTime}>{itinerary[currentStep.dayIndex].entries[currentStep.entryIndex].time}</Text>
                  )}
                  <View style={[styles.guidanceTypeIndicator, { backgroundColor: service.getEntryTypeColor(itinerary[currentStep.dayIndex].entries[currentStep.entryIndex].type) }]} />
                  <Text style={styles.guidanceDate}>{service.formatDate(itinerary[currentStep.dayIndex].date)}</Text>
                </View>
                <Text style={styles.guidanceDescription}>
                  {itinerary[currentStep.dayIndex].entries[currentStep.entryIndex].description}
                </Text>
                {currentStep.isToday && currentStep.isUpcoming && (
                  <TouchableOpacity style={styles.navigateButton}>
                    <Text style={styles.navigateButtonText}>🗺️ Navigate Here</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {nextStep && !(currentStep && currentStep.dayIndex === nextStep.dayIndex && currentStep.entryIndex === nextStep.entryIndex) && (
            <View style={styles.nextUpContainer}>
              <Text style={styles.guidanceTitle}>⏭️ Next Up</Text>
              <View style={[styles.guidanceEntry, styles.nextEntry]}>
                <View style={styles.guidanceEntryHeader}>
                  {itinerary[nextStep.dayIndex].entries[nextStep.entryIndex].time && (
                    <Text style={styles.guidanceTime}>{itinerary[nextStep.dayIndex].entries[nextStep.entryIndex].time}</Text>
                  )}
                  <View style={[styles.guidanceTypeIndicator, { backgroundColor: service.getEntryTypeColor(itinerary[nextStep.dayIndex].entries[nextStep.entryIndex].type) }]} />
                  <Text style={styles.guidanceDate}>{service.formatDate(itinerary[nextStep.dayIndex].date)}</Text>
                </View>
                <Text style={styles.guidanceDescription}>
                  {service.truncateText(itinerary[nextStep.dayIndex].entries[nextStep.entryIndex].description, 80)}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
      
      <ScrollView style={styles.scrollContainer}>
        {itinerary.map((day, dayIndex) => (
          <View key={day.date} style={styles.dayContainer} testID={`day-container-${dayIndex}`}>
            <View style={styles.dayHeader}>
              <Text style={styles.dateTitle}>{service.formatDate(day.date)}</Text>
              {editMode && (
                <TouchableOpacity 
                  style={styles.addEntryButton}
                  onPress={() => handleAddEntry(day.date)}
                >
                  <Text style={styles.addEntryButtonText}>➕ Add Entry</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {day.entries.map((entry, entryIndex) => {
              const isCurrent = currentStep?.dayIndex === dayIndex && currentStep?.entryIndex === entryIndex;
              const isNext = nextStep?.dayIndex === dayIndex && nextStep?.entryIndex === entryIndex;
              
              return (
              <View key={entryIndex} style={[
                styles.entryContainer,
                isCurrent && styles.currentEntryContainer,
                isNext && !isCurrent && styles.nextEntryContainer
              ]}>
                <View style={styles.entryHeader}>
                  {entry.time && (
                    <Text style={styles.timeText}>{entry.time}</Text>
                  )}
                  <View style={[styles.typeIndicator, { backgroundColor: service.getEntryTypeColor(entry.type) }]} />
                  {editMode && (
                    <View style={styles.entryActions}>
                      <TouchableOpacity 
                        style={styles.editEntryButton}
                        onPress={() => handleEditEntry(dayIndex, entryIndex, entry)}
                      >
                        <Text style={styles.entryActionText}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.deleteEntryButton}
                        onPress={() => handleDeleteEntry(day.date, entryIndex)}
                      >
                        <Text style={styles.entryActionText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                
                <Text style={styles.entryDescription}>
                  {service.truncateText(entry.description, 100)}
                </Text>
              </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Edit Entry Modal */}
      <Modal
        visible={showEntryModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingEntry ? 'Edit Entry' : 'Add Entry'}
            </Text>
            <TouchableOpacity onPress={handleCancelEdit}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.fieldLabel}>Time (optional)</Text>
            <TextInput
              style={styles.textInput}
              value={newEntry.time || ''}
              onChangeText={(text) => setNewEntry({...newEntry, time: text})}
              placeholder="e.g., 2:30pm"
            />

            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.typeButtons}>
              {['arrival', 'transport', 'accommodation', 'event', 'departure'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    newEntry.type === type && styles.selectedTypeButton
                  ]}
                  onPress={() => setNewEntry({...newEntry, type})}
                >
                  <Text style={[
                    styles.typeButtonText,
                    newEntry.type === type && styles.selectedTypeButtonText
                  ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Description *</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={newEntry.description}
              onChangeText={(text) => setNewEntry({...newEntry, description: text})}
              placeholder="Enter description..."
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={() => {
                const targetDate = editingEntry 
                  ? itinerary[editingEntry.dayIndex].date 
                  : itinerary[0]?.date || '2025-09-09'; // Default date
                handleSaveEntry(targetDate);
              }}
            >
              <Text style={styles.saveButtonText}>Save Entry</Text>
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    position: 'absolute',
    right: 0,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  dayContainer: {
    marginBottom: 24,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  addEntryButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  addEntryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  entryContainer: {
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#ddd',
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginRight: 8,
  },
  typeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  entryActions: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: 8,
  },
  editEntryButton: {
    padding: 4,
  },
  deleteEntryButton: {
    padding: 4,
  },
  entryActionText: {
    fontSize: 16,
  },
  entryDescription: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  cancelButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedTypeButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  selectedTypeButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Navigation Guidance Styles
  guidanceContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  currentActivityContainer: {
    marginBottom: 12,
  },
  nextUpContainer: {
    marginBottom: 12,
  },
  guidanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  guidanceEntry: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  currentEntry: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  nextEntry: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  guidanceEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  guidanceTime: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginRight: 8,
  },
  guidanceDate: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  guidanceTypeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  guidanceDescription: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
    marginBottom: 8,
  },
  navigateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  navigateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  currentEntryContainer: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  nextEntryContainer: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    backgroundColor: '#FFF8E1',
  },
});