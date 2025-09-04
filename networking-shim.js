// RCTNetworking shim for web compatibility
// This provides no-op implementations for React Native networking modules

// Web-compatible networking implementation
const RCTNetworking = {
  sendRequest: (method, trackingName, url, headers, data, responseType, incrementalUpdates, timeout, callback) => {
    // Use native fetch for web requests
    const fetchOptions = {
      method,
      headers: headers || {},
    };
    
    if (data) {
      fetchOptions.body = data;
    }
    
    fetch(url, fetchOptions)
      .then(response => {
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
        
        return response.text().then(responseText => {
          if (callback) {
            callback([
              response.status,
              responseHeaders,
              responseText
            ]);
          }
        });
      })
      .catch(error => {
        if (callback) {
          callback([0, {}, error.message]);
        }
      });
  },
  
  abortRequest: (requestId) => {
    // No-op for web - fetch doesn't support abort in the same way
    console.warn('RCTNetworking.abortRequest is not fully supported on web');
  },
  
  clearCookies: (callback) => {
    // No-op for web - cookies are managed by the browser
    if (callback) callback(true);
  }
};

module.exports = RCTNetworking;
export default RCTNetworking;