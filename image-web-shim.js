// Minimal Image shim for web platform
// Basic web-compatible Image component

const Image = {
  // Static methods that might be used
  getSize: (uri, success, failure) => {
    const img = new window.Image();
    img.onload = () => success(img.width, img.height);
    img.onerror = failure || (() => {});
    img.src = uri;
  },
  
  prefetch: (url) => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }
};

module.exports = Image;
module.exports.default = Image;