// TurboModule Registry shim for web compatibility
// This provides no-op implementations for native TurboModule system

// Web-compatible no-op implementation for TurboModule Registry
const TurboModuleRegistry = {
  get: (name) => {
    // Return null for any requested native module on web
    // Components should have web-compatible fallbacks
    console.warn(`TurboModule '${name}' is not available on web platform`);
    return null;
  },
  getEnforcing: (name) => {
    // Same as get() but for enforcing modules
    console.warn(`TurboModule '${name}' is not available on web platform`);  
    return null;
  }
};

module.exports = TurboModuleRegistry;
export default TurboModuleRegistry;