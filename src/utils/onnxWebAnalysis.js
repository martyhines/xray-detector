// ONNX Runtime Web Analysis Utility
class ONNXWebAnalyzer {
  constructor() {
    this.session = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    const modelUrl = window.AppConfig?.ONNX_WEB?.MODEL_URL;
    if (!modelUrl) throw new Error('ONNX model URL not configured');
    // Lazy load ort-web if not present
    if (typeof ort === 'undefined') {
      throw new Error('onnxruntime-web not loaded');
    }
    this.session = await ort.InferenceSession.create(modelUrl, { executionProviders: ['wasm'] });
    this.initialized = true;
  }

  async analyzeImage(file) {
    await this.init();
    const { inputTensor, width, height } = await this.fileToTensor(file);
    const feeds = { input: inputTensor };
    const output = await this.session.run(feeds);
    // Assume single output named 'prob' with shape [1,2] => [authentic, ai]
    const out = output[Object.keys(output)[0]].data;
    const aiProb = out.length >= 2 ? out[1] : (out[0] || 0.5);
    const confidence = Math.round(aiProb * 100);
    const status = aiProb > 0.7 ? 'Likely AI Generated' : aiProb > 0.4 ? 'Suspicious' : 'Likely Authentic';
    return {
      confidence,
      status,
      details: [`ONNX Web model inference completed (${width}x${height})`],
      method: 'ONNX Runtime Web',
      aiProbability: aiProb
    };
  }

  async fileToTensor(file) {
    const img = await this.createImage(file);
    const size = window.AppConfig?.ONNX_WEB?.INPUT_SIZE || 224;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(img, 0, 0, size, size);
    const imageData = ctx.getImageData(0, 0, size, size).data;
    const mean = window.AppConfig?.ONNX_WEB?.MEAN || [0.5, 0.5, 0.5];
    const std = window.AppConfig?.ONNX_WEB?.STD || [0.5, 0.5, 0.5];
    const data = new Float32Array(size * size * 3);
    let di = 0;
    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i] / 255;
      const g = imageData[i + 1] / 255;
      const b = imageData[i + 2] / 255;
      data[di] = (r - mean[0]) / std[0];
      data[di + size * size] = (g - mean[1]) / std[1];
      data[di + 2 * size * size] = (b - mean[2]) / std[2];
      di++;
    }
    const inputTensor = new ort.Tensor('float32', data, [1, 3, size, size]);
    return { inputTensor, width: img.width, height: img.height };
  }

  createImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
}

window.ONNXWebAnalyzer = ONNXWebAnalyzer;