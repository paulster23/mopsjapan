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

    // Get category-specific icon
    const getCategoryIcon = (category: string) => {
      switch (category) {
        case 'accommodation': return '🏨';
        case 'restaurant': return '🍜';
        case 'entertainment': return '🎭';
        case 'transport': return '🚇';
        case 'shopping': return '🛍️';
        default: return '📍';
      }
    };

    // Create colored icons for different categories
    const createColorIcon = (color: string, category?: string, showLabel?: boolean, labelText?: string, zoomLevel?: number) => {
      const icon = getCategoryIcon(category || '');
      
      // Determine label display settings based on zoom level
      const shouldShowLabel = showLabel && labelText && zoomLevel && zoomLevel >= 14;
      let fontSize = '10px';
      let maxWidth = '80px';
      
      if (zoomLevel && zoomLevel >= 16) {
        fontSize = '12px';
        maxWidth = '120px';
      } else if (zoomLevel && zoomLevel >= 15) {
        fontSize = '11px';
        maxWidth = '100px';
      }
      
      // Truncate label text for mobile
      let displayLabel = labelText || '';
      if (displayLabel.length > 15) {
        displayLabel = displayLabel.substring(0, 12) + '...';
      }
      
      const labelHTML = shouldShowLabel ? `
        <div style="
          position: absolute;
          top: 32px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: 4px;
          padding: 2px 6px;
          font-size: ${fontSize};
          font-weight: 600;
          color: #333;
          white-space: nowrap;
          max-width: ${maxWidth};
          overflow: hidden;
          text-overflow: ellipsis;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          pointer-events: none;
        ">${displayLabel}</div>
      ` : '';
      
      return new L.DivIcon({
        className: 'custom-div-icon',
        html: `
          <div style="position: relative;">
            <div style="
              background-color: ${color}; 
              width: 28px; 
              height: 28px; 
              border-radius: 50%; 
              border: 2px solid white;
              box-shadow: 0 2px 5px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              color: white;
            ">${icon}</div>
            ${labelHTML}
          </div>`,
        iconSize: shouldShowLabel ? [140, 60] : [28, 28],
        iconAnchor: shouldShowLabel ? [70, 14] : [14, 14],
      });
    };

    // Create prominent user location icon with glowing effect
    const createUserLocationIcon = () => {
      return new L.DivIcon({
        className: 'user-location-icon',
        html: `
          <div style="
            position: relative;
            width: 20px; 
            height: 20px;
          ">
            <!-- Pulsing outer ring -->
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 40px;
              height: 40px;
              background-color: rgba(59, 130, 246, 0.3);
              border-radius: 50%;
              animation: pulse 2s infinite;
            "></div>
            <!-- Inner blue dot -->
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 20px;
              height: 20px;
              background-color: #3B82F6;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(59, 130, 246, 0.6);
            "></div>
          </div>
          <style>
            @keyframes pulse {
              0% {
                transform: translate(-50%, -50%) scale(0.8);
                opacity: 1;
              }
              100% {
                transform: translate(-50%, -50%) scale(2.0);
                opacity: 0;
              }
            }
          </style>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
    };

    const getColorIcon = (color: string, category?: string, showLabel?: boolean, labelText?: string, zoomLevel?: number) => {
      return createColorIcon(color, category, showLabel, labelText, zoomLevel);
    };

    MapView = ({ 
      region, 
      style, 
      children, 
      onRegionChangeComplete,
      onZoomChange,
      currentZoom,
      showsUserLocation,
      showsMyLocationButton,
      ...props 
    }: any) => {
      const [userLocation, setUserLocation] = React.useState<{latitude: number, longitude: number} | null>(null);
      
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
                    setUserLocation({ latitude, longitude });
                    map.target.setView([latitude, longitude], 13);
                  },
                  (error) => console.log('Location error:', error),
                  { enableHighAccuracy: true }
                );
              }
              
              // Set up zoom change listener
              if (onZoomChange) {
                map.target.on('zoomend', () => {
                  const zoom = map.target.getZoom();
                  onZoomChange(zoom);
                });
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
            {/* User location marker with glowing blue dot */}
            {userLocation && showsUserLocation && (
              <LeafletMarker
                position={[userLocation.latitude, userLocation.longitude]}
                icon={createUserLocationIcon()}
              >
                <Popup>
                  <div style={{ textAlign: 'center', minWidth: '120px' }}>
                    <strong style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>
                      Your Location
                    </strong>
                    <span style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '8px' }}>
                      Current position
                    </span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${userLocation.latitude},${userLocation.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        backgroundColor: '#4285F4',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        textDecoration: 'none',
                        fontSize: '12px',
                        fontWeight: '500',
                        marginTop: '4px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3367D6'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4285F4'}
                    >
                      🧭 Navigate from here
                    </a>
                  </div>
                </Popup>
              </LeafletMarker>
            )}
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
      category,
      showLabel = false,
      zoomLevel,
      children,
      ...props 
    }: any) => {
      // Map pinColor to actual color values
      const colorMap: Record<string, string> = {
        purple: '#8B5CF6',
        orange: '#F97316', 
        green: '#10B981',
        blue: '#3B82F6',
        red: '#EF4444',
      };
      
      const actualColor = colorMap[pinColor] || '#EF4444';
      const icon = getColorIcon(actualColor, category, showLabel, title, zoomLevel);
      
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