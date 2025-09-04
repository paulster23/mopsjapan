export interface KMLFetchResponse {
  success: boolean;
  kmlContent?: string;
  mapId?: string;
  fetchedAt?: string;
  error?: string;
  details?: string;
}

export class NetlifyApiService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8888') {
    this.baseUrl = baseUrl;
  }

  async fetchMyMapsKML(mapId: string): Promise<KMLFetchResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/.netlify/functions/fetch-mymaps-kml`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mapId }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to fetch KML',
          details: data.details || `HTTP ${response.status}`
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: 'Network error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }
}