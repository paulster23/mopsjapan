// TurboModule Registry shim for web compatibility
// This provides comprehensive no-op implementations for native TurboModule system

console.log('📦 Loading TurboModule Registry shim for web platform');

// Web-compatible comprehensive implementation for TurboModule Registry
const TurboModuleRegistry = {
  get: (name) => {
    if (!name) {
      console.error('🔴 TurboModuleRegistry.get() called with invalid name:', name);
      return null;
    }
    
    // Log requests for analysis
    console.warn(`📋 TurboModule '${name}' requested but not available on web platform`);
    
    // Return null for any requested native module on web
    // Components should have web-compatible fallbacks
    return null;
  },
  
  getEnforcing: (name) => {
    if (!name) {
      console.error('🔴 TurboModuleRegistry.getEnforcing() called with invalid name:', name);
      return null;
    }
    
    console.warn(`📋 TurboModule '${name}' (enforcing) requested but not available on web platform`);
    return null;
  },
  
  // Additional methods that may be called by React Native internals
  register: (name, moduleProvider) => {
    console.warn(`📋 TurboModule registration for '${name}' ignored on web platform`);
  },
  
  unstable_hasModule: (name) => {
    return false; // No native modules available on web
  },
  
  // Defensive fallback for any other method calls
  __proto__: new Proxy({}, {
    get: (target, prop) => {
      console.warn(`📋 Unknown TurboModuleRegistry method '${prop}' called on web platform`);
      return () => null;
    }
  })
};

// Defensive check - ensure this object has expected methods
if (typeof TurboModuleRegistry.get !== 'function') {
  console.error('🔴 CRITICAL: TurboModuleRegistry.get is not a function!');
}

console.log('✅ TurboModule Registry shim loaded successfully');

module.exports = TurboModuleRegistry;
export default TurboModuleRegistry;