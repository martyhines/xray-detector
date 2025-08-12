# Medical Image Authenticity Detector (X‑Ray/MRI/CT)

Detects AI‑generated or doctored medical images and flags suspicious content. Runs as a static site (GitHub Pages) with optional backend (Render/Railway/Fly) for deep forensics and AI advisory.

Live demo (GitHub Pages): `https://martyhines.github.io/xray-detector/`

## Features at a glance
- Traditional forensics: metadata, noise, compression, statistics, frequency domain, plus added ELA/frequency/noise‑residual signals
- Enhanced AI analysis: stronger classical + learned features (client‑side)
- ONNX Runtime Web (client): small model inference in the browser
- Backend deep forensics (optional): ONNX Runtime Node + image preprocessing (via sharp)
- GPT‑based expert advisory (optional): concise forensic guidance using OpenAI
- DICOM support: proper parsing, windowing/inversion, and display; classification skipped for `.dcm`
- Ensemble fusion with configurable weights and client‑side calibration tool

## How it works (high level)
The app runs several analysis pipelines in parallel and then fuses their “opinions” into one result:

1) Traditional Analysis (always on)
   - Reads image, inspects metadata, compression, noise/statistical patterns, frequency spectrum
   - Includes advanced classical forensics like Error Level Analysis (ELA), frequency features, noise residuals

2) Enhanced AI Analysis (client)
   - Combines additional engineered features for stronger detection signals

3) ONNX Runtime Web (client)
   - Runs a small ONNX model in the browser when configured

4) Backend Deep Forensics (server, optional)
   - If enabled, the image is also sent to a Node/Express backend for deep model inference via ONNX Runtime Node
   - The backend can also attach a GPT advisory (short expert‑style summary)

Results from these pipelines are weighted and combined into an overall authenticity score and verdict.

## DICOM handling
- DICOM (`.dcm`) files are parsed via `dicom-parser` (CDN with local fallback)
- Pixel data is correctly windowed/inverted; `MONOCHROME1` is handled; rescale slope/intercept applied
- Classification is skipped for DICOMs (they’re inherently medical); typical image preprocessing steps are not applied to DICOM pixel data

## Client‑side calibration (optional but recommended)
Calibrate how strongly each pipeline contributes to the final decision using a small validation set you provide.

Enable:
- Open the site with `?calibrate=1` (e.g., `https://martyhines.github.io/xray-detector/?calibrate=1`)
- A “Calibrate” button appears (bottom‑right)

Provide data:
- Upload a JSON file describing a set of images with ground‑truth labels and the per‑method scores the app produced for them

JSON shape example:
```json
[
  {
    "label": 1,
    "components": {
      "traditional": { "confidence": 62, "aiProbability": 0.55 },
      "enhancedAI":  { "confidence": 71, "aiProbability": 0.68 },
      "onnx":        { "confidence": 77, "aiProbability": 0.74 }
    }
  },
  {
    "label": 0,
    "components": {
      "traditional": { "confidence": 35, "aiProbability": 0.28 },
      "enhancedAI":  { "confidence": 41, "aiProbability": 0.32 },
      "onnx":        { "confidence": 38, "aiProbability": 0.30 }
    }
  }
]
```
- `label`: 1 = AI/fake, 0 = real/authentic
- Include methods you use (e.g., `traditional`, `enhancedAI`, `onnx`, `tensorflow`)
- The tool finds weights that best separate real vs AI for your data and saves them to your browser (can be copied into code for global defaults)

Reset: clear `ensembleWeights` and `ensembleThreshold` from localStorage.

## Configuration
Global config is defined in `src/utils/config.js`:

```js
window.AppConfig = {
  FEATURES: {
    ENABLE_BACKEND: true,        // call server for deep forensics + advisory
    ENABLE_TENSORFLOW: false,    // TF.js is available but disabled by default
    ENABLE_ONNX_WEB: true,       // enable client‑side ONNX Runtime Web
    ENABLE_GPT_ADVISORY: true    // show advisory panel when available
  },
  BACKEND_URL: 'https://xray-detector-bcc7.onrender.com',
  ONNX_WEB: {
    MODEL_URL: 'public/models/tiny_ai_detector.onnx',
    INPUT_NAME: 'input',
    INPUT_SIZE: 224
  },
  WEIGHTS: {
    CLASSICAL: {
      metadata: 0.05, noise: 0.15, compression: 0.10, statistical: 0.15,
      frequency: 0.10, mriDetection: 0.10, mriAnalysis: 0.10,
      ctDetection: 0.10, ctAnalysis: 0.10, forensics: 0.10
    },
    ENSEMBLE: {
      traditional: 0.2, onnxWeb: 0.3, tensorflow: 0.0, enhancedAI: 0.3, backend: 0.2
    }
  },
  ADVISORY: { ENABLE_GPT_ADVISORY: true }
};
```

Notes:
- TensorFlow is supported but off by default (can be slower and not necessary for best accuracy here)
- Place your ONNX model at `public/models/...` and update `MODEL_URL`
- For GitHub Pages, absolute worker paths and CDN fallbacks are already handled

## Backend (optional: deep forensics + GPT advisory)
Location: `backend/server.js`

Endpoints:
- `GET /health` – liveness
- `GET /advisory-status` – whether OpenAI SDK/key is available
- `GET /advisory-test` – quick sanity check for OpenAI
- `POST /analyze` – accepts `multipart/form-data` with `image`; returns JSON with confidence/status/details and advisory if enabled

Environment variables:
- `PORT` (default `3001`)
- `OPENAI_API_KEY` (optional, for advisory)
- `ONNX_MODEL_PATH` (optional path to `.onnx` for deep model)
- `ONNX_INPUT_NAME` (default `input`)
- `ONNX_INPUT_SIZE` (default `224`)

Install & run locally:
```
cd backend
npm install
# Optional (for deep model): npm i onnxruntime-node sharp
npm start
# Server on http://localhost:3001
```

Render deployment (recommended simple setup):
- Service type: Web Service
- Root Directory: `backend`
- Build Command: `npm install` (add `npm i onnxruntime-node sharp` if using deep model)
- Start Command: `node server.js`
- Set env vars (`OPENAI_API_KEY`, `ONNX_MODEL_PATH`, `ONNX_INPUT_NAME`, `ONNX_INPUT_SIZE`)

Frontend → backend wiring:
- Set `BACKEND_URL` in `src/utils/config.js` to your deployed URL
- When enabled, the frontend will POST the uploaded image to `/analyze` and fuse the server’s result with local methods

## DICOM parser robustness
The app loads `dicom-parser` from CDN with automatic fallbacks to an alternate CDN and a local copy (`public/js/dicomParser.min.js`). This avoids broken parsing on slow or blocked networks.

## Troubleshooting
- DICOM won’t parse: ensure network allows CDN or that local fallback exists; confirm the file is valid `.dcm`
- Backend hangs on first request: cold starts; hit `/health` once to warm it up
- OpenAI errors (429 quota): add billing/credits; 400 “signal” error is retried automatically without AbortController
- Render build fails in monorepo: set Root Directory to `backend` in service settings
- ONNX Web model not found: put your model under `public/models/` and update `MODEL_URL`

## Development notes
- Preprocessing size for standard images: 256×256
- DICOM: classification skipped; DICOM‑specific windowing/inversion applied
- TensorFlow worker present but disabled by default via config
- Detailed per‑method breakdown and advisory panel are rendered in the UI; advisory shown when backend returns it

