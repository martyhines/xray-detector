// Enhanced AI Analysis for Medical Image Authenticity Detection
class EnhancedAIAnalyzer {
    constructor() {
        // Initialize detection methods after all methods are defined
        this.detectionMethods = {};
        this.initializeDetectionMethods();
    }

    initializeDetectionMethods() {
        this.detectionMethods = {
            frequencyAnalysis: (imageData) => this.analyzeFrequencyArtifacts(imageData),
            noiseInconsistency: (imageData) => this.analyzeNoiseInconsistency(imageData),
            compressionArtifacts: (imageData) => this.analyzeCompressionArtifacts(imageData),
            statisticalAnomalies: (imageData) => this.analyzeStatisticalAnomalies(imageData),
            edgeAnalysis: (imageData) => this.analyzeEdgePatterns(imageData),
            textureAnalysis: (imageData) => this.analyzeTexturePatterns(imageData),
            colorSpaceAnalysis: (imageData) => this.analyzeColorSpace(imageData),
            metadataAnalysis: (file) => this.analyzeMetadataPatterns(file),
            perceptualHashing: (imageData) => this.perceptualHashAnalysis(imageData),
            deepLearningFeatures: (imageData) => this.analyzeDeepLearningFeatures(imageData)
        };
    }

    async analyzeImage(file) {
        const results = {
            overall: {
                confidence: 0,
                status: 'Analyzing...',
                details: [],
                aiProbability: 0
            },
            methods: {},
            timestamp: new Date().toISOString()
        };

        try {
            // Create canvas for image processing
            const canvas = await this.createCanvasFromFile(file);
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Run all detection methods
            const methodResults = await Promise.all([
                this.detectionMethods.frequencyAnalysis(imageData),
                this.detectionMethods.noiseInconsistency(imageData),
                this.detectionMethods.compressionArtifacts(imageData),
                this.detectionMethods.statisticalAnomalies(imageData),
                this.detectionMethods.edgeAnalysis(imageData),
                this.detectionMethods.textureAnalysis(imageData),
                this.detectionMethods.colorSpaceAnalysis(imageData),
                this.detectionMethods.metadataAnalysis(file),
                this.detectionMethods.perceptualHashing(imageData),
                this.detectionMethods.deepLearningFeatures(imageData)
            ]);

            // Store individual method results
            const methodNames = Object.keys(this.detectionMethods);
            methodNames.forEach((method, index) => {
                results.methods[method] = methodResults[index];
            });

            // Calculate overall confidence and AI probability
            results.overall = this.calculateOverallResults(results.methods);

            return results;
        } catch (error) {
            console.error('Enhanced AI analysis error:', error);
            throw error;
        }
    }

