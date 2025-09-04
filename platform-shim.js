// Platform shim for web compatibility
// This resolves the ../Utilities/Platform import issue

// Create a comprehensive Platform object for web
const Platform = {
  OS: 'web',
  Version: '1.0.0',
  isTesting: false,
  isTV: false,
  isPad: false,
  isTVOS: false,
  isVision: false,
  
  // Platform detection methods
  select: (platforms) => {
    return platforms.web || platforms.default;
  },
  
  // Constants for web
  constants: {
    Brand: 'generic',
    Manufacturer: 'unknown',
    Model: 'web',
    systemName: 'web',
    systemVersion: '1.0.0',
    reactNativeVersion: { major: 0, minor: 73, patch: 6 },
    interfaceIdiom: 'tablet', // Default for web
    isTesting: false,
    isTV: false,
    isPad: false,
    isTVOS: false,
    isVision: false,
  },
};

module.exports = Platform;
module.exports.default = Platform;
export default Platform;