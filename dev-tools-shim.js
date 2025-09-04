// Development tools shim for web compatibility
// Provides no-op implementations for React Native development modules

// Generic no-op implementation for all development tools
const DevToolsShim = {
  // DevToolsSettingsManager
  setGlobalSettings: () => {},
  getGlobalSettings: () => ({}),
  
  // HMRClient  
  enable: () => {},
  disable: () => {},
  setup: () => {},
  registerBundle: () => {},
  
  // DeviceInfo
  getConstants: () => ({}),
  
  // Inspector
  inspect: () => {},
  hide: () => {},
  
  // Generic fallbacks
  isEnabled: () => false,
  isAvailable: () => false,
  
  // Common React DevTools patterns
  connectToDevTools: () => {},
  setupDevtools: () => {},
  
  // No-op function for any method calls
  noop: () => {},
};

// Export as various formats for compatibility
module.exports = DevToolsShim;
module.exports.default = DevToolsShim;

// Export individual functions for specific imports
module.exports.DevToolsSettingsManager = DevToolsShim;
module.exports.HMRClient = DevToolsShim;
module.exports.Inspector = DevToolsShim;

// ES modules export
export default DevToolsShim;
export const DevToolsSettingsManager = DevToolsShim;
export const HMRClient = DevToolsShim;
export const Inspector = DevToolsShim;