# X-Ray Authenticity Detector

A modern web application for detecting AI-generated or doctored X-ray images. This tool helps medical professionals and researchers identify potentially manipulated medical images.

## Features

- **Drag & Drop Upload**: Easy image upload with drag-and-drop functionality
- **DICOM File Support**: Native support for medical DICOM (.dcm) files with metadata analysis
- **Real-time Analysis**: Advanced image analysis using multiple detection methods
- **Beautiful UI**: Modern, responsive design with smooth animations
- **Detailed Results**: Comprehensive analysis with confidence scores and breakdowns
- **Enhanced AI Detection**: 10 sophisticated detection methods for AI-generated content
- **Medical Metadata Analysis**: Extracts and validates DICOM metadata for authenticity
- **Multiple Detection Methods**:
  - Metadata analysis
  - Noise pattern detection
  - Compression artifact analysis
  - Statistical pattern analysis
  - Frequency domain analysis
  - DICOM-specific validation

## How It Works

The application uses several sophisticated techniques to detect AI-generated or manipulated X-ray images:

1. **Metadata Analysis**: Examines file properties, size, and naming patterns
2. **Noise Pattern Detection**: Analyzes natural noise patterns that are often missing in AI-generated images
3. **Compression Artifact Analysis**: Detects unusual compression patterns that may indicate manipulation
4. **Statistical Analysis**: Examines pixel distribution and entropy patterns
5. **Frequency Domain Analysis**: Looks for patterns in the frequency domain that may indicate AI generation
6. **DICOM Metadata Analysis**: For DICOM files, extracts and validates medical metadata including:
   - Patient information (anonymized)
   - Study and series information
   - Device manufacturer and model
   - Acquisition parameters (KVP, exposure, etc.)
   - Temporal consistency validation
   - Modality-specific pattern analysis

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

#### Supported File Formats

**Standard Image Formats:**
- **JPEG/JPG** - Joint Photographic Experts Group
- **PNG** - Portable Network Graphics  
- **BMP** - Bitmap Image
- **TIFF** - Tagged Image File Format
- **Maximum file size**: 10MB

**Medical Imaging Formats:**
- **DICOM (.dcm)** - Digital Imaging and Communications in Medicine
- **Maximum file size**: 100MB
- **Features**: Includes metadata analysis for enhanced detection

#### Recommended Format
**DICOM files** are highly recommended as they provide the most comprehensive analysis with:
- Rich medical metadata extraction
- Device fingerprinting capabilities
- Acquisition parameter validation
- Temporal consistency checks
- Modality-specific pattern analysis

#### Image Types
- X-ray images
- MRI scans
- CT scans
- Other medical imaging modalities

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

## 🧠 Enhanced AI Detection Overview
The enhanced AI analysis uses 10 different detection methods to identify AI-generated or manipulated medical images. Each method looks for specific artifacts and patterns that are common in AI-generated content.

The 10 Detection Methods:
1. **Frequency Domain Analysis**
What it detects: AI generation artifacts in frequency patterns
How it works: Analyzes the frequency distribution of image data
AI indicators: Excessive high-frequency content or abnormally low frequency content
Confidence: 80-85% when artifacts detected
2. **Noise Inconsistency Detection**
What it detects: Unnaturally uniform noise patterns
How it works: Analyzes noise variance across different image regions
AI indicators: Extremely uniform noise (AI generators often produce consistent noise)
Confidence: 85% when uniform noise detected
3. **Advanced Compression Artifact Detection**
What it detects: Unusual compression patterns and AI generation signatures
How it works: Analyzes JPEG compression artifacts and block variance
AI indicators: Unusual compression ratios or patterns not typical of real cameras
Confidence: 75-80% when suspicious patterns found
4. **Statistical Anomaly Detection**
What it detects: Statistical patterns that deviate from natural images
How it works: Analyzes pixel distribution, entropy, and statistical signatures
AI indicators: Unusual pixel distributions or entropy patterns
Confidence: 70-80% when anomalies detected
5. **Edge Pattern Analysis**
What it detects: AI-generated edge artifacts
How it works: Uses edge detection algorithms to find unnatural edge patterns
AI indicators: Overly smooth or artificial-looking edges
Confidence: 75% when edge artifacts found
6. **Texture Pattern Analysis**
What it detects: AI-generated texture artifacts
How it works: Analyzes texture patterns across the image
AI indicators: Repetitive or artificial texture patterns
Confidence: 70% when texture artifacts detected
7. **Color Space Analysis**
What it detects: Color space anomalies
How it works: Analyzes color distribution and color space patterns
AI indicators: Unusual color distributions or color space artifacts
Confidence: 65-75% when anomalies found
8. **Metadata Pattern Analysis**
What it detects: Suspicious metadata patterns
How it works: Analyzes file metadata for AI generation indicators
AI indicators: Unusual file properties, timestamps, or metadata patterns
Confidence: 60-70% when suspicious patterns found
9. **Perceptual Hashing**
What it detects: Similarity to known AI generation patterns
How it works: Generates perceptual hashes and compares with known patterns
AI indicators: Similarity to known AI-generated image hashes
Confidence: 70-80% when matches found
10. **Deep Learning Features**
What it detects: Deep learning model signatures
How it works: Extracts and analyzes deep learning feature patterns
AI indicators: Patterns typical of specific AI models
Confidence: 75-85% when signatures detected

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
