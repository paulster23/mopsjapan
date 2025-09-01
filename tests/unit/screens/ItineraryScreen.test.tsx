import { ItineraryScreenService } from '../../../src/screens/services/ItineraryScreenService';
import { ItineraryParser } from '../../../src/services/ItineraryParser';

describe('ItineraryScreenService', () => {
  describe('formatDate', () => {
    it('should format ISO date strings to readable format', () => {
      const service = new ItineraryScreenService();
      
      const result = service.formatDate('2025-09-09');
      
      expect(result).toBe('September 9, 2025');
    });

    it('should handle different dates correctly', () => {
      const service = new ItineraryScreenService();
      
      expect(service.formatDate('2025-09-15')).toBe('September 15, 2025');
      expect(service.formatDate('2025-12-25')).toBe('December 25, 2025');
    });
  });

  describe('getEntryTypeColor', () => {
    it('should return correct colors for different entry types', () => {
      const service = new ItineraryScreenService();
      
      expect(service.getEntryTypeColor('arrival')).toBe('#4CAF50');
      expect(service.getEntryTypeColor('transport')).toBe('#2196F3');
      expect(service.getEntryTypeColor('accommodation')).toBe('#FF9800');
      expect(service.getEntryTypeColor('event')).toBe('#9C27B0');
      expect(service.getEntryTypeColor('departure')).toBe('#F44336');
    });

    it('should return default color for unknown types', () => {
      const service = new ItineraryScreenService();
      
      expect(service.getEntryTypeColor('unknown')).toBe('#757575');
      expect(service.getEntryTypeColor('invalid')).toBe('#757575');
    });
  });

  describe('truncateText', () => {
    it('should truncate long text with ellipsis', () => {
      const service = new ItineraryScreenService();
      
      const longText = 'This is a very long text that should be truncated';
      const result = service.truncateText(longText, 20);
      
      expect(result).toBe('This is a very long...');
      expect(result.length).toBe(22); // 19 (trimmed) + '...'
    });

    it('should not truncate short text', () => {
      const service = new ItineraryScreenService();
      
      const shortText = 'Short text';
      const result = service.truncateText(shortText, 20);
      
      expect(result).toBe('Short text');
    });

    it('should handle exact length text', () => {
      const service = new ItineraryScreenService();
      
      const exactText = 'Exactly twenty chars';
      const result = service.truncateText(exactText, 20);
      
      expect(result).toBe('Exactly twenty chars');
    });
  });

  describe('loadScheduleData', () => {
    it('should parse schedule from file successfully', async () => {
      const service = new ItineraryScreenService();
      
      const mockScheduleText = `9/9/2025
- Arrive air HDN at 2:20pm local time
- Subway to apartment: COCO Nakameguro 202

9/15/2025  
- Nozomi Train to Tokyo
- Move to Hotel Fukudaya: 4 Chome-5-9 Aobadai`;

      const result = await service.parseScheduleText(mockScheduleText);
      
      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2025-09-09');
      expect(result[0].entries).toHaveLength(2);
      expect(result[1].date).toBe('2025-09-15');
      expect(result[1].entries).toHaveLength(2);
    });

    it('should handle empty schedule gracefully', async () => {
      const service = new ItineraryScreenService();
      
      const result = await service.parseScheduleText('');
      
      expect(result).toHaveLength(0);
    });
  });

  describe('validateItineraryData', () => {
    it('should validate correct itinerary structure', () => {
      const service = new ItineraryScreenService();
      
      const validItinerary = [
        {
          date: '2025-09-09',
          entries: [
            {
              time: '2:20pm',
              type: 'arrival',
              location: 'HDN',
              description: 'Arrive air HDN at 2:20pm local time'
            }
          ]
        }
      ];
      
      const result = service.validateItineraryData(validItinerary);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should identify invalid itinerary structure', () => {
      const service = new ItineraryScreenService();
      
      const invalidItinerary = [
        {
          date: 'invalid-date',
          entries: []
        }
      ];
      
      const result = service.validateItineraryData(invalidItinerary);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});