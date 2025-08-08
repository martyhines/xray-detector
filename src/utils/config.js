// Global configuration for the Medical Image Authenticity Detector
(function() {
  const defaultConfig = {
    FEATURES: {
      ENABLE_BACKEND: false // set to true to enable server-side deep forensics
    },
    BACKEND_URL: '' // e.g., 'https://your-backend.example.com'
  };
  // Expose globally
  window.AppConfig = window.AppConfig || defaultConfig;
})();