# X-Ray / Medical Image Authenticity Detector

## Backend (optional, for deep forensics and GPT-5 advisory)

A minimal Node backend is provided in `backend/server.js`.

### Setup
```
cd backend
npm init -y
npm install express multer cors
node server.js
```
By default it listens on port 3001 and exposes `POST /analyze` accepting form-data with `image`.

### Enable backend in app
Edit `src/utils/config.js` and set:
```
window.AppConfig = {
  FEATURES: { ENABLE_BACKEND: true },
  BACKEND_URL: 'http://localhost:3001'
};
```

The frontend will send the uploaded file to the backend for deep forensics and fuse the result with classical analysis.

Note: The backend currently uses a placeholder heuristic. Replace with ONNX/PyTorch models and (optional) GPT‑5 advisory using `OPENAI_API_KEY` when ready.
