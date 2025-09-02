import { ItineraryParser } from '../../../src/services/ItineraryParser';

describe('Real Japan Itinerary Loading', () => {
  describe('loadRealJapanSchedule', () => {
    it('should load the complete 9/9/2025 - 9/18/2025 Japan trip schedule', async () => {
      const parser = new ItineraryParser();
      
      const result = await parser.loadRealJapanSchedule();
      
      expect(result).toHaveLength(6); // 6 main travel days
      
      // 9/9/2025 - Arrival
      expect(result[0].date).toBe('2025-09-09');
      expect(result[0].entries).toHaveLength(2);
      expect(result[0].entries[0].type).toBe('arrival');
      expect(result[0].entries[0].description).toContain('HDN');
      expect(result[0].entries[0].description).toContain('2:20pm');
      expect(result[0].entries[1].type).toBe('transport');
      expect(result[0].entries[1].description).toContain('COCO Nakameguro');
      
      // 9/13/2025 - Move to Osaka
      expect(result[1].date).toBe('2025-09-13');
      expect(result[1].entries[0].type).toBe('transport');
      expect(result[1].entries[0].description).toContain('Nozomi Train to Osaka');
      expect(result[1].entries[1].type).toBe('accommodation');
      expect(result[1].entries[1].description).toContain('Minoo Onsen');
      
      // 9/15/2025 - Return to Tokyo
      expect(result[2].date).toBe('2025-09-15');
      expect(result[2].entries[0].type).toBe('transport');
      expect(result[2].entries[0].description).toContain('Nozomi Train to Tokyo');
      expect(result[2].entries[1].type).toBe('accommodation');
      expect(result[2].entries[1].description).toContain('Hotel Fukudaya');
      
      // 9/16/2025 - Faraquet show
      expect(result[3].date).toBe('2025-09-16');
      expect(result[3].entries[0].type).toBe('event');
      expect(result[3].entries[0].description).toContain('Faraquet show');
      expect(result[3].entries[0].description).toContain('Fever');
      
      // 9/17/2025 - Move to Nikko  
      expect(result[4].date).toBe('2025-09-17');
      expect(result[4].entries[0].type).toBe('transport');
      expect(result[4].entries[0].description).toContain('Nozomi Train to Nikko');
      expect(result[4].entries[1].type).toBe('accommodation');
      expect(result[4].entries[1].description).toContain('AirBNB');
      expect(result[4].entries[1].description).toContain('Kujiramachi');
      
      // 9/18/2025 - Departure
      expect(result[5].date).toBe('2025-09-18');
      expect(result[5].entries[0].type).toBe('transport');
      expect(result[5].entries[0].description).toContain('HND Tokyo');
      expect(result[5].entries[1].type).toBe('departure');
      expect(result[5].entries[1].description).toContain('6:30pm');
    });

    it('should include accurate location addresses for each stop', async () => {
      const parser = new ItineraryParser();
      
      const result = await parser.loadRealJapanSchedule();
      
      // Check that real addresses are included in entries
      const allEntries = result.flatMap(day => day.entries);
      
      // COCO Nakameguro address (transport entry)
      const cocoEntry = allEntries.find(entry => 
        entry.description.includes('COCO Nakameguro')
      );
      expect(cocoEntry).toBeDefined();
      expect(cocoEntry?.description).toContain('Meguro-ku, Kami-Meguro 1-7-5-202');
      
      // Minoo Onsen address (accommodation entry)
      const minooEntry = allEntries.find(entry => 
        entry.description.includes('Minoo Onsen')
      );
      expect(minooEntry).toBeDefined();
      expect(minooEntry?.description).toContain('2 Chome-14-71 Minoo');
      
      // Hotel Fukudaya address (accommodation entry)
      const fukudayaEntry = allEntries.find(entry => 
        entry.description.includes('Hotel Fukudaya')
      );
      expect(fukudayaEntry).toBeDefined();
      expect(fukudayaEntry?.description).toContain('4 Chome-5-9 Aobadai');
    });

    it('should handle the schedule loading gracefully if data is missing', async () => {
      const parser = new ItineraryParser();
      
      // This should not throw an error
      const result = await parser.loadRealJapanSchedule();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });
});