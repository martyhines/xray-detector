// Calibration utilities for ensemble weights
(function() {
  function parseQuery() {
    const q = {};
    const s = window.location.search.slice(1).split('&').filter(Boolean);
    s.forEach(kv => { const [k, v] = kv.split('='); q[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
    return q;
  }

  function combineSample(sample, weights) {
    const comp = sample.components || {};
    const t = (comp.traditional?.confidence ?? 50);
    const e = (comp.enhancedAI?.confidence ?? 50);
    const tf = (comp.tensorflow?.confidence ?? 50);
    const onnx = (comp.onnx?.confidence ?? 50);
    const w = weights;
    const sumW = (w.traditional + w.enhancedAI + w.tensorflow + w.onnxWeb) || 1;
    const score = (t * w.traditional + e * w.enhancedAI + tf * w.tensorflow + onnx * w.onnxWeb) / sumW;
    const aiProb = ((comp.traditional?.aiProbability ?? 0.5) * w.traditional + (comp.enhancedAI?.aiProbability ?? 0.5) * w.enhancedAI + (comp.tensorflow?.aiProbability ?? 0.5) * w.tensorflow + (comp.onnx?.aiProbability ?? 0.5) * w.onnxWeb) / sumW;
    return { score, aiProb };
  }

  function evaluateDataset(samples, weights, threshold = 0.5) {
    let tp = 0, tn = 0, fp = 0, fn = 0;
    for (const s of samples) {
      const { aiProb } = combineSample(s, weights);
      const predAI = aiProb >= threshold;
      const isAI = !!s.label; // 1 for AI, 0 for authentic
      if (predAI && isAI) tp++; else if (predAI && !isAI) fp++; else if (!predAI && !isAI) tn++; else fn++;
    }
    const acc = (tp + tn) / Math.max(1, samples.length);
    const prec = tp / Math.max(1, tp + fp);
    const rec = tp / Math.max(1, tp + fn);
    const f1 = (prec + rec) > 0 ? (2 * prec * rec) / (prec + rec) : 0;
    return { acc, f1, tp, tn, fp, fn };
  }

  function gridSearch(samples) {
    const steps = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    let best = { weights: null, threshold: 0.5, acc: 0, f1: 0 };
    for (const wt of steps) {
      for (const we of steps) {
        for (const won of steps) {
          const wtf = 0; // keep TF disabled by default unless enabled
          const wsum = wt + we + won + wtf;
          if (wsum <= 0) continue;
          const w = { traditional: wt, enhancedAI: we, onnxWeb: won, tensorflow: wtf };
          for (const th of [0.4, 0.5, 0.6, 0.7]) {
            const m = evaluateDataset(samples, w, th);
            if (m.f1 > best.f1 || (m.f1 === best.f1 && m.acc > best.acc)) {
              best = { weights: w, threshold: th, acc: m.acc, f1: m.f1 };
            }
          }
        }
      }
    }
    return best;
  }

  async function loadJSONFile(file) {
    const text = await file.text();
    return JSON.parse(text);
  }

  function persistWeights(best) {
    try {
      const current = window.AppConfig?.WEIGHTS?.ENSEMBLE || {};
      const next = { ...current, ...best.weights };
      window.localStorage.setItem('ensembleWeights', JSON.stringify(next));
      window.localStorage.setItem('ensembleThreshold', String(best.threshold));
      // Apply live
      if (window.AppConfig?.WEIGHTS?.ENSEMBLE) {
        Object.assign(window.AppConfig.WEIGHTS.ENSEMBLE, next);
      }
      console.log('Calibration applied:', next, 'threshold:', best.threshold);
    } catch (e) {
      console.warn('Failed to persist weights:', e);
    }
  }

  function injectUI() {
    const btn = document.createElement('div');
    btn.style.position = 'fixed';
    btn.style.bottom = '20px';
    btn.style.right = '20px';
    btn.style.zIndex = '9999';
    btn.innerHTML = '<input type="file" id="calibFile" accept="application/json" hidden><button class="btn btn-secondary btn-small" id="calibBtn"><i class="fas fa-sliders-h"></i> Calibrate</button>';
    document.body.appendChild(btn);
    const input = btn.querySelector('#calibFile');
    const trigger = btn.querySelector('#calibBtn');
    trigger.onclick = () => input.click();
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const data = await loadJSONFile(file);
        if (!Array.isArray(data)) throw new Error('JSON must be an array of samples');
        const best = gridSearch(data);
        persistWeights(best);
        alert(`Calibration done. Acc: ${(best.acc*100).toFixed(1)}% F1: ${best.f1.toFixed(3)}\nWeights: ${JSON.stringify(best.weights)}\nThreshold: ${best.threshold}`);
      } catch (err) {
        alert('Calibration failed: ' + err.message);
      }
    };
  }

  // Apply stored weights if present
  try {
    const stored = window.localStorage.getItem('ensembleWeights');
    if (stored && window.AppConfig?.WEIGHTS?.ENSEMBLE) {
      Object.assign(window.AppConfig.WEIGHTS.ENSEMBLE, JSON.parse(stored));
    }
  } catch {}

  const q = parseQuery();
  if (q.calibrate === '1' || q.calibrate === 'true') {
    window.addEventListener('DOMContentLoaded', injectUI);
  }

  window.Calibration = { gridSearch, evaluateDataset };
})();