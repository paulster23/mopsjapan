// PlatformColorValueTypes shim for web compatibility
// Provides color constants and types for web

const PlatformColorValueTypes = {
  color: {
    semantic: {
      // iOS semantic colors
      label: '#000000',
      labelSecondary: '#3c3c43',
      labelTertiary: '#3c3c4399',
      labelQuaternary: '#3c3c432d',
      systemFill: '#78788033',
      secondarySystemFill: '#78788028',
      tertiarySystemFill: '#7676801e',
      quaternarySystemFill: '#74748014',
      placeholderText: '#3c3c434c',
      systemBackground: '#ffffff',
      secondarySystemBackground: '#f2f2f7',
      tertiarySystemBackground: '#ffffff',
      systemGroupedBackground: '#f2f2f7',
      secondarySystemGroupedBackground: '#ffffff',
      tertiarySystemGroupedBackground: '#f2f2f7',
      separator: '#3c3c43',
      opaqueSeparator: '#c6c6c8',
      link: '#007aff',
      systemBlue: '#007aff',
      systemGreen: '#34c759',
      systemIndigo: '#5856d6',
      systemOrange: '#ff9500',
      systemPink: '#ff2d92',
      systemPurple: '#af52de',
      systemRed: '#ff3b30',
      systemTeal: '#30b0c7',
      systemYellow: '#ffcc00',
    },
  },
};

// Export individual constants for compatibility
const Color = PlatformColorValueTypes.color;

module.exports = PlatformColorValueTypes;
module.exports.Color = Color;
export default PlatformColorValueTypes;
export { Color };