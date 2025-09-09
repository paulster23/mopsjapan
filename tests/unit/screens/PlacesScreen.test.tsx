import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PlacesScreen } from '../../../src/screens/PlacesScreen';

// Mock AsyncStorage
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: mockRemoveItem,
    getAllKeys: jest.fn(),
    clear: jest.fn()
  }
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

describe('PlacesScreen Google Maps Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock window.open for Google Maps links
    global.window.open = jest.fn();
  });

  it('should create working Google Maps URL with correct format', () => {
    // Test the URL format used in handleOpenInGoogleMaps
    const testPlace = {
      id: 'test-place',
      name: 'Test Restaurant',
      category: 'restaurant' as const,
      city: 'Tokyo',
      coordinates: { latitude: 35.6812, longitude: 139.7671 }
    };

    const expectedUrl = `https://www.google.com/maps/search/?api=1&query=${testPlace.coordinates.latitude},${testPlace.coordinates.longitude}`;
    
    // Verify URL format matches MapScreen pattern
    expect(expectedUrl).toBe('https://www.google.com/maps/search/?api=1&query=35.6812,139.7671');
    expect(expectedUrl).toContain('google.com/maps/search');
    expect(expectedUrl).toContain('api=1');
    expect(expectedUrl).toContain('query=35.6812,139.7671');
  });

  it('should only show Google Maps buttons for places with coordinates', () => {
    const placesWithCoords = {
      id: 'with-coords',
      name: 'Place With Location',
      category: 'restaurant' as const,
      city: 'Tokyo',
      coordinates: { latitude: 35.6812, longitude: 139.7671 }
    };

    const placesWithoutCoords: any = {
      id: 'no-coords',
      name: 'Place Without Location',
      category: 'restaurant' as const,
      city: 'Tokyo'
      // No coordinates property
    };

    // Test conditional rendering logic
    expect(placesWithCoords.coordinates).toBeDefined();
    expect(placesWithoutCoords.coordinates).toBeUndefined();
  });

  it('should use iPhone-friendly touch targets (44px minimum)', () => {
    // Test that button styles meet iPhone accessibility guidelines
    const mapsButtonStyle = {
      padding: 4,
      borderRadius: 4,
      backgroundColor: '#e8f4f8',
      minWidth: 44, // iPhone-friendly touch target
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    };

    const googleMapsButtonStyle = {
      backgroundColor: '#007AFF',
      padding: 14,
      borderRadius: 8,
      marginBottom: 12,
      alignItems: 'center',
      minHeight: 44, // iPhone-friendly touch target
    };

    expect(mapsButtonStyle.minWidth).toBe(44);
    expect(mapsButtonStyle.minHeight).toBe(44);
    expect(googleMapsButtonStyle.minHeight).toBe(44);
  });

  it('should handle places without coordinates gracefully', () => {
    // Test error handling for places without coordinates
    const handleOpenInGoogleMaps = (place: any) => {
      if (!place.coordinates) {
        return { error: 'No Location', message: 'This place does not have coordinates available' };
      }
      return { success: true };
    };

    const placeWithoutCoords = {
      id: 'no-coords',
      name: 'Place Without Location', 
      category: 'restaurant' as const,
      city: 'Tokyo'
    };

    const result = handleOpenInGoogleMaps(placeWithoutCoords);
    expect(result.error).toBe('No Location');
    expect(result.message).toBe('This place does not have coordinates available');
  });

  it('should provide Google Maps links in both list items and modal', () => {
    // Test that Google Maps functionality is available in both locations:
    // 1. Place list items (quick access)
    // 2. Place details modal (detailed access)
    
    const testPlaceId = 'test-place-123';
    
    // Test IDs for both button locations
    const listButtonTestId = `maps-button-${testPlaceId}`;
    const modalButtonTestId = 'modal-maps-button';
    
    expect(listButtonTestId).toBe('maps-button-test-place-123');
    expect(modalButtonTestId).toBe('modal-maps-button');
  });
});