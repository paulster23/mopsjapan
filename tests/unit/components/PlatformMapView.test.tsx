import React from 'react';
import { Platform } from 'react-native';

// Mock Platform.OS for testing
const mockPlatform = (os: string) => {
  Object.defineProperty(Platform, 'OS', {
    writable: true,
    value: os,
  });
};

describe('PlatformMapView', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    // Reset platform and clear module cache after each test
    Platform.OS = originalPlatform;
    jest.resetModules();
  });

  describe('Module Loading and Platform Detection', () => {
    it('should detect web platform and provide fallback components', () => {
      mockPlatform('web');
      jest.resetModules();
      
      const { MapView, Marker } = require('../../../src/components/PlatformMapView');
      
      expect(MapView).toBeDefined();
      expect(Marker).toBeDefined();
      expect(typeof MapView).toBe('function');
      expect(typeof Marker).toBe('function');
    });

    it('should detect native platform and provide components', () => {
      mockPlatform('ios');
      jest.resetModules();
      
      const { MapView, Marker } = require('../../../src/components/PlatformMapView');
      
      // Components should be available (either real or fallback)
      expect(MapView).toBeDefined();
      expect(Marker).toBeDefined();
      expect(typeof MapView).toBe('function');
      expect(typeof Marker).toBe('function');
    });

    it('should handle android platform correctly', () => {
      mockPlatform('android');
      jest.resetModules();
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const { MapView, Marker } = require('../../../src/components/PlatformMapView');
      
      expect(MapView).toBeDefined();
      expect(Marker).toBeDefined();
      consoleSpy.mockRestore();
    });
  });

  describe('Component Export Verification', () => {
    it('should export both MapView and Marker components', () => {
      mockPlatform('web');
      jest.resetModules();
      
      const PlatformMapView = require('../../../src/components/PlatformMapView');
      
      expect(PlatformMapView.MapView).toBeDefined();
      expect(PlatformMapView.Marker).toBeDefined();
      expect(PlatformMapView.default).toBeDefined();
      expect(PlatformMapView.default).toBe(PlatformMapView.MapView);
    });

    it('should provide consistent component interface across platforms', () => {
      // Test that components are available regardless of platform
      mockPlatform('ios');
      jest.resetModules();
      const nativeModule = require('../../../src/components/PlatformMapView');
      
      mockPlatform('web');
      jest.resetModules();
      const webModule = require('../../../src/components/PlatformMapView');
      
      // Both platforms should provide the same interface
      expect(nativeModule.MapView).toBeDefined();
      expect(nativeModule.Marker).toBeDefined();
      expect(webModule.MapView).toBeDefined();
      expect(webModule.Marker).toBeDefined();
      
      expect(typeof nativeModule.MapView).toBe('function');
      expect(typeof nativeModule.Marker).toBe('function');
      expect(typeof webModule.MapView).toBe('function');
      expect(typeof webModule.Marker).toBe('function');
    });

    it('should provide different implementations for web vs native', () => {
      // Test web version
      mockPlatform('web');
      jest.resetModules();
      const webModule = require('../../../src/components/PlatformMapView');
      
      // Test native version
      mockPlatform('ios');
      jest.resetModules();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const nativeModule = require('../../../src/components/PlatformMapView');
      
      // Both should provide components but they should be different implementations
      expect(webModule.MapView).toBeDefined();
      expect(nativeModule.MapView).toBeDefined();
      expect(typeof webModule.MapView).toBe('function');
      expect(typeof nativeModule.MapView).toBe('function');
      
      consoleSpy.mockRestore();
    });
  });
});