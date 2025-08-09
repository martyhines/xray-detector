// Global configuration for the Medical Image Authenticity Detector
(function() {
  const defaultConfig = {
    FEATURES: {
      ENABLE_BACKEND: true, // set to true to enable server-side deep forensics
      ENABLE_TENSORFLOW: false, // set to true to enable in-browser TensorFlow analysis
      ENABLE_ONNX_WEB: true // enable lightweight ONNX Runtime Web model in browser
    },
    BACKEND_URL: 'https://xray-detector-bcc7.onrender.com', // e.g., 'https://your-backend.example.com'
    ONNX_WEB: {
      MODEL_URL: 'public/models/tiny_ai_detector.onnx', // place model at this path or set full URL
      INPUT_SIZE: 224,
      MEAN: [0.485, 0.456, 0.406],
      STD: [0.229, 0.224, 0.225]
    },
    WEIGHTS: {
      CLASSICAL: {
        metadata: 0.08,
        noise: 0.15,
        compression: 0.12,
        statistical: 0.15,
        frequency: 0.12,
        mriDetection: 0.08,
        mriAnalysis: 0.08,
        ctDetection: 0.08,
        ctAnalysis: 0.08
      },
      ENSEMBLE: {
        traditional: 0.3,
        onnxWeb: 0.3,
        tensorflow: 0.0,
        enhancedAI: 0.4
      }
    },
    ADVISORY: {
      ENABLE_GPT_ADVISORY: true // server-side uses OPENAI_API_KEY; this flag controls UI display
    }
  };
  // Expose globally
  window.AppConfig = window.AppConfig || defaultConfig;
})();