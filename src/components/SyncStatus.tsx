import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SyncStatus as SyncStatusType } from '../services/SyncStatusService';

interface SyncStatusProps {
  status: SyncStatusType;
  compact?: boolean;
}

export function SyncStatus({ status, compact = false }: SyncStatusProps) {
  const getStatusIcon = () => {
    switch (status.status) {
      case 'idle':
        return '⏸️';
      case 'connecting':
        return <ActivityIndicator size="small" color="#007AFF" />;
      case 'syncing':
        return <ActivityIndicator size="small" color="#007AFF" />;
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'idle':
        return '#666';
      case 'connecting':
      case 'syncing':
        return '#007AFF';
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      default:
        return '#666';
    }
  };

  const formatLastSyncTime = (isoString?: string) => {
    if (!isoString) return null;
    
    const syncTime = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - syncTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return syncTime.toLocaleDateString();
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.statusIcon}>
          {getStatusIcon()}
        </View>
        <Text style={[styles.compactMessage, { color: getStatusColor() }]}>
          {status.message || status.status}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statusHeader}>
        <View style={styles.statusIcon}>
          {getStatusIcon()}
        </View>
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {status.message || status.status}
        </Text>
      </View>

      {status.lastSyncAt && (
        <Text style={styles.lastSyncText}>
          Last synced: {formatLastSyncTime(status.lastSyncAt)}
        </Text>
      )}

      {(status.placesFound > 0 || status.placesAdded > 0) && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{status.placesFound}</Text>
            <Text style={styles.statLabel}>found</Text>
          </View>
          
          {status.placesAdded > 0 && (
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, styles.addedNumber]}>{status.placesAdded}</Text>
              <Text style={styles.statLabel}>added</Text>
            </View>
          )}
          
          {status.duplicatesSkipped > 0 && (
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, styles.skippedNumber]}>{status.duplicatesSkipped}</Text>
              <Text style={styles.statLabel}>skipped</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#e9ecef',
    marginVertical: 4,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusIcon: {
    marginRight: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  compactMessage: {
    fontSize: 12,
    flex: 1,
  },
  lastSyncText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    marginLeft: 28,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginLeft: 28,
  },
  statItem: {
    marginRight: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  addedNumber: {
    color: '#4CAF50',
  },
  skippedNumber: {
    color: '#FF9800',
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
    marginTop: 2,
  },
});