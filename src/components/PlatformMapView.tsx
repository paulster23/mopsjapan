import React, { useEffect } from 'react';
import { Platform, View, Text, StyleSheet, Dimensions } from 'react-native';

// Conditional imports based on platform
let MapView: any;
let Marker: any;

if (Platform.OS === 'web') {
  // Web platform - use Leaflet
  try {
    const { MapContainer, TileLayer, Marker: LeafletMarker, Popup } = require('react-leaflet');
    const L = require('leaflet');
    
    // Fix Leaflet default icon issues on web
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });

    // Create colored icons for different categories
    const createColorIcon = (color: string) => {
      return new L.DivIcon({
        className: 'custom-div-icon',
        html: `
          <div style="
            background-color: ${color}; 
            width: 24px; 
            height: 24px; 
            border-radius: 50%; 
            border: 2px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: white;
          ">📍</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
    };

    const colorIcons = {
      purple: createColorIcon('#8B5CF6'),
      orange: createColorIcon('#F97316'), 
      green: createColorIcon('#10B981'),
      blue: createColorIcon('#3B82F6'),
      red: createColorIcon('#EF4444'),
    };

    MapView = ({ 
      region, 
      style, 
      children, 
      onRegionChangeComplete,
      showsUserLocation,
      showsMyLocationButton,
      ...props 
    }: any) => {
      
      useEffect(() => {
        // Ensure Leaflet CSS is loaded
        if (typeof document !== 'undefined') {
          const leafletCSS = document.querySelector('link[href*="leaflet.css"]');
          if (!leafletCSS) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
          }
        }
      }, []);

      return (
        <View style={[style, { position: 'relative' }]} {...props}>
          <MapContainer
            center={region ? [region.latitude, region.longitude] : [35.6812, 139.7671]}
            zoom={13}
            style={{ height: '100%', width: '100%', borderRadius: 8 }}
            whenReady={(map) => {
              // Handle map ready
              if (showsUserLocation) {
                // Request user location
                navigator.geolocation?.getCurrentPosition(
                  (position) => {
                    const { latitude, longitude } = position.coords;
                    map.target.setView([latitude, longitude], 13);
                  },
                  (error) => console.log('Location error:', error),
                  { enableHighAccuracy: true }
                );
              }
            }}
            onMoveEnd={(e) => {
              if (onRegionChangeComplete) {
                const map = e.target;
                const center = map.getCenter();
                onRegionChangeComplete({
                  latitude: center.lat,
                  longitude: center.lng,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                });
              }
            }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {children}
          </MapContainer>
        </View>
      );
    };
    
    Marker = ({ 
      coordinate, 
      title, 
      description, 
      onPress, 
      pinColor = 'red',
      children,
      ...props 
    }: any) => {
      const icon = colorIcons[pinColor as keyof typeof colorIcons] || colorIcons.red;
      
      return (
        <LeafletMarker 
          position={[coordinate.latitude, coordinate.longitude]}
          icon={icon}
          eventHandlers={{
            click: () => {
              if (onPress) onPress();
            }
          }}
          {...props}
        >
          <Popup>
            <div style={{ textAlign: 'center', minWidth: '120px' }}>
              <strong style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>
                {title}
              </strong>
              {description && (
                <span style={{ fontSize: '12px', color: '#666' }}>
                  {description}
                </span>
              )}
            </div>
          </Popup>
          {children}
        </LeafletMarker>
      );
    };
    
  } catch (error) {
    console.warn('react-leaflet not available, using fallback');
    // Fallback for web if leaflet fails to load
    MapView = ({ children, style, ...props }: any) => (
      <View style={[style, styles.webMapPlaceholder]} {...props}>
        <Text style={styles.webMapText}>🗺️ Loading Map...</Text>
        <Text style={styles.webMapSubtext}>
          Interactive map loading
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
  }
} else {
  // Native platforms - use actual react-native-maps
  try {
    const maps = require('react-native-maps');
    MapView = maps.default || maps;
    Marker = maps.Marker;
    
    // Verify components are actually usable
    if (!MapView || !Marker) {
      throw new Error('MapView or Marker not found in react-native-maps');
    }
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