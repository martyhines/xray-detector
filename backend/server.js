const express = require('express');
const multer = require('multer');
const cors = require('cors');

const app = express();
app.use(cors());
const upload = multer();

function simpleDeepForensicsPlaceholder(buffer) {
  // TODO: Replace with real model inference (ONNX/PyTorch)
  // Heuristic placeholder
  const sizeKb = Math.round(buffer.length / 1024);
  let confidence = 60;
  let details = [`File size ~${sizeKb}KB`];
  if (sizeKb < 50) { confidence = 40; details.push('Very small file (suspicious)'); }
  return { confidence, status: confidence >= 70 ? 'Likely Authentic' : confidence >= 40 ? 'Uncertain' : 'Likely AI Generated', details };
}

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'no file' });
    const buffer = req.file.buffer;
    const base = simpleDeepForensicsPlaceholder(buffer);
    // Optional GPT-5 advisory could go here (requires OPENAI_API_KEY)
    return res.json(base);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend listening on ${PORT}`));