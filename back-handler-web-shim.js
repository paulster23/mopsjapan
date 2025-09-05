// Minimal BackHandler shim for web platform
// Only handles the specific import that's failing

const BackHandler = {
  addEventListener: () => {
    // No-op for web - return empty subscription  
    return { remove: () => {} };
  },
  
  removeEventListener: () => {
    // No-op
  },
  
  exitApp: () => {
    // Can't exit web app
  }
};

module.exports = BackHandler;
module.exports.default = BackHandler;