import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';

// Conditional imports based on platform
let MapView: any;
let Marker: any;

if (Platform.OS === 'web') {
  // Web fallback - use placeholder components
  MapView = ({ children, style, ...props }: any) => (
    <View style={[style, styles.webMapPlaceholder]} {...props}>
      <Text style={styles.webMapText}>🗺️ Interactive Map</Text>
      <Text style={styles.webMapSubtext}>
        Maps are available on mobile devices
      </Text>
      {children}
    </View>
  );
  
  Marker = ({ title, description }: any) => (
    <View style={styles.webMarker}>
      <Text style={styles.webMarkerText}>📍 {title}</Text>
      {description && <Text style={styles.webMarkerDesc}>{description}</Text>}
    </View>
  );
} else {
  // Native platforms - use actual react-native-maps
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
  } catch (error) {
    console.warn('react-native-maps not available, using fallback');
    MapView = View;
    Marker = View;
  }
}

const styles = StyleSheet.create({
  webMapPlaceholder: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    minHeight: 200,
  },
  webMapText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  webMapSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  webMarker: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  webMarkerText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  webMarkerDesc: {
    color: 'white',
    fontSize: 10,
  },
});

export { MapView, Marker };
export default MapView;