// RCTAlertManager shim for web compatibility
// Provides web-compatible Alert functionality

const RCTAlertManager = {
  alertWithArgs: (args, callback) => {
    const { title, message, buttons, type } = args || {};
    
    // Use browser's native alert/confirm for simple cases
    if (!buttons || buttons.length === 0) {
      window.alert(message || title || '');
      if (callback) callback(0);
      return;
    }
    
    if (buttons.length === 1) {
      window.alert(message || title || '');
      if (callback) callback(0);
      return;
    }
    
    // For multiple buttons, use confirm dialog
    if (buttons.length === 2) {
      const result = window.confirm((title ? title + '\n\n' : '') + (message || ''));
      if (callback) callback(result ? 1 : 0);
      return;
    }
    
    // For more complex cases, fall back to alert
    // In a real app, you might want to use a custom modal library
    window.alert((title ? title + '\n\n' : '') + (message || ''));
    if (callback) callback(0);
  }
};

module.exports = RCTAlertManager;
export default RCTAlertManager;