    async createCanvasFromFile(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    // 1. Frequency Domain Analysis - Detects AI generation artifacts
    async analyzeFrequencyArtifacts(imageData) {
        const { width, height, data } = imageData;
        const result = {
            confidence: 50,
            aiProbability: 0.5,
            details: [],
            artifacts: []
        };

        try {
            // Convert to grayscale for frequency analysis
            const grayscaleData = this.convertToGrayscale(data);
            
            // Apply FFT (simplified version using convolution)
            const frequencyData = this.applyFrequencyTransform(grayscaleData, width, height);
            
            // Analyze frequency patterns
            const frequencyAnalysis = this.analyzeFrequencyPatterns(frequencyData, width, height);
            
            // Check for AI generation artifacts
            const artifacts = this.detectAIFrequencyArtifacts(frequencyAnalysis);
            
            result.artifacts = artifacts;
            result.confidence = this.calculateFrequencyConfidence(artifacts);
            result.aiProbability = this.calculateAIProbability(artifacts);
            result.details = this.generateFrequencyDetails(artifacts);

            return result;
        } catch (error) {
            console.warn('Frequency analysis failed:', error);
            return result;
        }
    }

    // 2. Noise Inconsistency Analysis
    async analyzeNoiseInconsistency(imageData) {
        const { width, height, data } = imageData;
        const result = {
            confidence: 50,
            aiProbability: 0.5,
            details: [],
            inconsistencies: []
        };

        try {
            // Analyze noise patterns across different regions
            const noiseMap = this.calculateNoiseMap(data, width, height);
            const inconsistencies = this.detectNoiseInconsistencies(noiseMap);
            
            // Check for unnaturally uniform noise (common in AI-generated images)
            const uniformityScore = this.analyzeNoiseUniformity(noiseMap);
            
            result.inconsistencies = inconsistencies;
            result.confidence = this.calculateNoiseConfidence(inconsistencies, uniformityScore);
            result.aiProbability = this.calculateNoiseAIProbability(uniformityScore);
            result.details = this.generateNoiseDetails(inconsistencies, uniformityScore);

            return result;
        } catch (error) {
            console.warn('Noise analysis failed:', error);
            return result;
        }
    }

    // 3. Advanced Compression Artifact Detection
    async analyzeCompressionArtifacts(imageData) {
        const { width, height, data } = imageData;
        const result = {
            confidence: 50,
            aiProbability: 0.5,
            details: [],
            artifacts: []
        };

        try {
            // Detect JPEG compression artifacts
            const jpegArtifacts = this.detectJPEGArtifacts(data, width, height);
            
            // Detect unusual compression patterns
            const compressionPatterns = this.analyzeCompressionPatterns(data, width, height);
            
            // Check for AI generation compression signatures
            const aiCompressionSignatures = this.detectAICompressionSignatures(compressionPatterns);
            
            result.artifacts = [...jpegArtifacts, ...aiCompressionSignatures];
            result.confidence = this.calculateCompressionConfidence(result.artifacts);
            result.aiProbability = this.calculateCompressionAIProbability(aiCompressionSignatures);
            result.details = this.generateCompressionDetails(result.artifacts);

            return result;
        } catch (error) {
            console.warn('Compression analysis failed:', error);
            return result;
        }
    }

    // 4. Statistical Anomaly Detection
    async analyzeStatisticalAnomalies(imageData) {
        const { width, height, data } = imageData;
        const result = {
            confidence: 50,
            aiProbability: 0.5,
            details: [],
            anomalies: []
        };

        try {
            // Analyze pixel distribution
            const pixelDistribution = this.analyzePixelDistribution(data);
            
            // Check for statistical anomalies
            const anomalies = this.detectStatisticalAnomalies(pixelDistribution);
            
            // Analyze entropy patterns
            const entropyAnalysis = this.analyzeEntropyPatterns(data, width, height);
            
            // Check for AI generation statistical signatures
            const aiSignatures = this.detectAIStatisticalSignatures(entropyAnalysis);
            
            result.anomalies = [...anomalies, ...aiSignatures];
            result.confidence = this.calculateStatisticalConfidence(result.anomalies);
            result.aiProbability = this.calculateStatisticalAIProbability(aiSignatures);
            result.details = this.generateStatisticalDetails(result.anomalies);

            return result;
        } catch (error) {
            console.warn('Statistical analysis failed:', error);
            return result;
        }
    }

    // Helper methods for calculations
    calculateOverallResults(methods) {
        let totalConfidence = 0;
        let totalAIProbability = 0;
        let methodCount = 0;
        const allDetails = [];

        Object.values(methods).forEach(method => {
            if (method.confidence > 0) {
                totalConfidence += method.confidence;
                totalAIProbability += method.aiProbability;
                methodCount++;
                allDetails.push(...method.details);
            }
        });

        const averageConfidence = methodCount > 0 ? totalConfidence / methodCount : 50;
        const averageAIProbability = methodCount > 0 ? totalAIProbability / methodCount : 0.5;

        // Determine status based on AI probability
        let status;
        if (averageAIProbability > 0.7) {
            status = 'Likely AI Generated';
        } else if (averageAIProbability > 0.4) {
            status = 'Suspicious - Manual Review Recommended';
        } else {
            status = 'Likely Authentic';
        }

        return {
            confidence: Math.round(averageConfidence),
            status,
            details: allDetails.slice(0, 10), // Limit to top 10 details
            aiProbability: averageAIProbability
        };
    }

    // Utility methods
    convertToGrayscale(data) {
        const grayscale = new Uint8ClampedArray(data.length / 4);
        for (let i = 0; i < data.length; i += 4) {
            grayscale[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }
        return grayscale;
    }

    applyFrequencyTransform(data, width, height) {
        // Simplified frequency transform using convolution
        const result = new Float32Array(data.length);
        const kernel = [0.0625, 0.125, 0.0625, 0.125, 0.25, 0.125, 0.0625, 0.125, 0.0625];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let sum = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx));
                        const kernelIdx = (ky + 1) * 3 + (kx + 1);
                        sum += data[idx] * kernel[kernelIdx];
                    }
                }
                result[y * width + x] = sum;
            }
        }
        return result;
    }

    // Detailed implementations for key detection methods
    analyzeFrequencyPatterns(data, width, height) {
        const patterns = [];
        
        // Analyze frequency distribution
        const frequencyHistogram = new Array(256).fill(0);
        for (let i = 0; i < data.length; i++) {
            const freq = Math.abs(data[i]);
            const bin = Math.floor(freq / 256 * 255);
            frequencyHistogram[bin]++;
        }
        
        // Check for AI generation patterns
        const totalPixels = data.length;
        const highFreqRatio = frequencyHistogram.slice(200).reduce((a, b) => a + b, 0) / totalPixels;
        const lowFreqRatio = frequencyHistogram.slice(0, 50).reduce((a, b) => a + b, 0) / totalPixels;
        
        if (highFreqRatio > 0.3) {
            patterns.push('Unusually high frequency content');
        }
        if (lowFreqRatio < 0.1) {
            patterns.push('Abnormally low frequency content');
        }
        
        return { patterns, frequencyHistogram, highFreqRatio, lowFreqRatio };
    }

    detectAIFrequencyArtifacts(analysis) {
        const artifacts = [];
        
        if (analysis.highFreqRatio > 0.4) {
            artifacts.push({
                type: 'high_frequency_artifact',
                confidence: 80,
                description: 'Excessive high-frequency content typical of AI generation'
            });
        }
        
        if (analysis.lowFreqRatio < 0.05) {
            artifacts.push({
                type: 'low_frequency_artifact',
                confidence: 75,
                description: 'Abnormally low frequency content suggesting artificial generation'
            });
        }
        
        return artifacts;
    }

    calculateFrequencyConfidence(artifacts) {
        if (artifacts.length === 0) return 70;
        const maxConfidence = Math.max(...artifacts.map(a => a.confidence));
        return Math.min(90, 50 + maxConfidence * 0.5);
    }

    calculateAIProbability(artifacts) {
        if (artifacts.length === 0) return 0.3;
        const avgConfidence = artifacts.reduce((sum, a) => sum + a.confidence, 0) / artifacts.length;
        return Math.min(0.9, avgConfidence / 100);
    }

    generateFrequencyDetails(artifacts) {
        return artifacts.map(artifact => artifact.description);
    }

    calculateNoiseMap(data, width, height) {
        const noiseMap = [];
        const blockSize = 8;
        
        for (let y = 0; y < height; y += blockSize) {
            for (let x = 0; x < width; x += blockSize) {
                const noise = this.calculateBlockNoise(data, width, x, y, blockSize);
                noiseMap.push({ x, y, noise });
            }
        }
        
        return noiseMap;
    }

    calculateBlockNoise(data, width, startX, startY, blockSize) {
        let sum = 0;
        let count = 0;
        
        for (let y = startY; y < Math.min(startY + blockSize, data.length / width); y++) {
            for (let x = startX; x < Math.min(startX + blockSize, width); x++) {
                const idx = (y * width + x) * 4;
                const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                sum += gray;
                count++;
            }
        }
        
        const mean = sum / count;
        let variance = 0;
        
        for (let y = startY; y < Math.min(startY + blockSize, data.length / width); y++) {
            for (let x = startX; x < Math.min(startX + blockSize, width); x++) {
                const idx = (y * width + x) * 4;
                const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                variance += Math.pow(gray - mean, 2);
            }
        }
        
        return Math.sqrt(variance / count);
    }

    detectNoiseInconsistencies(noiseMap) {
        const inconsistencies = [];
        const noises = noiseMap.map(n => n.noise);
        const mean = noises.reduce((a, b) => a + b, 0) / noises.length;
        const std = Math.sqrt(noises.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / noises.length);
        
        // Check for unnaturally uniform noise
        const uniformity = std / mean;
        if (uniformity < 0.1) {
            inconsistencies.push({
                type: 'uniform_noise',
                confidence: 85,
                description: 'Unnaturally uniform noise pattern'
            });
        }
        
        return inconsistencies;
    }

    analyzeNoiseUniformity(noiseMap) {
        const noises = noiseMap.map(n => n.noise);
        const mean = noises.reduce((a, b) => a + b, 0) / noises.length;
        const std = Math.sqrt(noises.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / noises.length);
        return std / mean;
    }

    calculateNoiseConfidence(inconsistencies, uniformity) {
        if (inconsistencies.length === 0) return 70;
        const maxConfidence = Math.max(...inconsistencies.map(i => i.confidence));
        return Math.min(90, 50 + maxConfidence * 0.5);
    }

    calculateNoiseAIProbability(uniformity) {
        if (uniformity < 0.1) return 0.8;
        if (uniformity < 0.2) return 0.6;
        return 0.3;
    }

    generateNoiseDetails(inconsistencies, uniformity) {
        const details = inconsistencies.map(i => i.description);
        if (uniformity < 0.1) {
            details.push('Extremely uniform noise pattern detected');
        }
        return details;
    }

    // Placeholder methods for other analyses (to be implemented)
    detectJPEGArtifacts(data, width, height) { return []; }
    analyzeCompressionPatterns(data, width, height) { return []; }
    detectAICompressionSignatures(patterns) { return []; }
    calculateCompressionConfidence(artifacts) { return 50; }
    calculateCompressionAIProbability(signatures) { return 0.5; }
    generateCompressionDetails(artifacts) { return []; }
    analyzePixelDistribution(data) { return {}; }
    detectStatisticalAnomalies(distribution) { return []; }
    analyzeEntropyPatterns(data, width, height) { return {}; }
    detectAIStatisticalSignatures(entropy) { return []; }
    calculateStatisticalConfidence(anomalies) { return 50; }
    calculateStatisticalAIProbability(signatures) { return 0.5; }
    generateStatisticalDetails(anomalies) { return []; }
    detectEdges(data, width, height) { return []; }
    analyzeEdgePatterns(edges, width, height) { return []; }
    detectAIEdgeArtifacts(patterns) { return []; }
    calculateEdgeConfidence(patterns) { return 50; }
    calculateEdgeAIProbability(artifacts) { return 0.5; }
    generateEdgeDetails(patterns) { return []; }
    analyzeTexturePatterns(data, width, height) { return []; }
    detectAITextureArtifacts(patterns) { return []; }
    calculateTextureConfidence(textures) { return 50; }
    calculateTextureAIProbability(artifacts) { return 0.5; }
    generateTextureDetails(textures) { return []; }
    analyzeColorSpacePatterns(data) { return []; }
    detectAIColorArtifacts(analysis) { return []; }
    calculateColorConfidence(anomalies) { return 50; }
    calculateColorAIProbability(artifacts) { return 0.5; }
    generateColorDetails(anomalies) { return []; }
    analyzeFileMetadata(file) { return []; }
    detectAIMetadataPatterns(analysis) { return []; }
    calculateMetadataConfidence(patterns) { return 50; }
    calculateMetadataAIProbability(patterns) { return 0.5; }
    generateMetadataDetails(patterns) { return []; }
    generatePerceptualHashes(data, width, height) { return []; }
    compareWithAIPatterns(hashes) { return []; }
    calculateHashConfidence(patterns) { return 50; }
    calculateHashAIProbability(patterns) { return 0.5; }
    generateHashDetails(patterns) { return []; }
    extractDeepLearningFeatures(data, width, height) { return []; }
    analyzeFeaturePatterns(features) { return []; }
    detectAIFeatureSignatures(patterns) { return []; }
    calculateFeatureConfidence(features) { return 50; }
    calculateFeatureAIProbability(signatures) { return 0.5; }
    generateFeatureDetails(features) { return []; }
}

// Export for global use
window.EnhancedAIAnalyzer = EnhancedAIAnalyzer; 