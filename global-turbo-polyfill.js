// Global TurboModule Polyfill for Web Platform
// This ensures TurboModuleRegistry is available globally before any React Native code executes
// Must be loaded VERY early in the application bootstrap process

(function() {
  'use strict';
  
  console.log('🔧 Loading global TurboModule polyfill for web platform');
  
  // Create comprehensive TurboModuleRegistry implementation
  const TurboModuleRegistry = {
    get: function(name) {
      console.warn(`🔧 TurboModule '${name}' requested but not available on web platform`);
      return null;
    },
    
    getEnforcing: function(name) {
      console.warn(`🔧 TurboModule '${name}' (enforcing) requested but not available on web platform`);
      return null;
    },
    
    // Additional methods that might be called
    register: function(name, moduleProvider) {
      console.warn(`🔧 TurboModule registration for '${name}' ignored on web platform`);
    },
    
    unstable_hasModule: function(name) {
      return false; // No native modules available on web
    }
  };
  
  // Inject into global scope using multiple approaches for maximum compatibility
  
  // Method 1: Direct global assignment
  if (typeof global !== 'undefined') {
    global.TurboModuleRegistry = TurboModuleRegistry;
    console.log('✅ TurboModuleRegistry injected into global scope');
  }
  
  // Method 2: Window assignment for browser
  if (typeof window !== 'undefined') {
    window.TurboModuleRegistry = TurboModuleRegistry;
    console.log('✅ TurboModuleRegistry injected into window scope');
  }
  
  // Method 3: CommonJS module export for require() calls
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TurboModuleRegistry;
    module.exports.default = TurboModuleRegistry;
  }
  
  // Method 4: AMD/UMD compatibility
  if (typeof define !== 'undefined' && define.amd) {
    define(function() {
      return TurboModuleRegistry;
    });
  }
  
  // Method 5: ES6 module compatibility (for future bundler scenarios)
  if (typeof exports !== 'undefined') {
    exports.TurboModuleRegistry = TurboModuleRegistry;
    exports.default = TurboModuleRegistry;
  }
  
  console.log('🔧 Global TurboModule polyfill loaded successfully');
  
})();