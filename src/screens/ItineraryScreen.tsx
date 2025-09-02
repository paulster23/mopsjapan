import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { ItineraryScreenService } from './services/ItineraryScreenService';

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
  const service = new ItineraryScreenService();

  useEffect(() => {
    loadItinerary();
  }, []);

  const loadItinerary = async () => {
    try {
      const parsedItinerary = await service.loadRealJapanScheduleForScreen();
      setItinerary(parsedItinerary);
    } catch (error) {
      console.error('Failed to load real Japan itinerary:', error);
      setItinerary([]);
    } finally {
      setLoading(false);
    }
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
          onPress: () => {
            const updatedItinerary = service.deleteEntry(itinerary, dayDate, entryIndex);
            setItinerary(updatedItinerary);
          }
        }
      ]
    );
  };

  const handleSaveEntry = (dayDate: string) => {
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
    setShowEntryModal(false);
    setEditingEntry(null);
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
            
            {day.entries.map((entry, entryIndex) => (
              <View key={entryIndex} style={styles.entryContainer}>
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
            ))}
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
});