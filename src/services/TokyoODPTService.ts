export interface RealtimeTrainInfo {
  trainNumber: string;
  trainType: string;
  delay: number;
  fromStation: string;
  toStation: string;
  timestamp: string;
}

export interface StationTimetable {
  station: string;
  railway: string;
  departures: {
    time: string;
    destination: string[];
    trainType: string;
  }[];
}

export interface RailwayStatus {
  railway: string;
  operator: string;
  status: string;
  statusText: string;
  timestamp: string;
}

export interface StationInfo {
  id: string;
  name: string;
  railway: string;
  latitude: number;
  longitude: number;
}

export interface ODPTResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class TokyoODPTService {
  private readonly baseUrl = 'https://api.odpt.org/api/v4';
  private readonly consumerKey = process.env.ODPT_API_KEY || 'demo';
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly cacheTimeoutMs = 30000; // 30 seconds
  private readonly maxRetries = 2;
  private readonly retryDelayMs = 1000;

  async getRealtimeTrainInfo(railway: string, station: string): Promise<ODPTResponse<RealtimeTrainInfo[]>> {
    const cacheKey = `train-${railway}-${station}`;
    
    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    const url = `${this.baseUrl}/odpt:Train`;
    const params = new URLSearchParams({
      'acl:consumerKey': this.consumerKey,
      'odpt:railway': `odpt.Railway:${railway}`,
      'odpt:fromStation': `odpt.Station:${railway}.${station}`
    });

    try {
      const response = await this.fetchWithRetry(`${url}?${params.toString()}`);
      
      // Handle network error (null response)
      if (!response) {
        return {
          success: false,
          error: 'Network error: Network error'
        };
      }
      
      if (!response.ok) {
        return {
          success: false,
          error: `API request failed: ${response.status} ${response.statusText}`
        };
      }

      const rawData = await response.json();
      const transformedData = this.transformTrainData(rawData);
      
      // Cache successful response
      this.setCachedData(cacheKey, transformedData);
      
      return { success: true, data: transformedData };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${(error as Error).message}`
      };
    }
  }

  async getStationTimetable(railway: string, station: string): Promise<ODPTResponse<StationTimetable>> {
    const url = `${this.baseUrl}/odpt:StationTimetable`;
    const params = new URLSearchParams({
      'acl:consumerKey': this.consumerKey,
      'odpt:railway': `odpt.Railway:${railway}`,
      'odpt:station': `odpt.Station:${railway}.${station}`
    });

    try {
      const response = await this.fetchWithRetry(`${url}?${params.toString()}`);
      
      if (!response || !response.ok) {
        return {
          success: false,
          error: `API request failed: ${response?.status || 'Unknown'} ${response?.statusText || 'Network Error'}`
        };
      }

      const rawData = await response.json();
      const transformedData = this.transformTimetableData(rawData[0], railway, station);
      
      return { success: true, data: transformedData };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${(error as Error).message}`
      };
    }
  }

  async getRailwayStatus(railway: string): Promise<ODPTResponse<RailwayStatus>> {
    const url = `${this.baseUrl}/odpt:RailwayFare`;
    const params = new URLSearchParams({
      'acl:consumerKey': this.consumerKey,
      'odpt:railway': `odpt.Railway:${railway}`
    });

    try {
      const response = await this.fetchWithRetry(`${url}?${params.toString()}`);
      
      // Handle network error (null response)
      if (!response) {
        return {
          success: false,
          error: 'Network error: API timeout'
        };
      }
      
      if (!response.ok) {
        return {
          success: false,
          error: `API request failed: ${response.status} ${response.statusText}`
        };
      }

      const rawData = await response.json();
      const transformedData = this.transformStatusData(rawData[0], railway);
      
      return { success: true, data: transformedData };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${(error as Error).message}`
      };
    }
  }

  async searchStations(stationName: string): Promise<ODPTResponse<StationInfo[]>> {
    const url = `${this.baseUrl}/odpt:Station`;
    const params = new URLSearchParams({
      'acl:consumerKey': this.consumerKey,
      'dc:title': stationName
    });

    try {
      const response = await this.fetchWithRetry(`${url}?${params.toString()}`);
      
      if (!response || !response.ok) {
        return {
          success: false,
          error: `API request failed: ${response?.status || 'Unknown'} ${response?.statusText || 'Network Error'}`
        };
      }

      const rawData = await response.json();
      const transformedData = this.transformStationData(rawData);
      
      return { success: true, data: transformedData };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${(error as Error).message}`
      };
    }
  }

  transformStationId(stationId: string): string {
    // Extract station name from ODPT ID format: odpt.Station:Operator.Line.StationName
    if (stationId.startsWith('odpt.Station:')) {
      const parts = stationId.split('.');
      return parts[parts.length - 1];
    }
    return stationId; // Return as-is if not in expected format
  }

  transformRailwayId(railwayId: string): string {
    // Extract railway name from ODPT ID format: odpt.Railway:Operator.Line
    if (railwayId.startsWith('odpt.Railway:')) {
      return railwayId.substring('odpt.Railway:'.length);
    }
    return railwayId; // Return as-is if not in expected format
  }

  private async fetchWithRetry(url: string, retries = 0): Promise<Response | null> {
    try {
      const response = await fetch(url);
      
      // Retry on rate limiting
      if (response && response.status === 429 && retries < this.maxRetries) {
        await this.delay(this.retryDelayMs * (retries + 1));
        return this.fetchWithRetry(url, retries + 1);
      }
      
      return response;
    } catch (error) {
      // For network errors, retry up to maxRetries
      if (retries < this.maxRetries) {
        await this.delay(this.retryDelayMs * (retries + 1));
        return this.fetchWithRetry(url, retries + 1);
      }
      // Return null to signal network error after retries exhausted
      // The calling method will check for null response and handle appropriately
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeoutMs) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private transformTrainData(rawData: any[]): RealtimeTrainInfo[] {
    return rawData.map(train => ({
      trainNumber: train['odpt:trainNumber'] || '',
      trainType: this.extractTrainType(train['odpt:trainType']),
      delay: train['odpt:delay'] || 0,
      fromStation: this.transformStationId(train['odpt:fromStation'] || ''),
      toStation: this.transformStationId(train['odpt:toStation'] || ''),
      timestamp: train['dc:date'] || new Date().toISOString()
    }));
  }

  private transformTimetableData(rawData: any, railway: string, station: string): StationTimetable {
    const departures = rawData['odpt:stationTimetableObject']?.map((departure: any) => ({
      time: departure['odpt:departureTime'],
      destination: departure['odpt:destinationStation']?.map((dest: string) => this.transformStationId(dest)) || [],
      trainType: this.extractTrainType(departure['odpt:trainType'])
    })) || [];

    return {
      station,
      railway,
      departures
    };
  }

  private transformStatusData(rawData: any, railway: string): RailwayStatus {
    return {
      railway,
      operator: rawData['odpt:operator'] || '',
      status: this.extractStatus(rawData['odpt:trainInformationStatus']),
      statusText: rawData['odpt:trainInformationText'] || '',
      timestamp: rawData['dc:date'] || new Date().toISOString()
    };
  }

  private transformStationData(rawData: any[]): StationInfo[] {
    return rawData.map(station => ({
      id: station['owl:sameAs'] || '',
      name: station['dc:title'] || '',
      railway: this.transformRailwayId(station['odpt:railway'] || ''),
      latitude: station['geo:lat'] || 0,
      longitude: station['geo:long'] || 0
    }));
  }

  private extractTrainType(trainTypeId: string): string {
    if (!trainTypeId) return '';
    // Extract from format: odpt.TrainType:Operator.Type
    const parts = trainTypeId.split('.');
    return parts[parts.length - 1] || trainTypeId;
  }

  private extractStatus(statusId: string): string {
    if (!statusId) return '';
    // Extract from format: odpt.TrainInformationStatus:Status
    const parts = statusId.split(':');
    return parts[parts.length - 1] || statusId;
  }
}