// Platform shim for web compatibility
// This resolves the ../Utilities/Platform import issue

import { Platform } from 'react-native';

module.exports = Platform;
export default Platform;