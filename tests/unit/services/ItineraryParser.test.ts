import { ItineraryParser } from '../../../src/services/ItineraryParser';

describe('ItineraryParser', () => {
  describe('parseScheduleText', () => {
    it('should parse a single day schedule entry with date, time and location', () => {
      const scheduleText = `9/9/2025
- Arrive air HDN at 2:20pm local time
- Subway to apartment: COCO Nakameguro 202 Tokyo-to, Tokyo, Meguro-ku, Kami-Meguro 1-7-5-202, Japan`;

      const parser = new ItineraryParser();
      const result = parser.parseScheduleText(scheduleText);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: '2025-09-09',
        entries: [
          {
            time: '2:20pm',
            type: 'arrival',
            location: 'HDN',
            description: 'Arrive air HDN at 2:20pm local time'
          },
          {
            time: null,
            type: 'transport',
            destination: 'COCO Nakameguro 202 Tokyo-to, Tokyo, Meguro-ku, Kami-Meguro 1-7-5-202, Japan',
            description: 'Subway to apartment: COCO Nakameguro 202 Tokyo-to, Tokyo, Meguro-ku, Kami-Meguro 1-7-5-202, Japan'
          }
        ]
      });
    });

    it('should parse a different date correctly', () => {
      const scheduleText = `9/15/2025
- Nozomi Train to Tokyo
- Move to Hotel Fukudaya: 4 Chome-5-9 Aobadai, Meguro City, Tokyo 153-0042, Japan`;

      const parser = new ItineraryParser();
      const result = parser.parseScheduleText(scheduleText);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2025-09-15');
      expect(result[0].entries).toHaveLength(2);
    });

    it('should parse multiple days from full schedule', () => {
      const scheduleText = `9/9/2025
- Arrive air HDN at 2:20pm local time
- Subway to apartment: COCO Nakameguro 202 Tokyo-to, Tokyo, Meguro-ku, Kami-Meguro 1-7-5-202, Japan

9/15/2025
- Nozomi Train to Tokyo
- Move to Hotel Fukudaya: 4 Chome-5-9 Aobadai, Meguro City, Tokyo 153-0042, Japan`;

      const parser = new ItineraryParser();
      const result = parser.parseScheduleText(scheduleText);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2025-09-09');
      expect(result[0].entries).toHaveLength(2);
      expect(result[1].date).toBe('2025-09-15');
      expect(result[1].entries).toHaveLength(2);
    });

    it('should parse complete Japan schedule with all days and entries', () => {
      const fs = require('fs');
      const path = require('path');
      const scheduleText = fs.readFileSync(
        path.join(__dirname, '../../fixtures/japan-schedule.txt'), 
        'utf8'
      );

      const parser = new ItineraryParser();
      const result = parser.parseScheduleText(scheduleText);

      expect(result).toHaveLength(7);
      
      // Validate first day
      expect(result[0].date).toBe('2025-09-09');
      expect(result[0].entries[0].type).toBe('arrival');
      expect(result[0].entries[0].time).toBe('2:20pm');
      expect(result[0].entries[0].location).toBe('HDN');
      
      // Validate transport entries
      expect(result[0].entries[1].type).toBe('transport');
      expect(result[0].entries[1].destination).toBe('COCO Nakameguro 202 Tokyo-to, Tokyo, Meguro-ku, Kami-Meguro 1-7-5-202, Japan');
      
      // Validate Osaka day
      expect(result[1].date).toBe('2025-09-04');
      expect(result[1].entries[0].description).toBe('Nozomi Train to Osaka');
      
      // Validate final day
      expect(result[6].date).toBe('2025-09-18');
      expect(result[6].entries[1].time).toBe('6:30pm');
      expect(result[6].entries[1].description).toBe('Flight at 6:30pm');
    });
  });
});