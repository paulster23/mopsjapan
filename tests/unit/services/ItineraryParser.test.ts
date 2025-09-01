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
  });
});