import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { ItineraryScreenService } from './services/ItineraryScreenService';
import * as fs from 'fs';
import * as path from 'path';

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

export function ItineraryScreen() {
  const [itinerary, setItinerary] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const service = new ItineraryScreenService();

  useEffect(() => {
    loadItinerary();
  }, []);

  const loadItinerary = async () => {
    try {
      const scheduleText = fs.readFileSync(
        path.join(process.cwd(), 'tests/fixtures/japan-schedule.txt'),
        'utf8'
      );
      
      const parsedItinerary = await service.parseScheduleText(scheduleText);
      setItinerary(parsedItinerary);
    } catch (error) {
      console.error('Failed to load itinerary:', error);
      setItinerary([]);
    } finally {
      setLoading(false);
    }
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
      <Text style={styles.title}>Japan Trip Itinerary</Text>
      
      <ScrollView style={styles.scrollContainer}>
        {itinerary.map((day, dayIndex) => (
          <View key={day.date} style={styles.dayContainer} testID={`day-container-${dayIndex}`}>
            <Text style={styles.dateTitle}>{service.formatDate(day.date)}</Text>
            
            {day.entries.map((entry, entryIndex) => (
              <View key={entryIndex} style={styles.entryContainer}>
                <View style={styles.entryHeader}>
                  {entry.time && (
                    <Text style={styles.timeText}>{entry.time}</Text>
                  )}
                  <View style={[styles.typeIndicator, { backgroundColor: service.getEntryTypeColor(entry.type) }]} />
                </View>
                
                <Text style={styles.entryDescription}>
                  {service.truncateText(entry.description, 100)}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
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
  scrollContainer: {
    flex: 1,
  },
  dayContainer: {
    marginBottom: 24,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
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
  },
  entryDescription: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});