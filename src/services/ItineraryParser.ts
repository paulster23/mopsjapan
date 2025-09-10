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
  async loadRealJapanSchedule(): Promise<DaySchedule[]> {
    try {
      // Use React Native asset loading instead of Node.js fs
      const scheduleText = `9/9/2025
- Arrive air HDN at 2:20pm local time
- Subway to apartment: COCO Nakameguro 202 Tokyo-to, Tokyo, Meguro-ku, Kami-Meguro 1-7-5-202, Japan

9/11/2025
- Nozomi Train to Osaka 
- Stay at Minoo Onsen: 2 Chome-14-71 Minoo, Minoh, Osaka 562-0001, Japan

9/13/2025
- Move to 1 Chome-11-2 Nipponbashi, Chuo Ward, Osaka, 542-0073, Japan
- See Faraquet show at Conpass: 542-0083 Osaka, Chuo Ward, Higashishinsaibashi, 1 Chome−12−20

9/15/2025
- Nozomi Train to Tokyo
- Move to Hotel Fukudaya: 4 Chome-5-9 Aobadai, Meguro City, Tokyo 153-0042, Japan

9/16/2025
- See Faraquet show at Fever: Japan, 〒156-0042 Tokyo, Setagaya City, Hanegi, 1 Chome−1−14 新代田ビル 1F

9/17/2025
- Nozomi Train to Nikko
- Move to AirBNB: 88-25 Kujiramachi, Nikko, Tochigi 321-1436, Japan

9/18/2025
- Trains to HND Tokyo
- Flight at 6:30pm`;
      
      return this.parseScheduleText(scheduleText);
    } catch (error) {
      console.error('Failed to load real Japan schedule:', error);
      return [];
    }
  }

  parseScheduleText(scheduleText: string): DaySchedule[] {
    const lines = scheduleText.trim().split('\n');
    const daySchedules: DaySchedule[] = [];
    let currentDay: DaySchedule | null = null;
    
    for (const line of lines) {
      // Try full date format first (M/D/YYYY)
      let dateMatch = line.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      // Then try short format (M/D) and assume 2025
      if (!dateMatch) {
        dateMatch = line.match(/^(\d{1,2})\/(\d{1,2})$/);
      }
      
      if (dateMatch) {
        // Save previous day if exists
        if (currentDay) {
          daySchedules.push(currentDay);
        }
        
        // Start new day
        const [, month, day, year = '2025'] = dateMatch;
        const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        currentDay = {
          date,
          entries: []
        };
      } else if (line.startsWith('- ') && currentDay) {
        const description = line.substring(2).trim();
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
        } else if (description.includes('Subway to') || description.includes('Trains to') || description.includes('Nozomi Train')) {
          entry.type = 'transport';
          const colonIndex = description.indexOf(':');
          if (colonIndex > -1) {
            entry.destination = description.substring(colonIndex + 2);
          }
        } else if (description.includes('Move to')) {
          entry.type = 'accommodation';
          const colonIndex = description.indexOf(':');
          if (colonIndex > -1) {
            entry.destination = description.substring(colonIndex + 2);
          }
        } else if (description.includes('See ') || description.includes('show at')) {
          entry.type = 'event';
          const colonIndex = description.indexOf(':');
          if (colonIndex > -1) {
            entry.destination = description.substring(colonIndex + 2);
          }
        } else if (description.includes('Stay at')) {
          entry.type = 'accommodation';
          const colonIndex = description.indexOf(':');
          if (colonIndex > -1) {
            entry.destination = description.substring(colonIndex + 2);
          }
        } else if (description.includes('Flight at')) {
          entry.type = 'departure';
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