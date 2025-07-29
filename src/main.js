// Main application file
class XRayDetectorApp {
    constructor() {
        this.currentFile = null;
        this.isAnalyzing = false;
        this.imageTypeClassifier = null;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        // Initialize the image type classifier
        this.imageTypeClassifier = new ImageTypeClassifier();
        console.log('X-Ray Detector App initialized');
    }

    setupEventListeners() {
        // Initialize upload handler
        this.uploadHandler = new UploadHandler();
        
        // Listen for file selection events from upload handler
        this.uploadHandler.onFileSelected = (file, dicomMetadata, isDICOM) => {
            this.handleFileSelect(file, dicomMetadata, isDICOM);
        };
        
        // Listen for reset events from upload handler
        this.uploadHandler.onReset = () => {
            this.resetUpload();
        };
    }

    handleFileSelect(file, dicomMetadata, isDICOM = false) {
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showError('Please select an image file.');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('File size must be less than 10MB.');
            return;
        }

        this.currentFile = file;
        this.isDICOM = isDICOM;
        this.displayImagePreview(file);
        this.showPreviewSection();
    }

    displayImagePreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewImage = document.getElementById('previewImage');
            previewImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    showPreviewSection() {
        document.getElementById('uploadArea').style.display = 'none';
        document.getElementById('previewSection').style.display = 'block';
        document.getElementById('resultsSection').style.display = 'none';
    }

    showUploadSection() {
        document.getElementById('uploadArea').style.display = 'block';
        document.getElementById('previewSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'none';
    }

    showResultsSection() {
        document.getElementById('resultsSection').style.display = 'block';
    }

    async analyzeImage() {
        if (!this.currentFile || this.isAnalyzing) return;

        this.isAnalyzing = true;
        this.showAnalyzingState();

        try {
            let result, analysisTime;
            if (this.isDICOM) {
                // Skip classification for DICOM files
                const startTime = Date.now();
                result = await this.performAnalysis(this.currentFile);
                analysisTime = Date.now() - startTime;
                result.imageType = 'DICOM';
                result.imageTypeConfidence = 1.0;
                result.classificationDetails = 'DICOM file detected; classification skipped.';
            } else {
                // TEMPORARILY DISABLED: Classify the image type
                /*
                if (!this.imageTypeClassifier) {
                    this.imageTypeClassifier = new ImageTypeClassifier();
                }
                const classification = await this.imageTypeClassifier.classifyImage(this.currentFile);
                const classificationMessage = this.imageTypeClassifier.getClassificationMessage(classification);
                // Check if it's a medical image
                if (!classificationMessage.canProceed) {
                    this.showClassificationResult(classificationMessage);
                    return;
                }
                // If it's medical, proceed with authenticity analysis
                const startTime = Date.now();
                result = await this.performAnalysis(this.currentFile);
                analysisTime = Date.now() - startTime;
                // Add classification info to results
                result.imageType = classification.type;
                result.imageTypeConfidence = classification.confidence;
                result.classificationDetails = classification.details;
                */
                // TEMPORARY: Skip classification and proceed directly to analysis
                const startTime = Date.now();
                result = await this.performAnalysis(this.currentFile);
                analysisTime = Date.now() - startTime;
                result.imageType = 'Medical (Classification Bypassed)';
                result.imageTypeConfidence = 1.0;
                result.classificationDetails = 'Classification temporarily disabled for testing';
            }
            this.displayResults(result, analysisTime);
        } catch (error) {
            console.error('Analysis error:', error);
            this.showError('Analysis failed. Please try again.');
        } finally {
            this.isAnalyzing = false;
        }
    }

    showClassificationResult(classificationMessage) {
        const resultsSection = document.getElementById('resultsSection');
        
        // Show classification message
        resultsSection.style.display = 'block';
        
        // Create classification result display
        const resultContent = resultsSection.querySelector('.result-content');
        resultContent.innerHTML = `
            <div class="classification-result">
                <div class="classification-icon">
                    <i class="fas ${classificationMessage.type === 'medical' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
                </div>
                <div class="classification-content">
                    <h4>${classificationMessage.title}</h4>
                    <p>${classificationMessage.message}</p>
                    ${classificationMessage.details ? `<p class="classification-details"><strong>Details:</strong> ${classificationMessage.details}</p>` : ''}
                    <div class="classification-actions">
                        <button class="btn btn-primary" onclick="resetUpload()">
                            <i class="fas fa-upload"></i> Upload Medical Image
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    showAnalyzingState() {
        const statusValue = document.getElementById('statusValue');
        statusValue.innerHTML = '<span class="loading"></span> Analyzing...';
        this.showResultsSection();
    }

    async performAnalysis(file) {
        try {
            // Run traditional, TensorFlow, and enhanced AI analysis in parallel
            const [traditionalResults, tensorflowResults, enhancedAIResults] = await Promise.all([
                this.runTraditionalAnalysis(file),
                this.runTensorFlowAnalysis(file),
                this.runEnhancedAIAnalysis(file)
            ]);

            // Combine results with weighted average
            const combinedConfidence = this.combineResults(traditionalResults, tensorflowResults, enhancedAIResults);
            
            return {
                confidence: combinedConfidence.confidence,
                status: combinedConfidence.status,
                details: combinedConfidence.details,
                timestamp: new Date().toISOString(),
                // Include detailed results for the breakdown
                traditional: traditionalResults,
                tensorflow: tensorflowResults,
                enhancedAI: enhancedAIResults
            };
        } catch (error) {
            console.error('Analysis error:', error);
            // Fallback to traditional analysis only
            return await this.runTraditionalAnalysis(file);
        }
    }

    async runTraditionalAnalysis(file) {
        const analyzer = new ImageAnalyzer();
        const results = await analyzer.analyzeImage(file);
        
        return {
            confidence: results.overall.confidence,
            status: results.overall.status,
            details: results.overall.details,
            method: 'Traditional Analysis',
            imageType: results.overall.imageType,
            metadata: results.metadata,
            noise: results.noise,
            compression: results.compression,
            statistical: results.statistical,
            frequency: results.frequency,
            mriDetection: results.mriDetection,
            mriAnalysis: results.mriAnalysis,
            ctDetection: results.ctDetection,
            ctAnalysis: results.ctAnalysis
        };
    }

    async runTensorFlowAnalysis(file) {
        try {
            const tensorflowAnalyzer = new TensorFlowAnalyzer();
            const results = await tensorflowAnalyzer.analyzeImage(file);
            
            return {
                confidence: results.confidence,
                status: results.status,
                details: results.details,
                method: results.method,
                aiProbability: results.aiProbability
            };
        } catch (error) {
            console.warn('TensorFlow analysis failed, using fallback:', error);
            
            // Return a fallback result
            return {
                confidence: 50,
                status: 'Analysis Unavailable',
                details: ['AI analysis failed, using traditional methods only'],
                method: 'Fallback Analysis',
                aiProbability: 0.5
            };
        }
    }

    async runEnhancedAIAnalysis(file) {
        try {
            if (typeof EnhancedAIAnalyzer === 'undefined') {
                throw new Error('EnhancedAIAnalyzer not loaded');
            }
            const enhancedAIAnalyzer = new EnhancedAIAnalyzer();
            const results = await enhancedAIAnalyzer.analyzeImage(file);
            return {
                confidence: results.overall.confidence,
                status: results.overall.status,
                details: results.overall.details,
                method: 'Enhanced AI Analysis',
                aiProbability: results.overall.aiProbability,
                methods: results.methods
            };
        } catch (error) {
            console.warn('Enhanced AI analysis failed, using fallback:', error);
            // Return a fallback result
            return {
                confidence: 50,
                status: 'Enhanced Analysis Unavailable',
                details: ['Enhanced AI analysis failed, using other methods'],
                method: 'Enhanced AI Fallback',
                aiProbability: 0.5
            };
        }
    }

    combineResults(traditional, tensorflow, enhancedAI) {
        // Adjust weights based on which analyses are available
        let traditionalWeight, tensorflowWeight, enhancedAIWeight;
        if (tensorflow.method === 'Fallback Analysis' && enhancedAI.method === 'Enhanced AI Fallback') {
            // If both AI methods failed, rely more on traditional analysis
            traditionalWeight = 0.8;
            tensorflowWeight = 0.1;
            enhancedAIWeight = 0.1;
        } else if (tensorflow.method === 'Fallback Analysis') {
            // If only TensorFlow failed, use enhanced AI more
            traditionalWeight = 0.2;
            tensorflowWeight = 0.1;
            enhancedAIWeight = 0.7;
        } else if (enhancedAI.method === 'Enhanced AI Fallback') {
            // If only enhanced AI failed, use TensorFlow more
            traditionalWeight = 0.2;
            tensorflowWeight = 0.7;
            enhancedAIWeight = 0.1;
        } else {
            // All methods available - enhanced AI gets highest weight
            traditionalWeight = 0.2;
            tensorflowWeight = 0.3;
            enhancedAIWeight = 0.5;
        }
        const combinedConfidence = Math.round(
            (traditional.confidence * traditionalWeight) +
            (tensorflow.confidence * tensorflowWeight) +
            (enhancedAI.confidence * enhancedAIWeight)
        );
        // Calculate combined AI probability
        const combinedAIProbability = (
            (traditional.aiProbability || 0.5) * traditionalWeight +
            (tensorflow.aiProbability || 0.5) * tensorflowWeight +
            (enhancedAI.aiProbability || 0.5) * enhancedAIWeight
        );
        // Determine status based on combined confidence and AI probability
        let status, details;
        if (combinedAIProbability > 0.7) {
            status = 'Likely AI Generated';
            details = 'Multiple advanced detection methods indicate AI generation';
        } else if (combinedAIProbability > 0.4) {
            status = 'Suspicious - Manual Review Recommended';
            details = 'Mixed indicators detected, enhanced analysis suggests potential AI generation';
        } else {
            status = 'Likely Authentic';
            details = 'Advanced analysis indicates authentic medical image';
        }
        return {
            confidence: combinedConfidence,
            status,
            details: [details],
            aiProbability: combinedAIProbability
        };
    }

    displayResults(result, analysisTime) {
        // Update confidence meter
        const confidenceBar = document.getElementById('confidenceBar');
        const confidenceValue = document.getElementById('confidenceValue');
        
        confidenceBar.style.width = `${result.confidence}%`;
        confidenceValue.textContent = `${result.confidence}%`;

        // Update status
        const statusValue = document.getElementById('statusValue');
        statusValue.textContent = result.status;
        statusValue.className = this.getStatusClass(result.confidence);

        // Update analysis time
        const analysisTimeElement = document.getElementById('analysisTime');
        analysisTimeElement.textContent = `${(analysisTime / 1000).toFixed(1)}s`;

        // Show detailed breakdown if available
        if (result.traditional || result.tensorflow || result.enhancedAI) {
            const resultDisplay = new ResultDisplay();
            resultDisplay.showResults(result, analysisTime);
        } else {
            this.showResultsSection();
        }
    }

    getStatusClass(confidence) {
        if (confidence >= 70) return 'status-authentic';
        if (confidence >= 40) return 'status-suspicious';
        return 'status-fake';
    }

    showError(message) {
        // Simple error display - could be enhanced with a proper notification system
        alert(message);
    }

    resetUpload() {
        this.currentFile = null;
        
        // Clear preview image
        const previewImage = document.getElementById('previewImage');
        if (previewImage) {
            previewImage.src = '';
        }
        
        // Clear results section
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
        
        // Reset confidence meter
        const confidenceBar = document.getElementById('confidenceBar');
        const confidenceValue = document.getElementById('confidenceValue');
        if (confidenceBar) confidenceBar.style.width = '0%';
        if (confidenceValue) confidenceValue.textContent = '0%';
        
        // Reset status
        const statusValue = document.getElementById('statusValue');
        if (statusValue) {
            statusValue.textContent = 'Analyzing...';
            statusValue.className = '';
        }
        
        // Reset analysis time
        const analysisTimeElement = document.getElementById('analysisTime');
        if (analysisTimeElement) {
            analysisTimeElement.textContent = '-';
        }
        
        // Clear any detailed breakdown
        const breakdownSection = document.getElementById('detailedBreakdown');
        if (breakdownSection) {
            breakdownSection.remove();
        }
        
        this.showUploadSection();
    }
}

// Global functions for HTML onclick handlers
function analyzeImage() {
    if (window.app) {
        window.app.analyzeImage();
    }
}

function resetUpload() {
    if (window.app && window.app.uploadHandler) {
        window.app.uploadHandler.resetUpload();
    }
}

function analyzeNewImage() {
    if (window.app) {
        window.app.resetUpload();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new XRayDetectorApp();
}); 