import { ItineraryParser } from '../../services/ItineraryParser';

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

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ItineraryScreenService {
  private parser: ItineraryParser;

  constructor() {
    this.parser = new ItineraryParser();
  }

  formatDate(dateStr: string): string {
    // Parse date components directly to avoid timezone issues
    const [year, month, day] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getEntryTypeColor(type: string): string {
    const colors = {
      arrival: '#4CAF50',
      transport: '#2196F3',
      accommodation: '#FF9800',
      event: '#9C27B0',
      departure: '#F44336'
    };
    return colors[type as keyof typeof colors] || '#757575';
  }

  truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength).trim() + '...';
  }

  async parseScheduleText(scheduleText: string): Promise<DaySchedule[]> {
    if (!scheduleText.trim()) {
      return [];
    }
    
    return this.parser.parseScheduleText(scheduleText);
  }

  async loadRealJapanScheduleForScreen(): Promise<DaySchedule[]> {
    try {
      return await this.parser.loadRealJapanSchedule();
    } catch (error) {
      console.error('Failed to load real Japan schedule for screen:', error);
      return [];
    }
  }

  validateItineraryData(itinerary: DaySchedule[]): ValidationResult {
    const errors: string[] = [];

    for (const day of itinerary) {
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(day.date)) {
        errors.push(`Invalid date format: ${day.date}`);
      }

      // Validate entries array exists
      if (!Array.isArray(day.entries)) {
        errors.push(`Entries must be an array for date: ${day.date}`);
        continue;
      }

      // Validate each entry
      for (let i = 0; i < day.entries.length; i++) {
        const entry = day.entries[i];
        
        if (!entry.description || typeof entry.description !== 'string') {
          errors.push(`Entry ${i} on ${day.date} missing or invalid description`);
        }

        if (!entry.type || typeof entry.type !== 'string') {
          errors.push(`Entry ${i} on ${day.date} missing or invalid type`);
        }

        if (entry.time !== null && typeof entry.time !== 'string') {
          errors.push(`Entry ${i} on ${day.date} has invalid time format`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  getDayCount(itinerary: DaySchedule[]): number {
    return itinerary.length;
  }

  getEntryCount(itinerary: DaySchedule[]): number {
    return itinerary.reduce((total, day) => total + day.entries.length, 0);
  }

  getEntriesByType(itinerary: DaySchedule[], type: string): Array<{ day: string; entry: DaySchedule['entries'][0] }> {
    const matchingEntries: Array<{ day: string; entry: DaySchedule['entries'][0] }> = [];
    
    for (const day of itinerary) {
      for (const entry of day.entries) {
        if (entry.type === type) {
          matchingEntries.push({ day: day.date, entry });
        }
      }
    }
    
    return matchingEntries;
  }

  addEntry(itinerary: DaySchedule[], dateStr: string, newEntry: DaySchedule['entries'][0]): DaySchedule[] {
    const updatedItinerary = [...itinerary];
    
    // Find existing day
    const dayIndex = updatedItinerary.findIndex(day => day.date === dateStr);
    
    if (dayIndex >= 0) {
      // Add to existing day
      updatedItinerary[dayIndex] = {
        ...updatedItinerary[dayIndex],
        entries: [...updatedItinerary[dayIndex].entries, newEntry]
      };
    } else {
      // Create new day
      const newDay: DaySchedule = {
        date: dateStr,
        entries: [newEntry]
      };
      updatedItinerary.push(newDay);
      
      // Sort chronologically
      updatedItinerary.sort((a, b) => a.date.localeCompare(b.date));
    }
    
    return updatedItinerary;
  }

  updateEntry(itinerary: DaySchedule[], dateStr: string, entryIndex: number, updatedEntry: DaySchedule['entries'][0]): DaySchedule[] {
    const updatedItinerary = [...itinerary];
    
    const dayIndex = updatedItinerary.findIndex(day => day.date === dateStr);
    
    if (dayIndex >= 0 && entryIndex < updatedItinerary[dayIndex].entries.length) {
      const updatedEntries = [...updatedItinerary[dayIndex].entries];
      updatedEntries[entryIndex] = updatedEntry;
      
      updatedItinerary[dayIndex] = {
        ...updatedItinerary[dayIndex],
        entries: updatedEntries
      };
    }
    
    return updatedItinerary;
  }

  deleteEntry(itinerary: DaySchedule[], dateStr: string, entryIndex: number): DaySchedule[] {
    const updatedItinerary = [...itinerary];
    
    const dayIndex = updatedItinerary.findIndex(day => day.date === dateStr);
    
    if (dayIndex >= 0 && entryIndex < updatedItinerary[dayIndex].entries.length) {
      const updatedEntries = [...updatedItinerary[dayIndex].entries];
      updatedEntries.splice(entryIndex, 1);
      
      updatedItinerary[dayIndex] = {
        ...updatedItinerary[dayIndex],
        entries: updatedEntries
      };
    }
    
    return updatedItinerary;
  }

  addDay(itinerary: DaySchedule[], dateStr: string): DaySchedule[] {
    const updatedItinerary = [...itinerary];
    
    // Check if day already exists
    const existingDayIndex = updatedItinerary.findIndex(day => day.date === dateStr);
    
    if (existingDayIndex >= 0) {
      return updatedItinerary; // Day already exists, return unchanged
    }
    
    const newDay: DaySchedule = {
      date: dateStr,
      entries: []
    };
    
    updatedItinerary.push(newDay);
    
    // Sort chronologically
    updatedItinerary.sort((a, b) => a.date.localeCompare(b.date));
    
    return updatedItinerary;
  }
}