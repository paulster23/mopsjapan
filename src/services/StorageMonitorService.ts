interface StorageUsage {
  key: string;
  size: number;
  sizeFormatted: string;
}

interface StorageQuota {
  total: number;
  used: number;
  available: number;
  usagePercentage: number;
  isNearLimit: boolean;
  isAtLimit: boolean;
  breakdown: StorageUsage[];
}

export class StorageMonitorService {
  private readonly WARNING_THRESHOLD = 70; // 70%
  private readonly DANGER_THRESHOLD = 90;  // 90%

  /**
   * Get comprehensive storage quota information
   */
  async getStorageQuota(): Promise<StorageQuota> {
    try {
      const breakdown = await this.getStorageBreakdown();
      const used = breakdown.reduce((total, item) => total + item.size, 0);
      
      // Estimate localStorage quota (typically 5-10MB, we'll use 5MB as conservative)
      const estimatedQuota = this.estimateLocalStorageQuota();
      const usagePercentage = (used / estimatedQuota) * 100;

      return {
        total: estimatedQuota,
        used,
        available: estimatedQuota - used,
        usagePercentage,
        isNearLimit: usagePercentage >= this.WARNING_THRESHOLD,
        isAtLimit: usagePercentage >= this.DANGER_THRESHOLD,
        breakdown
      };
    } catch (error) {
      console.error('Error calculating storage quota:', error);
      return this.getEmptyQuota();
    }
  }

  /**
   * Get detailed breakdown of storage usage by key
   */
  private async getStorageBreakdown(): Promise<StorageUsage[]> {
    const breakdown: StorageUsage[] = [];
    
    // Get all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const value = localStorage.getItem(key) || '';
      const size = new Blob([value]).size; // Get byte size

      breakdown.push({
        key,
        size,
        sizeFormatted: this.formatBytes(size)
      });
    }

    // Sort by size descending
    return breakdown.sort((a, b) => b.size - a.size);
  }

  /**
   * Estimate localStorage quota based on browser behavior
   */
  private estimateLocalStorageQuota(): number {
    // Most browsers: 5-10MB, we'll use 5MB as conservative estimate
    // Could enhance this with actual quota detection if needed
    return 5 * 1024 * 1024; // 5MB in bytes
  }

  /**
   * Format bytes into human-readable string
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Get storage usage for specific keys (like app-specific data)
   */
  async getAppStorageUsage(): Promise<{
    itinerary: StorageUsage | null;
    userLocation: StorageUsage | null;
    locationOverride: StorageUsage | null;
    other: StorageUsage[];
  }> {
    const breakdown = await this.getStorageBreakdown();
    
    const itinerary = breakdown.find(item => item.key === 'mops_japan_itinerary') || null;
    const userLocation = breakdown.find(item => item.key === 'mops_japan_user_location') || null;
    const locationOverride = breakdown.find(item => item.key === 'location_override') || null;
    
    const appKeys = ['mops_japan_itinerary', 'mops_japan_user_location', 'location_override'];
    const other = breakdown.filter(item => !appKeys.includes(item.key));

    return {
      itinerary,
      userLocation,
      locationOverride,
      other
    };
  }

  /**
   * Clear specific storage items
   */
  clearStorageItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error clearing storage item ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all app-specific storage
   */
  clearAppStorage(): boolean {
    try {
      const appKeys = ['mops_japan_itinerary', 'mops_japan_user_location', 'location_override'];
      appKeys.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.error('Error clearing app storage:', error);
      return false;
    }
  }

  /**
   * Export all storage data for backup
   */
  exportStorageData(): string {
    const data: Record<string, any> = {};
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        data[key] = localStorage.getItem(key);
      }
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Get warning level based on usage percentage
   */
  getWarningLevel(usagePercentage: number): 'safe' | 'warning' | 'danger' {
    if (usagePercentage >= this.DANGER_THRESHOLD) return 'danger';
    if (usagePercentage >= this.WARNING_THRESHOLD) return 'warning';
    return 'safe';
  }

  /**
   * Get warning color for UI
   */
  getWarningColor(usagePercentage: number): string {
    const level = this.getWarningLevel(usagePercentage);
    switch (level) {
      case 'danger': return '#F44336';  // Red
      case 'warning': return '#FF9800'; // Orange
      case 'safe': return '#4CAF50';    // Green
    }
  }

  private getEmptyQuota(): StorageQuota {
    return {
      total: 0,
      used: 0,
      available: 0,
      usagePercentage: 0,
      isNearLimit: false,
      isAtLimit: false,
      breakdown: []
    };
  }
}