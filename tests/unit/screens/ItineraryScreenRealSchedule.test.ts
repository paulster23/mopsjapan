import { ItineraryScreenService } from '../../../src/screens/services/ItineraryScreenService';

describe('ItineraryScreenService Real Schedule Integration', () => {
  describe('loadRealJapanScheduleForScreen', () => {
    it('should load real Japan schedule data and format it for screen display', async () => {
      const service = new ItineraryScreenService();
      
      // Test the new method that we need to implement
      const result = await service.loadRealJapanScheduleForScreen();
      
      expect(result).toHaveLength(6); // 6 main travel days
      
      // Verify 9/9/2025 entries are properly formatted
      expect(result[0].date).toBe('2025-09-09');
      expect(result[0].entries).toHaveLength(2);
      
      const arrivalEntry = result[0].entries[0];
      expect(arrivalEntry.type).toBe('arrival');
      expect(arrivalEntry.description).toContain('HDN');
      expect(arrivalEntry.description).toContain('2:20pm');
      
      const transportEntry = result[0].entries[1];
      expect(transportEntry.type).toBe('transport');
      expect(transportEntry.description).toContain('COCO Nakameguro');
      
      // Verify formatted date display
      const formattedDate = service.formatDate(result[0].date);
      expect(formattedDate).toBe('September 9, 2025');
      
      // Verify entry type colors are assigned correctly
      const arrivalColor = service.getEntryTypeColor(arrivalEntry.type);
      expect(arrivalColor).toBe('#4CAF50'); // Green for arrival
      
      const transportColor = service.getEntryTypeColor(transportEntry.type);
      expect(transportColor).toBe('#2196F3'); // Blue for transport
    });

    it('should include all real itinerary destinations with addresses', async () => {
      const service = new ItineraryScreenService();
      
      const result = await service.loadRealJapanScheduleForScreen();
      
      // Find all accommodation entries
      const accommodationEntries = result.flatMap(day => 
        day.entries.filter(entry => entry.type === 'accommodation')
      );
      
      // Should have at least 2 accommodation entries (Minoo Onsen, Hotel Fukudaya, AirBNB)
      expect(accommodationEntries.length).toBeGreaterThanOrEqual(2);
      
      // Check that addresses are preserved
      const hasMinooOnsen = result.some(day => 
        day.entries.some(entry => 
          entry.description.includes('Minoo Onsen') && 
          entry.description.includes('2 Chome-14-71')
        )
      );
      expect(hasMinooOnsen).toBe(true);
      
      const hasFukudaya = result.some(day => 
        day.entries.some(entry => 
          entry.description.includes('Hotel Fukudaya') && 
          entry.description.includes('4 Chome-5-9 Aobadai')
        )
      );
      expect(hasFukudaya).toBe(true);
    });

    it('should include both Faraquet show events', async () => {
      const service = new ItineraryScreenService();
      
      const result = await service.loadRealJapanScheduleForScreen();
      
      // Find all event entries
      const eventEntries = result.flatMap(day => 
        day.entries.filter(entry => entry.type === 'event')
      );
      
      // Should have 2 Faraquet shows
      expect(eventEntries).toHaveLength(2);
      
      // Check for Conpass show (9/13)
      const conpassShow = eventEntries.find(entry => 
        entry.description.includes('Conpass')
      );
      expect(conpassShow).toBeDefined();
      expect(conpassShow?.description).toContain('Higashishinsaibashi');
      
      // Check for Fever show (9/16)  
      const feverShow = eventEntries.find(entry => 
        entry.description.includes('Fever')
      );
      expect(feverShow).toBeDefined();
      expect(feverShow?.description).toContain('Hanegi');
    });

    it('should handle loading errors gracefully', async () => {
      const service = new ItineraryScreenService();
      
      // Mock the parser to throw an error
      const originalLoadMethod = service['parser'].loadRealJapanSchedule;
      service['parser'].loadRealJapanSchedule = jest.fn().mockRejectedValue(
        new Error('Failed to load schedule')
      );
      
      const result = await service.loadRealJapanScheduleForScreen();
      
      // Should return empty array on error
      expect(result).toEqual([]);
      
      // Restore original method
      service['parser'].loadRealJapanSchedule = originalLoadMethod;
    });

    it('should validate real itinerary data structure', async () => {
      const service = new ItineraryScreenService();
      
      const result = await service.loadRealJapanScheduleForScreen();
      
      // Validate using existing validation method
      const validation = service.validateItineraryData(result);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      
      // Verify all entries have required fields
      result.forEach(day => {
        expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Array.isArray(day.entries)).toBe(true);
        
        day.entries.forEach(entry => {
          expect(typeof entry.description).toBe('string');
          expect(entry.description.trim()).not.toBe('');
          expect(typeof entry.type).toBe('string');
          expect(['arrival', 'transport', 'accommodation', 'event', 'departure']).toContain(entry.type);
        });
      });
    });
  });
});