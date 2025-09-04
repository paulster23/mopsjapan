import { AppBootstrap } from '../../../src/bootstrap/AppBootstrap';

describe('AppBootstrap', () => {
  describe('validateConfiguration', () => {
    it('should validate that required Expo configuration exists', () => {
      const bootstrap = new AppBootstrap();
      
      const result = bootstrap.validateConfiguration();
      
      expect(result.isValid).toBe(true);
      expect(result.hasExpoConfig).toBe(true);
      expect(result.hasTypeScript).toBe(true);
      expect(result.projectName).toBe('MoPsJapan');
    });

    it('should identify missing configuration', () => {
      const bootstrap = new AppBootstrap();
      
      // Mock missing app.json
      jest.spyOn(require('fs'), 'existsSync').mockReturnValue(false);
      
      const result = bootstrap.validateConfiguration();
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('app.json not found');
    });
  });

  describe('getRequiredDependencies', () => {
    it('should return list of required React Native and Expo dependencies', () => {
      const bootstrap = new AppBootstrap();
      
      const dependencies = bootstrap.getRequiredDependencies();
      
      expect(dependencies).toContain('expo');
      expect(dependencies).toContain('react-native');
      expect(dependencies).toContain('@expo/vector-icons');
      expect(dependencies).toContain('react-navigation');
      expect(dependencies).toContain('expo-location');
      expect(dependencies).toContain('expo-async-storage');
    });

    it('should return TypeScript dev dependencies', () => {
      const bootstrap = new AppBootstrap();
      
      const devDependencies = bootstrap.getDevDependencies();
      
      expect(devDependencies).toContain('@types/react');
      expect(devDependencies).toContain('@types/react-native');
      expect(devDependencies).toContain('typescript');
    });
  });

  describe('createExpoConfig', () => {
    it('should generate valid Expo app.json configuration', () => {
      const bootstrap = new AppBootstrap();
      
      const config = bootstrap.createExpoConfig();
      
      expect(config.expo.name).toBe('MoPsJapan');
      expect(config.expo.slug).toBe('mops-japan');
      expect(config.expo.version).toBe('1.0.0');
      expect(config.expo.platforms).toContain('ios');
      expect(config.expo.platforms).toContain('web');
      expect(config.expo.permissions).toContain('LOCATION');
    });

    it('should include required app permissions', () => {
      const bootstrap = new AppBootstrap();
      
      const config = bootstrap.createExpoConfig();
      
      expect(config.expo.permissions).toContain('LOCATION');
      expect(config.expo.permissions).toContain('INTERNET');
    });
  });
});