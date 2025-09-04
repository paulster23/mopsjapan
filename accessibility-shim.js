// Accessibility shim for web compatibility
// This resolves React Native AccessibilityInfo import issues on web

// Web-compatible implementations for accessibility
const AccessibilityInfo = {
  isReduceMotionEnabled: () => Promise.resolve(false),
  isReduceTransparencyEnabled: () => Promise.resolve(false),  
  isScreenReaderEnabled: () => Promise.resolve(false),
  isAccessibilityServiceEnabled: () => Promise.resolve(false),
  isBoldTextEnabled: () => Promise.resolve(false),
  isGrayscaleEnabled: () => Promise.resolve(false),
  isInvertColorsEnabled: () => Promise.resolve(false),
  setAccessibilityFocus: () => {
    // No-op for web - focus handled by browser
  },
  announceForAccessibility: (announcement) => {
    // Use ARIA live region for announcements on web
    if (typeof document !== 'undefined') {
      const liveRegion = document.getElementById('a11y-announcer') || (() => {
        const div = document.createElement('div');
        div.id = 'a11y-announcer';
        div.setAttribute('aria-live', 'polite');
        div.setAttribute('aria-atomic', 'true');
        div.style.position = 'absolute';
        div.style.left = '-10000px';
        div.style.width = '1px';
        div.style.height = '1px';
        div.style.overflow = 'hidden';
        document.body.appendChild(div);
        return div;
      })();
      liveRegion.textContent = announcement;
    }
  }
};

// Legacy function for backward compatibility
const legacySendAccessibilityEvent = (reactTag, eventType) => {
  // No-op for web platform - accessibility events are handled by browser
  console.warn('legacySendAccessibilityEvent is not available on web platform');
};

// Export both the full AccessibilityInfo object and the legacy function
module.exports = AccessibilityInfo;
module.exports.legacySendAccessibilityEvent = legacySendAccessibilityEvent;
export default AccessibilityInfo;
export { legacySendAccessibilityEvent };