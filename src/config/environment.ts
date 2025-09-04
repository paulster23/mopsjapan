/**
 * Environment Configuration
 * Detects development vs production and provides appropriate URLs
 */

export interface EnvironmentConfig {
  isDevelopment: boolean;
  netlifyBaseUrl: string;
  environment: 'development' | 'production';
}

/**
 * Detect if we're running in development or production
 */
const detectEnvironment = (): EnvironmentConfig => {
  // Check if we're in development mode
  const isDevelopment = __DEV__ || 
    (typeof window !== 'undefined' && window.location?.hostname === 'localhost') ||
    process.env.NODE_ENV === 'development';

  return {
    isDevelopment,
    netlifyBaseUrl: isDevelopment 
      ? 'http://localhost:8888'  // Local Netlify dev server
      : 'https://mopsjapan.netlify.app',  // Production deployment
    environment: isDevelopment ? 'development' : 'production'
  };
};

export const environment = detectEnvironment();

/**
 * Get the appropriate Netlify base URL for current environment
 */
export const getNetlifyBaseUrl = (): string => {
  return environment.netlifyBaseUrl;
};

/**
 * Check if we're currently in development mode
 */
export const isDevelopment = (): boolean => {
  return environment.isDevelopment;
};

/**
 * Get current environment name
 */
export const getEnvironment = (): string => {
  return environment.environment;
};