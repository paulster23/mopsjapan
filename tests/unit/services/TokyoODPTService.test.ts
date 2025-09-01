import { TokyoODPTService } from '../../../src/services/TokyoODPTService';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('TokyoODPTService', () => {
  let service: TokyoODPTService;
  
  beforeEach(() => {
    service = new TokyoODPTService();
    jest.clearAllMocks();
  });

  describe('getRealtimeTrainInfo', () => {
    it('should fetch real-time train information for a station', async () => {
      const mockResponse = {
        '@context': 'https://vocab.odpt.org/context_odpt.jsonld',
        '@type': 'odpt:Train',
        'odpt:railway': 'odpt.Railway:JR-East.Yamanote',
        'odpt:trainNumber': '1234K',
        'odpt:trainType': 'odpt.TrainType:JR-East.Local',
        'odpt:delay': 2,
        'odpt:fromStation': 'odpt.Station:JR-East.Yamanote.Tokyo',
        'odpt:toStation': 'odpt.Station:JR-East.Yamanote.Yurakucho',
        'dc:date': '2025-09-09T10:30:00+09:00'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [mockResponse]
      });

      const result = await service.getRealtimeTrainInfo('JR-East.Yamanote', 'Tokyo');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].trainNumber).toBe('1234K');
      expect(result.data![0].delay).toBe(2);
      expect(result.data![0].fromStation).toBe('Tokyo');
      expect(result.data![0].toStation).toBe('Yurakucho');
    });

    it('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await service.getRealtimeTrainInfo('Invalid.Line', 'NonExistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API request failed: 404 Not Found');
      expect(result.data).toBeUndefined();
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getRealtimeTrainInfo('JR-East.Yamanote', 'Tokyo');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error: Network error');
      expect(result.data).toBeUndefined();
    });

    it('should handle empty response data', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => []
      });

      const result = await service.getRealtimeTrainInfo('JR-East.Yamanote', 'Tokyo');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('getStationTimetable', () => {
    it('should fetch station timetable information', async () => {
      const mockResponse = {
        '@context': 'https://vocab.odpt.org/context_odpt.jsonld',
        '@type': 'odpt:StationTimetable',
        'odpt:station': 'odpt.Station:JR-East.Yamanote.Tokyo',
        'odpt:railway': 'odpt.Railway:JR-East.Yamanote',
        'odpt:stationTimetableObject': [{
          'odpt:departureTime': '10:30',
          'odpt:destinationStation': ['odpt.Station:JR-East.Yamanote.Shinbashi'],
          'odpt:trainType': 'odpt.TrainType:JR-East.Local'
        }]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [mockResponse]
      });

      const result = await service.getStationTimetable('JR-East.Yamanote', 'Tokyo');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.station).toBe('Tokyo');
      expect(result.data!.railway).toBe('JR-East.Yamanote');
      expect(result.data!.departures).toHaveLength(1);
      expect(result.data!.departures[0].time).toBe('10:30');
    });

    it('should handle timetable API errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const result = await service.getStationTimetable('JR-East.Yamanote', 'Tokyo');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API request failed: 500 Internal Server Error');
    });
  });

  describe('getRailwayStatus', () => {
    it('should fetch railway line status information', async () => {
      const mockResponse = {
        '@context': 'https://vocab.odpt.org/context_odpt.jsonld',
        '@type': 'odpt:RailwayFare',
        'odpt:operator': 'odpt.Operator:JR-East',
        'odpt:railway': 'odpt.Railway:JR-East.Yamanote',
        'odpt:trainInformationStatus': 'odpt.TrainInformationStatus:NormalService',
        'odpt:trainInformationText': '平常運行',
        'dc:date': '2025-09-09T10:30:00+09:00'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [mockResponse]
      });

      const result = await service.getRailwayStatus('JR-East.Yamanote');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.railway).toBe('JR-East.Yamanote');
      expect(result.data!.status).toBe('NormalService');
      expect(result.data!.statusText).toBe('平常運行');
    });

    it('should handle railway status errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('API timeout'));

      const result = await service.getRailwayStatus('JR-East.Yamanote');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error: API timeout');
    });
  });

  describe('searchStations', () => {
    it('should search for stations by name', async () => {
      const mockResponse = [
        {
          '@context': 'https://vocab.odpt.org/context_odpt.jsonld',
          '@type': 'odpt:Station',
          'owl:sameAs': 'odpt.Station:JR-East.Yamanote.Tokyo',
          'dc:title': 'Tokyo',
          'odpt:railway': 'odpt.Railway:JR-East.Yamanote',
          'geo:lat': 35.6812,
          'geo:long': 139.7671
        },
        {
          '@context': 'https://vocab.odpt.org/context_odpt.jsonld',
          '@type': 'odpt:Station',
          'owl:sameAs': 'odpt.Station:TokyoMetro.Marunouchi.Tokyo',
          'dc:title': 'Tokyo',
          'odpt:railway': 'odpt.Railway:TokyoMetro.Marunouchi',
          'geo:lat': 35.6812,
          'geo:long': 139.7671
        }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const result = await service.searchStations('Tokyo');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].name).toBe('Tokyo');
      expect(result.data![0].railway).toBe('JR-East.Yamanote');
      expect(result.data![1].railway).toBe('TokyoMetro.Marunouchi');
    });
  });

  describe('API rate limiting', () => {
    it('should handle rate limiting with retry logic', async () => {
      // First call returns rate limit error
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests'
        })
        // Second call succeeds
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => []
        });

      const result = await service.getRealtimeTrainInfo('JR-East.Yamanote', 'Tokyo');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it('should give up after max retries', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      });

      const result = await service.getRealtimeTrainInfo('JR-East.Yamanote', 'Tokyo');

      expect(fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(result.success).toBe(false);
      expect(result.error).toBe('API request failed: 429 Too Many Requests');
    });
  });

  describe('caching', () => {
    it('should cache successful responses to reduce API calls', async () => {
      const mockResponse = [{
        '@type': 'odpt:Train',
        'odpt:trainNumber': '1234K',
        'odpt:delay': 0
      }];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      // First call should hit API
      const result1 = await service.getRealtimeTrainInfo('JR-East.Yamanote', 'Tokyo');
      expect(result1.success).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second call within cache window should use cache
      const result2 = await service.getRealtimeTrainInfo('JR-East.Yamanote', 'Tokyo');
      expect(result2.success).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(1); // No additional API call
    });
  });

  describe('data transformation', () => {
    it('should transform ODPT station IDs to readable names', () => {
      const transformed = service.transformStationId('odpt.Station:JR-East.Yamanote.Tokyo');
      expect(transformed).toBe('Tokyo');
    });

    it('should transform railway IDs to readable names', () => {
      const transformed = service.transformRailwayId('odpt.Railway:JR-East.Yamanote');
      expect(transformed).toBe('JR-East.Yamanote');
    });

    it('should handle malformed IDs gracefully', () => {
      const transformed1 = service.transformStationId('invalid-id');
      const transformed2 = service.transformRailwayId('');
      
      expect(transformed1).toBe('invalid-id');
      expect(transformed2).toBe('');
    });
  });
});