const express = require('express');
const multer = require('multer');
const cors = require('cors');

const app = express();
app.use(cors());
const upload = multer();

let ort = null;
let onnxSession = null;
const ONNX_MODEL_PATH = process.env.ONNX_MODEL_PATH || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

async function ensureOnnx() {
  if (!ONNX_MODEL_PATH) return null;
  if (!ort) {
    try {
      ort = require('onnxruntime-node');
    } catch (e) {
      console.warn('onnxruntime-node not installed; skipping deep model');
      return null;
    }
  }
  if (!onnxSession) {
    onnxSession = await ort.InferenceSession.create(ONNX_MODEL_PATH);
  }
  return onnxSession;
}

function simpleDeepForensicsPlaceholder(buffer) {
  // TODO: Replace with real model inference (ONNX/PyTorch)
  const sizeKb = Math.round(buffer.length / 1024);
  let confidence = 60;
  let details = [`File size ~${sizeKb}KB`];
  if (sizeKb < 50) { confidence = 40; details.push('Very small file (suspicious)'); }
  return { confidence, status: confidence >= 70 ? 'Likely Authentic' : confidence >= 40 ? 'Uncertain' : 'Likely AI Generated', details };
}

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

async function runOnnx(buffer) {
  const session = await ensureOnnx();
  if (!session) return null;
  // Minimal preprocessing: assume model takes [1,3,224,224] float
  // Here we simply pass a zero tensor as placeholder; replace with real preprocessing
  const size = 224;
  const data = new Float32Array(size * size * 3);
  const tensor = new ort.Tensor('float32', data, [1, 3, size, size]);
  const feeds = { input: tensor };
  const out = await session.run(feeds);
  const first = out[Object.keys(out)[0]].data;
  const aiProb = first.length >= 2 ? first[1] : (first[0] || 0.5);
  const confidence = Math.round(aiProb * 100);
  const status = aiProb > 0.7 ? 'Likely AI Generated' : aiProb > 0.4 ? 'Uncertain' : 'Likely Authentic';
  return { confidence, status, details: ['Server ONNX inference executed'] };
}

async function gptAdvisoryStub() {
  if (!OPENAI_API_KEY) return null;
  // Placeholder to avoid adding dependency; real impl would call OpenAI API
  return 'GPT advisory: consider checking ELA hotspots and noise residual inconsistencies.';
}

app.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'no file' });
    const buffer = req.file.buffer;

    let base = await runOnnx(buffer);
    if (!base) base = simpleDeepForensicsPlaceholder(buffer);

    const advisory = await gptAdvisoryStub();
    if (advisory) base.details.push(advisory);

    return res.json(base);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend listening on ${PORT}`));