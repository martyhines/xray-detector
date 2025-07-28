# X-Ray Authenticity Detector

A modern web application for detecting AI-generated or doctored X-ray images. This tool helps medical professionals and researchers identify potentially manipulated medical images.

## Features

- **Drag & Drop Upload**: Easy image upload with drag-and-drop functionality
- **Real-time Analysis**: Advanced image analysis using multiple detection methods
- **Beautiful UI**: Modern, responsive design with smooth animations
- **Detailed Results**: Comprehensive analysis with confidence scores and breakdowns
- **Multiple Detection Methods**:
  - Metadata analysis
  - Noise pattern detection
  - Compression artifact analysis
  - Statistical pattern analysis
  - Frequency domain analysis

## How It Works

The application uses several sophisticated techniques to detect AI-generated or manipulated X-ray images:

1. **Metadata Analysis**: Examines file properties, size, and naming patterns
2. **Noise Pattern Detection**: Analyzes natural noise patterns that are often missing in AI-generated images
3. **Compression Artifact Analysis**: Detects unusual compression patterns that may indicate manipulation
4. **Statistical Analysis**: Examines pixel distribution and entropy patterns
5. **Frequency Domain Analysis**: Looks for patterns in the frequency domain that may indicate AI generation

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- No additional software installation required

### Running the Application

1. **Clone or download** the project files
2. **Open** `index.html` in your web browser
3. **Upload** an X-ray image by dragging and dropping or clicking the upload area
4. **Click** "Analyze Image" to start the detection process
5. **Review** the results and confidence scores

### File Requirements

- **Supported formats**: JPEG, PNG, BMP, TIFF
- **Maximum file size**: 10MB
- **Image type**: X-ray or medical images

## Project Structure

```
xray-detector/
├── index.html                 # Main HTML file
├── src/
│   ├── main.js               # Main application logic
│   ├── styles/
│   │   └── main.css          # Application styling
│   ├── components/
│   │   ├── uploadHandler.js  # File upload handling
│   │   └── resultDisplay.js  # Results display logic
│   └── utils/
│       └── imageAnalysis.js  # Image analysis algorithms
└── README.md                 # This file
```

## Technical Details

### Analysis Methods

#### 1. Metadata Analysis
- File size validation
- File type verification
- Filename pattern detection
- Creation/modification date analysis

#### 2. Noise Pattern Analysis
- Local variance calculation
- Natural noise level assessment
- Smoothness detection (common in AI-generated images)

#### 3. Compression Artifact Detection
- Block variance analysis
- JPEG compression pattern detection
- Unusual compression ratios

#### 4. Statistical Pattern Analysis
- Pixel histogram analysis
- Entropy calculation
- Distribution pattern recognition

#### 5. Frequency Domain Analysis
- Spatial frequency patterns
- Edge detection analysis
- Pattern consistency evaluation

### Confidence Scoring

The application provides confidence scores from 0-100%:

- **70-100%**: Likely Authentic
- **40-69%**: Uncertain (Manual review recommended)
- **0-39%**: Likely AI Generated or Manipulated

## Future Enhancements

- **Machine Learning Integration**: Add trained models for more accurate detection
- **API Integration**: Connect to external AI detection services
- **Batch Processing**: Analyze multiple images at once
- **Export Results**: Save analysis reports
- **Advanced Filters**: More sophisticated detection algorithms
- **User Accounts**: Save analysis history and preferences

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Security & Privacy

- **Client-side Processing**: All analysis is performed locally in your browser
- **No Data Upload**: Images are not sent to external servers
- **Privacy First**: Your medical images never leave your device

## Contributing

This is a demonstration project. For production use, consider:

1. Adding more sophisticated detection algorithms
2. Implementing machine learning models
3. Adding server-side processing for complex analysis
4. Integrating with medical imaging standards
5. Adding validation against known authentic X-ray databases

## Disclaimer

This tool is for educational and research purposes. It should not be used as the sole method for determining image authenticity in medical contexts. Always consult with qualified medical professionals for critical medical decisions.

## License

This project is open source and available under the MIT License.

---

**Note**: This is a demonstration application. The analysis algorithms are simplified for educational purposes. For production use in medical environments, more sophisticated detection methods and validation would be required. 