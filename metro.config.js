const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Custom resolver to handle problematic imports
const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle the problematic Platform import (various relative paths)
  if (moduleName === '../Utilities/Platform' || 
      moduleName === '../../Utilities/Platform' ||
      moduleName === './Utilities/Platform' ||
      moduleName === './Platform' ||
      moduleName === '../Platform' ||
      moduleName.endsWith('Utilities/Platform') ||
      moduleName.endsWith('/Platform')) {
    return {
      filePath: path.join(__dirname, 'platform-shim.js'),
      type: 'sourceFile',
    };
  }
  
  // Handle AccessibilityInfo import issues
  if (moduleName === '../Components/AccessibilityInfo/AccessibilityInfo' ||
      moduleName === '../Components/AccessibilityInfo/legacySendAccessibilityEvent') {
    return {
      filePath: path.join(__dirname, 'accessibility-shim.js'),
      type: 'sourceFile',
    };
  }
  
  // Handle ReactNativeConfigModule import issues  
  if (moduleName === '../TurboModule/TurboModuleRegistry') {
    return {
      filePath: path.join(__dirname, 'rct-shim.js'),
      type: 'sourceFile',
    };
  }
  
  // Handle RCTNetworking import issues
  if (moduleName === './RCTNetworking' || 
      moduleName === '../Network/RCTNetworking' ||
      moduleName.endsWith('RCTNetworking')) {
    return {
      filePath: path.join(__dirname, 'networking-shim.js'),
      type: 'sourceFile',
    };
  }
  
  // Handle PlatformColorValueTypes import issues
  if (moduleName === './PlatformColorValueTypes' ||
      moduleName === '../StyleSheet/PlatformColorValueTypes' ||
      moduleName.endsWith('PlatformColorValueTypes')) {
    return {
      filePath: path.join(__dirname, 'platform-color-shim.js'),
      type: 'sourceFile',
    };
  }
  
  // Handle BaseViewConfig import issues
  if (moduleName === './BaseViewConfig' ||
      moduleName === '../NativeComponent/BaseViewConfig' ||
      moduleName.endsWith('BaseViewConfig')) {
    return {
      filePath: path.join(__dirname, 'base-view-config-shim.js'),
      type: 'sourceFile',
    };
  }
  
  // Handle RCTAlertManager import issues
  if (moduleName === './RCTAlertManager' ||
      moduleName === '../Alert/RCTAlertManager' ||
      moduleName.endsWith('RCTAlertManager')) {
    return {
      filePath: path.join(__dirname, 'alert-manager-shim.js'),
      type: 'sourceFile',
    };
  }
  
  // Use default resolver for everything else
  if (originalResolver) {
    return originalResolver(context, moduleName, platform);
  }
  
  // Fallback to default resolution
  return context.resolveRequest(context, moduleName, platform);
};

// Configure platforms and resolution
config.resolver.platforms = ['web', 'ios', 'android', 'native'];
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Add web-specific extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, 'web.js', 'web.ts', 'web.tsx', 'css'];

// Transform configuration for better web support
config.transformer = {
  ...config.transformer,
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
  minifierConfig: {
    mangle: false, // Better for debugging
  },
};

module.exports = config;