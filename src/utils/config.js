// Global configuration for the Medical Image Authenticity Detector
(function() {
  const defaultConfig = {
    FEATURES: {
      ENABLE_BACKEND: true, // set to true to enable server-side deep forensics
      ENABLE_TENSORFLOW: false // set to true to enable in-browser TensorFlow analysis
    },
    BACKEND_URL: 'http://localhost:3001' // e.g., 'https://your-backend.example.com'
  };
  // Expose globally
  window.AppConfig = window.AppConfig || defaultConfig;
})();