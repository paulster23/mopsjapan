// NativeAnimatedHelper shim for web compatibility
// Provides no-op implementations for React Native animation system

const NativeAnimatedHelper = {
  API: {
    flushQueue: () => {
      // No-op for web - animations handled by CSS/JS
    },
    createAnimatedNode: () => {},
    dropAnimatedNode: () => {},
    connectAnimatedNodes: () => {},
    disconnectAnimatedNodes: () => {},
    startAnimatingNode: () => {},
    stopAnimation: () => {},
    setAnimatedNodeValue: () => {},
    setAnimatedNodeOffset: () => {},
    flattenAnimatedNodeOffset: () => {},
    extractAnimatedNodeOffset: () => {},
    connectAnimatedNodeToView: () => {},
    disconnectAnimatedNodeFromView: () => {},
    restoreDefaultValues: () => {},
    addAnimatedEventToView: () => {},
    removeAnimatedEventFromView: () => {},
    addListener: () => ({ remove: () => {} }),
    removeListeners: () => {},
  },
  
  // Animation driver detection
  shouldUseNativeDriver: (config) => {
    // Always return false for web platform
    return false;
  },
  
  // Check if native animated is available
  nativeEventEmitter: null,
  
  // Animation node management
  __makeNative: () => {},
  __getNativeTag: () => -1,
  __getValue: () => 0,
  __getAnimatedValue: () => 0,
  
  // Batch operations
  __startOperationBatch: () => {},
  __finishOperationBatch: () => {},
  
  // Default exports for different import patterns
  default: {
    API: {
      flushQueue: () => {},
      createAnimatedNode: () => {},
      dropAnimatedNode: () => {},
      connectAnimatedNodes: () => {},
      disconnectAnimatedNodes: () => {},
      startAnimatingNode: () => {},
      stopAnimation: () => {},
      setAnimatedNodeValue: () => {},
      setAnimatedNodeOffset: () => {},
      flattenAnimatedNodeOffset: () => {},
      extractAnimatedNodeOffset: () => {},
      connectAnimatedNodeToView: () => {},
      disconnectAnimatedNodeFromView: () => {},
      restoreDefaultValues: () => {},
      addAnimatedEventToView: () => {},
      removeAnimatedEventFromView: () => {},
      addListener: () => ({ remove: () => {} }),
      removeListeners: () => {},
    },
    shouldUseNativeDriver: (config) => false,
    __makeNative: () => {},
    __getNativeTag: () => -1,
    __getValue: () => 0,
    __getAnimatedValue: () => 0,
  }
};

// Export for various import patterns
module.exports = NativeAnimatedHelper;
module.exports.default = NativeAnimatedHelper;
module.exports.shouldUseNativeDriver = NativeAnimatedHelper.shouldUseNativeDriver;

export default NativeAnimatedHelper;
export const { shouldUseNativeDriver } = NativeAnimatedHelper;
export const API = NativeAnimatedHelper.API;