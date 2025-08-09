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
let openai = null;
let sharp = null;
const ONNX_INPUT_NAME = process.env.ONNX_INPUT_NAME || 'input';
const ONNX_INPUT_SIZE = parseInt(process.env.ONNX_INPUT_SIZE || '224', 10);

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

async function ensureSharp() {
  if (!sharp) {
    try { sharp = require('sharp'); } catch { sharp = null; }
  }
  return sharp;
}

async function preprocessForOnnx(buffer) {
  const s = await ensureSharp();
  if (!s) return null;
  const size = ONNX_INPUT_SIZE;
  const img = await s(buffer).resize(size, size, { fit: 'cover' }).toFormat('png').raw().toBuffer({ resolveWithObject: true });
  const { data, info } = img; // RGBA
  const rgb = new Float32Array(size * size * 3);
  let di = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    rgb[di] = r; // R
    rgb[di + size * size] = g; // G
    rgb[di + 2 * size * size] = b; // B
    di++;
  }
  return new ort.Tensor('float32', rgb, [1, 3, size, size]);
}

function simpleDeepForensicsPlaceholder(buffer) {
  // TODO: Replace with real model inference (ONNX/PyTorch)
  const sizeKb = Math.round(buffer.length / 1024);
  let confidence = 60;
  let details = [`File size ~${sizeKb}KB`];
  if (sizeKb < 50) { confidence = 40; details.push('Very small file (suspicious)'); }
  return { confidence, status: confidence >= 70 ? 'Likely Authentic' : confidence >= 40 ? 'Uncertain' : 'Likely AI Generated', details };
}

async function getOpenAI() {
  if (!OPENAI_API_KEY) return null;
  if (!openai) {
    try {
      const OpenAI = require('openai');
      openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    } catch (e) {
      console.warn('OpenAI SDK init failed:', e.message);
      return null;
    }
  }
  return openai;
}

async function gptAdvisory(buffer, classicalHints = []) {
  const client = await getOpenAI();
  if (!client) return { text: null, error: 'sdk-not-available' };
  const hintText = classicalHints.filter(Boolean).slice(0, 10).join('; ');
  const system = 'You are a medical image forensics assistant. Provide concise, actionable guidance to a radiologist about potential AI generation or manipulation, citing specific forensic cues.';
  const user = `Context: ${hintText || 'No classical hints available'}. Task: Given these signals, provide 2-4 bullet point advisories on what to inspect (ELA hotspots, frequency anomalies, PRNU inconsistencies, metadata red flags), and a brief one-line verdict.`;
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), 8000);
  try {
    // Pass signal via options (second arg), not in params
    const resp = await client.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.2,
        max_tokens: 200
      },
      { signal: controller.signal }
    );
    const text = resp.choices?.[0]?.message?.content?.trim();
    return { text: text || null, error: null };
  } catch (e) {
    // If 400 due to unrecognized arg (older SDK), retry once without signal
    if (String(e.message || '').includes('Unrecognized request argument') || String(e.status || '').startsWith('400')) {
      try {
        const resp = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          temperature: 0.2,
          max_tokens: 200
        });
        const text = resp.choices?.[0]?.message?.content?.trim();
        return { text: text || null, error: null };
      } catch (e2) {
        console.warn('OpenAI advisory retry failed:', e2.message);
        return { text: null, error: e2.message || 'unknown-error' };
      }
    }
    console.warn('OpenAI advisory failed:', e.message);
    return { text: null, error: e.message || 'unknown-error' };
  } finally {
    clearTimeout(to);
  }
}

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

async function runOnnx(buffer) {
  const session = await ensureOnnx();
  if (!session) return null;
  // Try real preprocessing, fallback to zero tensor if not available
  let tensor = null;
  try { tensor = await preprocessForOnnx(buffer); } catch { tensor = null; }
  if (!tensor) {
    const size = ONNX_INPUT_SIZE;
    tensor = new Float32Array(size * size * 3);
    tensor = new ort.Tensor('float32', tensor, [1, 3, size, size]);
  }
  const feeds = { [ONNX_INPUT_NAME]: tensor };
  const out = await session.run(feeds);
  const first = out[Object.keys(out)[0]].data;
  const aiProb = first.length >= 2 ? first[1] : (first[0] || 0.5);
  const confidence = Math.round(aiProb * 100);
  const status = aiProb > 0.7 ? 'Likely AI Generated' : aiProb > 0.4 ? 'Uncertain' : 'Likely Authentic';
  return { confidence, status, details: ['Server ONNX inference executed'] };
}

app.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'no file' });
    const buffer = req.file.buffer;

    let base = await runOnnx(buffer);
    if (!base) base = simpleDeepForensicsPlaceholder(buffer);

    const hints = base.details || [];
    const { text, error } = await gptAdvisory(buffer, hints);
    base.advisoryStatus = error ? `error: ${error}` : 'ok';
    if (text) base.details.push(`Advisory: ${text}`);

    return res.json(base);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server error' });
  }
});

app.get('/advisory-status', async (req, res) => {
  try {
    const hasKey = !!OPENAI_API_KEY;
    const client = await getOpenAI();
    return res.json({ hasKey, sdkLoaded: !!client });
  } catch (e) {
    return res.status(500).json({ error: 'status check failed' });
  }
});

app.get('/advisory-test', async (req, res) => {
  try {
    const client = await getOpenAI();
    if (!client) return res.json({ ok: false, reason: 'sdk-not-available' });
    const r = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Return the single word: OK' }],
      temperature: 0,
      max_tokens: 5
    });
    const text = r.choices?.[0]?.message?.content?.trim();
    return res.json({ ok: true, text });
  } catch (e) {
    return res.json({ ok: false, error: e.message || 'unknown-error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend listening on ${PORT}`));