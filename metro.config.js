const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Custom resolver to handle problematic imports
const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle the problematic Platform import
  if (moduleName === '../Utilities/Platform') {
    return {
      filePath: path.join(__dirname, 'platform-shim.js'),
      type: 'sourceFile',
    };
  }
  
  // Handle react-native-maps for web platform
  if (moduleName === 'react-native-maps' && platform === 'web') {
    try {
      return originalResolver(context, 'react-native-web/dist/exports/View', platform);
    } catch (e) {
      return {
        filePath: require.resolve('react-native-web/dist/exports/View'),
        type: 'sourceFile',
      };
    }
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
config.resolver.sourceExts = [...config.resolver.sourceExts, 'web.js', 'web.ts', 'web.tsx'];

// Transform configuration for better web support
config.transformer = {
  ...config.transformer,
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
  minifierConfig: {
    mangle: false, // Better for debugging
  },
};

module.exports = config;