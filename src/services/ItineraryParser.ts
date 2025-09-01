interface ItineraryEntry {
  time: string | null;
  type: string;
  location?: string;
  destination?: string;
  description: string;
}

interface DaySchedule {
  date: string;
  entries: ItineraryEntry[];
}

export class ItineraryParser {
  parseScheduleText(scheduleText: string): DaySchedule[] {
    const lines = scheduleText.trim().split('\n');
    const daySchedules: DaySchedule[] = [];
    let currentDay: DaySchedule | null = null;
    
    for (const line of lines) {
      const dateMatch = line.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      
      if (dateMatch) {
        // Save previous day if exists
        if (currentDay) {
          daySchedules.push(currentDay);
        }
        
        // Start new day
        const [, month, day, year] = dateMatch;
        const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        currentDay = {
          date,
          entries: []
        };
      } else if (line.startsWith('- ') && currentDay) {
        const description = line.substring(2);
        const entry: ItineraryEntry = {
          time: null,
          type: 'unknown',
          description
        };
        
        // Parse time
        const timeMatch = description.match(/(\d{1,2}:\d{2}[ap]m)/);
        if (timeMatch) {
          entry.time = timeMatch[1];
        }
        
        // Parse entry type and location/destination
        if (description.includes('Arrive air')) {
          entry.type = 'arrival';
          const locationMatch = description.match(/Arrive air (\w+)/);
          if (locationMatch) {
            entry.location = locationMatch[1];
          }
        } else if (description.includes('Subway to') || description.includes('Move to') || description.includes('Train to')) {
          entry.type = 'transport';
          const colonIndex = description.indexOf(':');
          if (colonIndex > -1) {
            entry.destination = description.substring(colonIndex + 2);
          }
        }
        
        currentDay.entries.push(entry);
      }
    }
    
    // Add final day
    if (currentDay) {
      daySchedules.push(currentDay);
    }
    
    return daySchedules;
  }
}