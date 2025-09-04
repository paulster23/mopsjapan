// BaseViewConfig shim for web compatibility
// Provides basic view configuration for React Native components on web

const BaseViewConfig = {
  uiViewClassName: 'RCTView',
  bubblingEventTypes: {
    // Touch events
    topPress: {
      phasedRegistrationNames: {
        bubbled: 'onPress',
        captured: 'onPressCapture',
      },
    },
    topChange: {
      phasedRegistrationNames: {
        bubbled: 'onChange',
        captured: 'onChangeCapture',
      },
    },
    topFocus: {
      phasedRegistrationNames: {
        bubbled: 'onFocus',
        captured: 'onFocusCapture',
      },
    },
    topBlur: {
      phasedRegistrationNames: {
        bubbled: 'onBlur',
        captured: 'onBlurCapture',
      },
    },
    topSubmit: {
      phasedRegistrationNames: {
        bubbled: 'onSubmit',
        captured: 'onSubmitCapture',
      },
    },
    topEndEditing: {
      phasedRegistrationNames: {
        bubbled: 'onEndEditing',
        captured: 'onEndEditingCapture',
      },
    },
    topKeyPress: {
      phasedRegistrationNames: {
        bubbled: 'onKeyPress',
        captured: 'onKeyPressCapture',
      },
    },
  },
  directEventTypes: {
    topAccessibilityAction: {
      registrationName: 'onAccessibilityAction',
    },
    topAccessibilityTap: {
      registrationName: 'onAccessibilityTap',
    },
    topMagicTap: {
      registrationName: 'onMagicTap',
    },
    topAccessibilityEscape: {
      registrationName: 'onAccessibilityEscape',
    },
  },
  validAttributes: {
    // Basic view attributes
    style: true,
    testID: true,
    accessible: true,
    accessibilityLabel: true,
    accessibilityHint: true,
    accessibilityRole: true,
    accessibilityState: true,
    accessibilityValue: true,
    accessibilityActions: true,
    onAccessibilityAction: true,
    onAccessibilityTap: true,
    onMagicTap: true,
    onAccessibilityEscape: true,
    // Layout attributes
    pointerEvents: true,
    hitSlop: true,
    onLayout: true,
    // Touch attributes  
    onPress: true,
    onPressIn: true,
    onPressOut: true,
    onLongPress: true,
    // Standard HTML attributes for web compatibility
    id: true,
    className: true,
    tabIndex: true,
    role: true,
    'aria-label': true,
    'aria-labelledby': true,
    'aria-describedby': true,
    'aria-hidden': true,
    'aria-expanded': true,
    'aria-selected': true,
    'aria-checked': true,
    'aria-disabled': true,
    'aria-readonly': true,
    'aria-required': true,
    'aria-invalid': true,
    'aria-live': true,
    'aria-atomic': true,
    'aria-busy': true,
    'aria-relevant': true,
  },
};

module.exports = BaseViewConfig;
export default BaseViewConfig;