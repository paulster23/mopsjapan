export interface MapsListFetchResponse {
  success: boolean;
  listData?: string;
  listId?: string;
  fetchedAt?: string;
  error?: string;
  details?: string;
  note?: string;
}

export class MapsListApiService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8888') {
    this.baseUrl = baseUrl;
  }

  async fetchMapsList(listId: string): Promise<MapsListFetchResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/.netlify/functions/fetch-maps-list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ listId }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to fetch Maps List',
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