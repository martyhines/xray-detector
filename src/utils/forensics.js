// Classical forensics utilities (browser)
// Provides ELA per-block, frequency ratios, and noise residual/PRNU/FPN proxies

(function() {
  const Forensics = {};

  function toImageDataFromFile(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve({ imageData: id, canvas, ctx });
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  async function computeELAFeatures(file, blockSize = 8, jpegQuality = 0.9) {
    const { imageData, canvas, ctx } = await toImageDataFromFile(file);
    const w = canvas.width, h = canvas.height;
    // Re-encode to JPEG and reload
    const jpegBlob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', jpegQuality));
    const recon = await new Promise((resolve, reject) => {
      const img2 = new Image();
      img2.onload = () => {
        const c2 = document.createElement('canvas');
        c2.width = w; c2.height = h;
        const x2 = c2.getContext('2d');
        x2.drawImage(img2, 0, 0, w, h);
        resolve(x2.getImageData(0, 0, w, h));
      };
      img2.onerror = reject;
      img2.src = URL.createObjectURL(jpegBlob);
    });

    const diff = new Float32Array(w * h);
    const data1 = imageData.data, data2 = recon.data;
    for (let i = 0, p = 0; i < data1.length; i += 4, p++) {
      const d = (Math.abs(data1[i] - data2[i]) + Math.abs(data1[i+1] - data2[i+1]) + Math.abs(data1[i+2] - data2[i+2])) / 3;
      diff[p] = d;
    }
    // Per-block stats
    const bx = Math.floor(w / blockSize), by = Math.floor(h / blockSize);
    let sum = 0, sum2 = 0, n = 0, highBlocks = 0;
    for (let y = 0; y < by; y++) {
      for (let x = 0; x < bx; x++) {
        let bsum = 0, bn = 0;
        for (let yy = 0; yy < blockSize; yy++) {
          const row = (y * blockSize + yy) * w + (x * blockSize);
          for (let xx = 0; xx < blockSize; xx++) {
            bsum += diff[row + xx];
            bn++;
          }
        }
        const bmean = bsum / Math.max(1, bn);
        sum += bmean; sum2 += bmean * bmean; n++;
        if (bmean > 15) highBlocks++; // heuristic threshold
      }
    }
    const mean = n ? sum / n : 0;
    const variance = n ? (sum2 / n - mean * mean) : 0;
    const std = Math.sqrt(Math.max(0, variance));
    const highRatio = n ? highBlocks / n : 0;

    // Heuristic score: higher ELA suggests tampering (but also re-compression)
    let score = Math.min(100, Math.round((mean * 0.5 + std * 1.5 + highRatio * 100 * 0.3)));
    const details = [];
    if (highRatio > 0.2) details.push('High ELA block ratio');
    if (std > 10) details.push('High ELA variability');
    if (mean > 5) details.push('Elevated average ELA');

    return { method: 'ELA', score, features: { mean, std, highRatio, blockSize }, details };
  }

  async function computeFrequencyFeatures(file) {
    const { imageData } = await toImageDataFromFile(file);
    const w = imageData.width, h = imageData.height, data = imageData.data;
    // Convert to grayscale
    const gray = new Float32Array(w * h);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      gray[p] = (0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2]) / 255;
    }
    // Simple high-pass vs low-pass energy via blur subtraction
    // Box blur 3x3
    const blur = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let s = 0; let c = 0;
        for (let yy = -1; yy <= 1; yy++) {
          for (let xx = -1; xx <= 1; xx++) {
            s += gray[(y + yy) * w + (x + xx)]; c++;
          }
        }
        blur[y * w + x] = s / c;
      }
    }
    let high = 0, low = 0;
    for (let p = 0; p < gray.length; p++) {
      const lp = blur[p] || gray[p];
      const hp = Math.abs(gray[p] - lp);
      low += lp * lp;
      high += hp * hp;
    }
    const total = low + high;
    const highRatio = total > 0 ? high / total : 0;

    // Heuristic: extremely low or extremely high can be suspicious
    let score = 50;
    if (highRatio < 0.05) score += 20; // too smooth (AI-like)
    if (highRatio > 0.35) score += 10; // over-sharpened / noisy
    const details = [`High/Total energy ratio: ${highRatio.toFixed(3)}`];
    return { method: 'Frequency', score: Math.min(100, Math.max(0, Math.round(score))), features: { highRatio }, details };
  }

  async function computeNoiseResidualFeatures(file) {
    const { imageData } = await toImageDataFromFile(file);
    const w = imageData.width, h = imageData.height, data = imageData.data;
    const gray = new Float32Array(w * h);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      gray[p] = (0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2]) / 255;
    }
    // Residual via Gaussian blur subtraction (sigma ~1)
    const kernel = [1, 2, 1];
    const tmp = new Float32Array(w * h);
    // horizontal
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 0, ksum = 0;
        for (let k = -1; k <= 1; k++) {
          const xx = Math.min(w - 1, Math.max(0, x + k));
          const kv = kernel[k + 1]; s += gray[y * w + xx] * kv; ksum += kv;
        }
        tmp[y * w + x] = s / ksum;
      }
    }
    // vertical
    const blur = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 0, ksum = 0;
        for (let k = -1; k <= 1; k++) {
          const yy = Math.min(h - 1, Math.max(0, y + k));
          const kv = kernel[k + 1]; s += tmp[yy * w + x] * kv; ksum += kv;
        }
        blur[y * w + x] = gray[y * w + x] - (s / ksum);
      }
    }
    // PRNU/FPN proxies: row/column variance and residual variance
    let varRow = 0, varCol = 0;
    // Row variance
    for (let y = 0; y < h; y++) {
      let m = 0; for (let x = 0; x < w; x++) m += blur[y * w + x]; m /= w;
      let v = 0; for (let x = 0; x < w; x++) { const d = blur[y * w + x] - m; v += d * d; }
      varRow += v / w;
    }
    varRow /= h;
    // Column variance
    for (let x = 0; x < w; x++) {
      let m = 0; for (let y = 0; y < h; y++) m += blur[y * w + x]; m /= h;
      let v = 0; for (let y = 0; y < h; y++) { const d = blur[y * w + x] - m; v += d * d; }
      varCol += v / h;
    }
    varCol /= w;

    const residualVar = (() => {
      let m = 0; for (let i = 0; i < blur.length; i++) m += blur[i]; m /= blur.length;
      let v = 0; for (let i = 0; i < blur.length; i++) { const d = blur[i] - m; v += d * d; }
      return v / blur.length;
    })();

    // Heuristic scoring: too uniform residual suggests AI; strong line-wise FPN suggests real detector
    let score = 50;
    if (residualVar < 0.0005) score += 20; // suspiciously uniform
    if (varRow > 0.002 || varCol > 0.002) score -= 10; // detector FPN suggests real acquisition
    const details = [
      `ResidualVar: ${residualVar.toExponential(2)}`,
      `RowVar: ${varRow.toExponential(2)}`,
      `ColVar: ${varCol.toExponential(2)}`
    ];
    // Higher score => more suspicious; we invert for “authenticity” later if needed
    return { method: 'NoiseResidual', score: Math.min(100, Math.max(0, Math.round(score))), features: { residualVar, varRow, varCol }, details };
  }

  Forensics.computeELAFeatures = computeELAFeatures;
  Forensics.computeFrequencyFeatures = computeFrequencyFeatures;
  Forensics.computeNoiseResidualFeatures = computeNoiseResidualFeatures;

  window.Forensics = Forensics;
})();