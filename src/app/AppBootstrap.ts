import * as fs from 'fs';
import * as path from 'path';

interface ConfigValidationResult {
  isValid: boolean;
  hasExpoConfig: boolean;
  hasTypeScript: boolean;
  projectName: string;
  error?: string;
}

interface ExpoConfig {
  expo: {
    name: string;
    slug: string;
    version: string;
    platforms: string[];
    permissions: string[];
    orientation: string;
    icon: string;
    splash: {
      image: string;
      resizeMode: string;
      backgroundColor: string;
    };
    ios: {
      supportsTablet: boolean;
    };
    web: {
      favicon: string;
    };
  };
}

export class AppBootstrap {
  validateConfiguration(): ConfigValidationResult {
    const appJsonPath = path.join(process.cwd(), 'app.json');
    const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
    
    if (!fs.existsSync(appJsonPath)) {
      return {
        isValid: false,
        hasExpoConfig: false,
        hasTypeScript: fs.existsSync(tsConfigPath),
        projectName: 'MoPsJapan',
        error: 'app.json not found'
      };
    }

    return {
      isValid: true,
      hasExpoConfig: true,
      hasTypeScript: fs.existsSync(tsConfigPath),
      projectName: 'MoPsJapan'
    };
  }

  getRequiredDependencies(): string[] {
    return [
      'expo',
      'react-native',
      '@expo/vector-icons',
      'react-navigation',
      'expo-location',
      'expo-async-storage'
    ];
  }

  getDevDependencies(): string[] {
    return [
      '@types/react',
      '@types/react-native',
      'typescript'
    ];
  }

  createExpoConfig(): ExpoConfig {
    return {
      expo: {
        name: 'MoPsJapan',
        slug: 'mops-japan',
        version: '1.0.0',
        platforms: ['ios', 'web'],
        permissions: ['LOCATION', 'INTERNET'],
        orientation: 'portrait',
        icon: './assets/icon.png',
        splash: {
          image: './assets/splash.png',
          resizeMode: 'contain',
          backgroundColor: '#ffffff'
        },
        ios: {
          supportsTablet: true
        },
        web: {
          favicon: './assets/favicon.png'
        }
      }
    };
  }
}