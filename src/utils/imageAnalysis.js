// Image Analysis Utilities
class ImageAnalyzer {
    constructor() {
        this.analysisMethods = {
            metadata: this.analyzeMetadata.bind(this),
            noise: this.analyzeNoisePatterns.bind(this),
            compression: this.analyzeCompressionArtifacts.bind(this),
            statistical: this.analyzeStatisticalPatterns.bind(this),
            frequency: this.analyzeFrequencyDomain.bind(this),
            mriDetection: this.detectMRI.bind(this),
            mriAnalysis: this.analyzeMRISpecific.bind(this),
            ctDetection: this.detectCT.bind(this),
            ctAnalysis: this.analyzeCTSpecific.bind(this)
        };
    }

    async analyzeImage(file) {
        const start = Date.now();
        const results = await this.runClassicalForensics(file);

        let backend = null;
        if (window.AppConfig?.FEATURES?.ENABLE_BACKEND && window.AppConfig?.BACKEND_URL) {
            try {
                backend = await this.runBackendForensics(file);
            } catch (e) {
                backend = { confidence: 50, status: 'Backend unavailable', details: ['Deep forensics failed'] };
            }
        }

        const overall = this.combine(results, backend);
        return {
            overall,
            metadata: results.metadata,
            noise: results.noise,
            compression: results.compression,
            statistical: results.statistical,
            frequency: results.frequency,
            mriDetection: results.mriDetection,
            mriAnalysis: results.mriAnalysis,
            ctDetection: results.ctDetection,
            ctAnalysis: results.ctAnalysis,
            backend: backend || undefined,
            elapsedMs: Date.now() - start
        };
    }

    async runClassicalForensics(file) {
        const metaStart = Date.now();
        const base = await this.basicAnalyze(file);
        const forensic = { methods: [], features: {}, startedAt: metaStart };
        try {
            const [ela, freq, noise] = await Promise.all([
                window.Forensics.computeELAFeatures(file),
                window.Forensics.computeFrequencyFeatures(file),
                window.Forensics.computeNoiseResidualFeatures(file)
            ]);
            forensic.methods.push(ela, freq, noise);
            forensic.features.ela = ela.features;
            forensic.features.frequency = freq.features;
            forensic.features.noiseResidual = noise.features;
        } catch (e) {
            forensic.methods.push({ method: 'Forensics', score: 50, details: ['Forensics failed'] });
        }
        // Convert suspicious scores to authenticity contribution: authenticity = 100 - suspicious
        const suspicious = forensic.methods.reduce((s, m) => s + (m.score || 50), 0) / Math.max(1, forensic.methods.length);
        const authenticity = Math.round(100 - suspicious);
        base.overall = base.overall || { confidence: authenticity, status: authenticity >= 70 ? 'Likely Authentic' : authenticity >= 40 ? 'Uncertain' : 'Likely AI Generated', details: [] };
        base.overall.details = [...(base.overall.details || []), ...forensic.methods.flatMap(m => m.details || [])];
        base.forensics = forensic;
        return base;
    }

    async runBackendForensics(file) {
        const url = window.AppConfig.BACKEND_URL + '/analyze';
        const blob = file; // already a File
        const form = new FormData();
        form.append('image', blob, blob.name);
        const resp = await fetch(url, { method: 'POST', body: form });
        if (!resp.ok) throw new Error('backend error');
        return await resp.json();
    }

    combine(classical, backend) {
        // Simple weighted fusion placeholder; calibrate later
        const cw = backend ? 0.6 : 1.0;
        const bw = backend ? 0.4 : 0.0;
        const c = Math.round((classical.overall.confidence || 50) * cw + (backend?.confidence || 0) * bw);
        let status = classical.overall.status;
        if (backend && backend.status) status = backend.status;
        const details = [ ...(classical.overall.details || []), ...(backend?.details || []) ];
        return { confidence: c, status, details };
    }

    async createImageElement(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    async analyzeMetadata(file) {
        // Analyze file metadata for suspicious patterns
        const analysis = {
            fileSize: file.size,
            fileName: file.name,
            fileType: file.type,
            lastModified: file.lastModified,
            suspicious: false,
            confidence: 50,
            details: []
        };

        // Check file size (very small files might be suspicious)
        if (file.size < 1000) {
            analysis.suspicious = true;
            analysis.confidence -= 20;
            analysis.details.push('Unusually small file size');
        }

        // Check file extension
        const extension = file.name.split('.').pop().toLowerCase();
        const suspiciousExtensions = ['png', 'jpg', 'jpeg', 'bmp', 'tiff'];
        if (!suspiciousExtensions.includes(extension)) {
            analysis.suspicious = true;
            analysis.confidence -= 15;
            analysis.details.push('Unusual file extension');
        }

        // Check filename for suspicious patterns
        const fileName = file.name.toLowerCase();
        if (fileName.includes('fake') || fileName.includes('ai') || fileName.includes('generated')) {
            analysis.suspicious = true;
            analysis.confidence -= 30;
            analysis.details.push('Filename suggests AI generation');
        }

        // Check for MRI-related keywords
        if (fileName.includes('mri') || fileName.includes('magnetic') || fileName.includes('resonance')) {
            analysis.details.push('Filename suggests MRI image');
        }

        // Check for CT-related keywords
        if (fileName.includes('ct') || fileName.includes('cat') || fileName.includes('tomography') || fileName.includes('computed')) {
            analysis.details.push('Filename suggests CT scan');
        }

        return analysis;
    }

    async detectMRI(img) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Advanced MRI detection based on multiple characteristics
        let mriScore = 0;
        
        // 1. Analyze pixel distribution for MRI characteristics
        const pixelAnalysis = this.analyzeMRIPixelDistribution(data);
        mriScore += pixelAnalysis.score;
        
        // 2. Analyze edge patterns (MRI has specific edge characteristics)
        const edgeAnalysis = this.analyzeMRIEdgePatterns(data, canvas.width, canvas.height);
        mriScore += edgeAnalysis.score;
        
        // 3. Analyze texture patterns (MRI has unique texture)
        const textureAnalysis = this.analyzeMRITexture(data, canvas.width, canvas.height);
        mriScore += textureAnalysis.score;
        
        // 4. Analyze frequency domain characteristics
        const frequencyAnalysis = this.analyzeMRIFrequencyDomain(data, canvas.width, canvas.height);
        mriScore += frequencyAnalysis.score;
        
        // 5. Analyze anatomical patterns (if detectable)
        const anatomicalAnalysis = this.analyzeMRIAnatomicalPatterns(data, canvas.width, canvas.height);
        mriScore += anatomicalAnalysis.score;
        
        const isMRI = mriScore >= 70; // Higher threshold for better accuracy
        
        return {
            isMRI,
            mriScore: Math.round(mriScore),
            confidence: Math.min(100, mriScore),
            details: [
                ...pixelAnalysis.details,
                ...edgeAnalysis.details,
                ...textureAnalysis.details,
                ...frequencyAnalysis.details,
                ...anatomicalAnalysis.details
            ]
        };
    }

    analyzeMRIPatterns(data, width, height) {
        let score = 0;
        const details = [];
        
        // Check for typical MRI artifacts and patterns
        let edgeCount = 0;
        let smoothRegions = 0;
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const current = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                
                // Check neighbors
                const left = (data[idx - 4] + data[idx - 3] + data[idx - 2]) / 3;
                const right = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
                const top = (data[(y - 1) * width * 4 + x * 4] + 
                           data[(y - 1) * width * 4 + x * 4 + 1] + 
                           data[(y - 1) * width * 4 + x * 4 + 2]) / 3;
                const bottom = (data[(y + 1) * width * 4 + x * 4] + 
                              data[(y + 1) * width * 4 + x * 4 + 1] + 
                              data[(y + 1) * width * 4 + x * 4 + 2]) / 3;
                
                const maxDiff = Math.max(
                    Math.abs(current - left),
                    Math.abs(current - right),
                    Math.abs(current - top),
                    Math.abs(current - bottom)
                );
                
                if (maxDiff > 50) {
                    edgeCount++;
                } else if (maxDiff < 10) {
                    smoothRegions++;
                }
            }
        }
        
        const totalPixels = (width - 2) * (height - 2);
        const edgeRatio = edgeCount / totalPixels;
        const smoothRatio = smoothRegions / totalPixels;
        
        // MRI typically has both sharp edges and smooth regions
        if (edgeRatio > 0.1 && edgeRatio < 0.4) {
            score += 15;
            details.push(`Edge density: ${(edgeRatio * 100).toFixed(1)}%`);
        }
        
        if (smoothRatio > 0.2) {
            score += 10;
            details.push(`Smooth regions: ${(smoothRatio * 100).toFixed(1)}%`);
        }
        
        return { score, details };
    }

    analyzeMRIPixelDistribution(data) {
        let darkPixels = 0, brightPixels = 0, grayPixels = 0;
        let intensitySum = 0;
        let intensityVariance = 0;
        
        // Calculate mean intensity first
        for (let i = 0; i < data.length; i += 4) {
            const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            intensitySum += gray;
        }
        const meanIntensity = intensitySum / (data.length / 4);
        
        // Calculate variance and categorize pixels
        for (let i = 0; i < data.length; i += 4) {
            const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            intensityVariance += Math.pow(gray - meanIntensity, 2);
            
            if (gray < 40) darkPixels++;
            else if (gray > 220) brightPixels++;
            else grayPixels++;
        }
        
        const totalPixels = data.length / 4;
        const darkRatio = darkPixels / totalPixels;
        const brightRatio = brightPixels / totalPixels;
        const grayRatio = grayPixels / totalPixels;
        const variance = intensityVariance / totalPixels;
        const stdDev = Math.sqrt(variance);
        
        let score = 0;
        const details = [];
        
        // MRI typically has high variance (good contrast)
        if (variance > 2000) {
            score += 15;
            details.push(`High intensity variance: ${variance.toFixed(0)}`);
        }
        
        // MRI has specific dark/bright ratios
        if (darkRatio > 0.25 && darkRatio < 0.45) {
            score += 10;
            details.push(`Optimal dark pixel ratio: ${(darkRatio * 100).toFixed(1)}%`);
        }
        
        if (brightRatio > 0.15 && brightRatio < 0.35) {
            score += 10;
            details.push(`Optimal bright pixel ratio: ${(brightRatio * 100).toFixed(1)}%`);
        }
        
        // MRI has less gray areas
        if (grayRatio < 0.6) {
            score += 10;
            details.push(`Low gray pixel ratio: ${(grayRatio * 100).toFixed(1)}%`);
        }
        
        return { score, details };
    }

    analyzeMRIEdgePatterns(data, width, height) {
        let edgeCount = 0;
        let strongEdgeCount = 0;
        let edgeDirections = { horizontal: 0, vertical: 0, diagonal: 0 };
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const current = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                
                // Check 8 neighbors
                const neighbors = [
                    data[((y - 1) * width + x) * 4], // top
                    data[((y + 1) * width + x) * 4], // bottom
                    data[(y * width + x - 1) * 4],   // left
                    data[(y * width + x + 1) * 4],   // right
                    data[((y - 1) * width + x - 1) * 4], // top-left
                    data[((y - 1) * width + x + 1) * 4], // top-right
                    data[((y + 1) * width + x - 1) * 4], // bottom-left
                    data[((y + 1) * width + x + 1) * 4]  // bottom-right
                ];
                
                let maxDiff = 0;
                let horizontalDiff = 0;
                let verticalDiff = 0;
                
                for (let i = 0; i < neighbors.length; i++) {
                    const diff = Math.abs(current - neighbors[i]);
                    maxDiff = Math.max(maxDiff, diff);
                    
                    if (i < 2) verticalDiff += diff;      // top/bottom
                    if (i >= 2 && i < 4) horizontalDiff += diff; // left/right
                }
                
                if (maxDiff > 30) {
                    edgeCount++;
                    if (maxDiff > 60) strongEdgeCount++;
                    
                    // Categorize edge direction
                    if (horizontalDiff > verticalDiff) {
                        edgeDirections.horizontal++;
                    } else if (verticalDiff > horizontalDiff) {
                        edgeDirections.vertical++;
                    } else {
                        edgeDirections.diagonal++;
                    }
                }
            }
        }
        
        const totalPixels = (width - 2) * (height - 2);
        const edgeRatio = edgeCount / totalPixels;
        const strongEdgeRatio = strongEdgeCount / totalPixels;
        
        let score = 0;
        const details = [];
        
        // MRI typically has moderate edge density
        if (edgeRatio > 0.1 && edgeRatio < 0.4) {
            score += 15;
            details.push(`Optimal edge density: ${(edgeRatio * 100).toFixed(1)}%`);
        }
        
        // MRI has strong edges
        if (strongEdgeRatio > 0.02) {
            score += 10;
            details.push(`Strong edges detected: ${(strongEdgeRatio * 100).toFixed(1)}%`);
        }
        
        return { score, details };
    }

    analyzeMRITexture(data, width, height) {
        // Analyze local texture patterns using Local Binary Patterns (LBP) concept
        let textureScore = 0;
        let uniformPatterns = 0;
        let totalPatterns = 0;
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                
                // Get 8 neighbors in clockwise order
                const neighbors = [
                    (data[((y - 1) * width + x) * 4] + data[((y - 1) * width + x) * 4 + 1] + data[((y - 1) * width + x) * 4 + 2]) / 3, // top
                    (data[((y - 1) * width + x + 1) * 4] + data[((y - 1) * width + x + 1) * 4 + 1] + data[((y - 1) * width + x + 1) * 4 + 2]) / 3, // top-right
                    (data[(y * width + x + 1) * 4] + data[(y * width + x + 1) * 4 + 1] + data[(y * width + x + 1) * 4 + 2]) / 3, // right
                    (data[((y + 1) * width + x + 1) * 4] + data[((y + 1) * width + x + 1) * 4 + 1] + data[((y + 1) * width + x + 1) * 4 + 2]) / 3, // bottom-right
                    (data[((y + 1) * width + x) * 4] + data[((y + 1) * width + x) * 4 + 1] + data[((y + 1) * width + x) * 4 + 2]) / 3, // bottom
                    (data[((y + 1) * width + x - 1) * 4] + data[((y + 1) * width + x - 1) * 4 + 1] + data[((y + 1) * width + x - 1) * 4 + 2]) / 3, // bottom-left
                    (data[(y * width + x - 1) * 4] + data[(y * width + x - 1) * 4 + 1] + data[(y * width + x - 1) * 4 + 2]) / 3, // left
                    (data[((y - 1) * width + x - 1) * 4] + data[((y - 1) * width + x - 1) * 4 + 1] + data[((y - 1) * width + x - 1) * 4 + 2]) / 3  // top-left
                ];
                
                // Create binary pattern
                let pattern = 0;
                let transitions = 0;
                
                for (let i = 0; i < 8; i++) {
                    if (neighbors[i] > center) {
                        pattern |= (1 << i);
                    }
                }
                
                // Count transitions (0 to 1 or 1 to 0)
                for (let i = 0; i < 8; i++) {
                    const current = (pattern >> i) & 1;
                    const next = (pattern >> ((i + 1) % 8)) & 1;
                    if (current !== next) transitions++;
                }
                
                totalPatterns++;
                if (transitions <= 2) uniformPatterns++; // Uniform patterns are common in MRI
            }
        }
        
        const uniformRatio = uniformPatterns / totalPatterns;
        
        let score = 0;
        const details = [];
        
        // MRI typically has many uniform texture patterns
        if (uniformRatio > 0.3) {
            score += 15;
            details.push(`High uniform texture patterns: ${(uniformRatio * 100).toFixed(1)}%`);
        }
        
        return { score, details };
    }

    analyzeMRIFrequencyDomain(data, width, height) {
        // Simplified frequency domain analysis
        let highFreqPixels = 0;
        let lowFreqPixels = 0;
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const current = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                
                // Calculate local frequency using Laplacian approximation
                const top = (data[((y - 1) * width + x) * 4] + data[((y - 1) * width + x) * 4 + 1] + data[((y - 1) * width + x) * 4 + 2]) / 3;
                const bottom = (data[((y + 1) * width + x) * 4] + data[((y + 1) * width + x) * 4 + 1] + data[((y + 1) * width + x) * 4 + 2]) / 3;
                const left = (data[(y * width + x - 1) * 4] + data[(y * width + x - 1) * 4 + 1] + data[(y * width + x - 1) * 4 + 2]) / 3;
                const right = (data[(y * width + x + 1) * 4] + data[(y * width + x + 1) * 4 + 1] + data[(y * width + x + 1) * 4 + 2]) / 3;
                
                const laplacian = Math.abs(4 * current - top - bottom - left - right);
                
                if (laplacian > 50) {
                    highFreqPixels++;
                } else if (laplacian < 10) {
                    lowFreqPixels++;
                }
            }
        }
        
        const totalPixels = (width - 2) * (height - 2);
        const highFreqRatio = highFreqPixels / totalPixels;
        const lowFreqRatio = lowFreqPixels / totalPixels;
        
        let score = 0;
        const details = [];
        
        // MRI has balanced frequency distribution
        if (highFreqRatio > 0.1 && highFreqRatio < 0.3) {
            score += 10;
            details.push(`Balanced high frequency: ${(highFreqRatio * 100).toFixed(1)}%`);
        }
        
        if (lowFreqRatio > 0.2) {
            score += 5;
            details.push(`Adequate low frequency: ${(lowFreqRatio * 100).toFixed(1)}%`);
        }
        
        return { score, details };
    }

    analyzeMRIAnatomicalPatterns(data, width, height) {
        // Look for anatomical structures common in MRI
        let anatomicalScore = 0;
        const details = [];
        
        // Check for circular/oval patterns (common in brain MRI)
        const circularPatterns = this.detectCircularPatterns(data, width, height);
        if (circularPatterns > 0) {
            anatomicalScore += 10;
            details.push(`${circularPatterns} circular patterns detected`);
        }
        
        // Check for symmetry (anatomical structures are often symmetric)
        const symmetryScore = this.analyzeSymmetry(data, width, height);
        if (symmetryScore > 0.6) {
            anatomicalScore += 10;
            details.push(`High symmetry detected: ${(symmetryScore * 100).toFixed(1)}%`);
        }
        
        return { score: anatomicalScore, details };
    }

    detectCircularPatterns(data, width, height) {
        // Simplified circular pattern detection using Hough transform concept
        let circularCount = 0;
        
        // Sample points to check for circular patterns
        for (let y = 10; y < height - 10; y += 20) {
            for (let x = 10; x < width - 10; x += 20) {
                const centerIdx = (y * width + x) * 4;
                const centerIntensity = (data[centerIdx] + data[centerIdx + 1] + data[centerIdx + 2]) / 3;
                
                // Check if this point could be center of a circle
                let consistentRadius = 0;
                for (let radius = 5; radius < 30; radius += 5) {
                    let consistentPoints = 0;
                    let totalPoints = 0;
                    
                    for (let angle = 0; angle < 360; angle += 30) {
                        const rad = angle * Math.PI / 180;
                        const checkX = Math.round(x + radius * Math.cos(rad));
                        const checkY = Math.round(y + radius * Math.sin(rad));
                        
                        if (checkX >= 0 && checkX < width && checkY >= 0 && checkY < height) {
                            const checkIdx = (checkY * width + checkX) * 4;
                            const checkIntensity = (data[checkIdx] + data[checkIdx + 1] + data[checkIdx + 2]) / 3;
                            
                            if (Math.abs(checkIntensity - centerIntensity) < 30) {
                                consistentPoints++;
                            }
                            totalPoints++;
                        }
                    }
                    
                    if (totalPoints > 0 && consistentPoints / totalPoints > 0.7) {
                        consistentRadius++;
                    }
                }
                
                if (consistentRadius > 2) {
                    circularCount++;
                }
            }
        }
        
        return circularCount;
    }

    analyzeSymmetry(data, width, height) {
        // Analyze vertical symmetry
        let symmetricPixels = 0;
        let totalPixels = 0;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width / 2; x++) {
                const leftIdx = (y * width + x) * 4;
                const rightIdx = (y * width + (width - 1 - x)) * 4;
                
                const leftIntensity = (data[leftIdx] + data[leftIdx + 1] + data[leftIdx + 2]) / 3;
                const rightIntensity = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
                
                if (Math.abs(leftIntensity - rightIntensity) < 20) {
                    symmetricPixels++;
                }
                totalPixels++;
            }
        }
        
        return symmetricPixels / totalPixels;
    }

    async analyzeMRISpecific(img) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // MRI-specific analysis
        const analysis = {
            sliceThickness: this.estimateSliceThickness(data, canvas.width, canvas.height),
            resolution: this.analyzeMRIResolution(data, canvas.width, canvas.height),
            artifacts: this.detectMRIArtifacts(data, canvas.width, canvas.height),
            contrast: this.analyzeMRIContrast(data, canvas.width, canvas.height),
            suspicious: false,
            confidence: 50,
            details: []
        };
        
        // Calculate overall MRI authenticity score
        let mriScore = 50; // Base score
        
        // Adjust based on slice thickness (real MRI has consistent thickness)
        if (analysis.sliceThickness.consistent) {
            mriScore += 15;
            analysis.details.push('Consistent slice thickness detected');
        } else {
            mriScore -= 10;
            analysis.details.push('Inconsistent slice thickness');
        }
        
        // Adjust based on resolution
        if (analysis.resolution.typical) {
            mriScore += 10;
            analysis.details.push('Typical MRI resolution');
        } else {
            mriScore -= 5;
            analysis.details.push('Unusual resolution for MRI');
        }
        
        // Adjust based on artifacts
        if (analysis.artifacts.count === 0) {
            mriScore -= 15; // No artifacts might indicate AI generation
            analysis.details.push('No typical MRI artifacts detected');
        } else if (analysis.artifacts.count > 0 && analysis.artifacts.count < 5) {
            mriScore += 10;
            analysis.details.push(`${analysis.artifacts.count} typical MRI artifacts detected`);
        } else {
            mriScore -= 5;
            analysis.details.push('Excessive artifacts detected');
        }
        
        // Adjust based on contrast
        if (analysis.contrast.natural) {
            mriScore += 10;
            analysis.details.push('Natural MRI contrast patterns');
        } else {
            mriScore -= 10;
            analysis.details.push('Unusual contrast patterns');
        }
        
        analysis.confidence = Math.max(0, Math.min(100, mriScore));
        analysis.suspicious = mriScore < 40;
        
        return analysis;
    }

    estimateSliceThickness(data, width, height) {
        // Analyze vertical intensity profiles to estimate slice thickness
        const profiles = [];
        
        for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 10))) {
            const profile = [];
            for (let y = 0; y < height; y++) {
                const idx = (y * width + x) * 4;
                const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                profile.push(gray);
            }
            profiles.push(profile);
        }
        
        // Calculate consistency of intensity changes
        let consistentChanges = 0;
        let totalChanges = 0;
        
        for (const profile of profiles) {
            for (let i = 1; i < profile.length; i++) {
                const change = Math.abs(profile[i] - profile[i - 1]);
                if (change > 20) {
                    totalChanges++;
                    // Check if change is consistent with neighboring changes
                    if (i > 1 && i < profile.length - 1) {
                        const prevChange = Math.abs(profile[i - 1] - profile[i - 2]);
                        const nextChange = Math.abs(profile[i + 1] - profile[i]);
                        if (Math.abs(change - prevChange) < 10 && Math.abs(change - nextChange) < 10) {
                            consistentChanges++;
                        }
                    }
                }
            }
        }
        
        const consistency = totalChanges > 0 ? consistentChanges / totalChanges : 0;
        
        return {
            consistent: consistency > 0.6,
            consistency: consistency,
            details: [`Slice consistency: ${(consistency * 100).toFixed(1)}%`]
        };
    }

    analyzeMRIResolution(data, width, height) {
        // Check if resolution is typical for MRI
        const typicalResolutions = [
            { width: 256, height: 256 },
            { width: 512, height: 512 },
            { width: 1024, height: 1024 },
            { width: 256, height: 512 },
            { width: 512, height: 256 }
        ];
        
        let isTypical = false;
        for (const res of typicalResolutions) {
            if (Math.abs(width - res.width) < 50 && Math.abs(height - res.height) < 50) {
                isTypical = true;
                break;
            }
        }
        
        return {
            typical: isTypical,
            width,
            height,
            details: [`Resolution: ${width}x${height}`]
        };
    }

    detectMRIArtifacts(data, width, height) {
        const artifacts = [];
        
        // Check for common MRI artifacts
        // 1. Motion artifacts (horizontal streaks)
        // 2. Chemical shift artifacts
        // 3. Gibbs ringing artifacts
        // 4. Aliasing artifacts
        
        // Simple motion artifact detection (horizontal intensity variations)
        for (let y = 0; y < height; y++) {
            let rowVariance = 0;
            let rowMean = 0;
            
            // Calculate row mean
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                rowMean += gray;
            }
            rowMean /= width;
            
            // Calculate row variance
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                rowVariance += Math.pow(gray - rowMean, 2);
            }
            rowVariance /= width;
            
            if (rowVariance > 1000) {
                artifacts.push({
                    type: 'motion',
                    row: y,
                    variance: rowVariance
                });
            }
        }
        
        return {
            count: artifacts.length,
            artifacts,
            details: [`${artifacts.length} potential artifacts detected`]
        };
    }

    analyzeMRIContrast(data, width, height) {
        // Analyze contrast distribution typical of MRI
        const histogram = new Array(256).fill(0);
        
        for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
            histogram[gray]++;
        }
        
        // Calculate contrast metrics
        let totalPixels = data.length / 4;
        let cumulative = 0;
        let p10 = 0, p90 = 0;
        
        for (let i = 0; i < 256; i++) {
            cumulative += histogram[i];
            if (cumulative >= totalPixels * 0.1 && p10 === 0) {
                p10 = i;
            }
            if (cumulative >= totalPixels * 0.9 && p90 === 0) {
                p90 = i;
            }
        }
        
        const contrastRange = p90 - p10;
        const natural = contrastRange > 100 && contrastRange < 200; // Typical MRI contrast range
        
        return {
            natural,
            contrastRange,
            p10,
            p90,
            details: [`Contrast range: ${contrastRange} (10th-90th percentile)`]
        };
    }

    async detectCT(img) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Advanced CT detection based on multiple characteristics
        let ctScore = 0;
        
        // 1. Analyze pixel distribution for CT characteristics
        const pixelAnalysis = this.analyzeCTPixelDistribution(data);
        ctScore += pixelAnalysis.score;
        
        // 2. Analyze edge patterns (CT has specific edge characteristics)
        const edgeAnalysis = this.analyzeCTEdgePatterns(data, canvas.width, canvas.height);
        ctScore += edgeAnalysis.score;
        
        // 3. Analyze texture patterns (CT has unique texture)
        const textureAnalysis = this.analyzeCTTexture(data, canvas.width, canvas.height);
        ctScore += textureAnalysis.score;
        
        // 4. Analyze frequency domain characteristics
        const frequencyAnalysis = this.analyzeCTFrequencyDomain(data, canvas.width, canvas.height);
        ctScore += frequencyAnalysis.score;
        
        // 5. Analyze anatomical patterns (if detectable)
        const anatomicalAnalysis = this.analyzeCTAnatomicalPatterns(data, canvas.width, canvas.height);
        ctScore += anatomicalAnalysis.score;
        
        const isCT = ctScore >= 70; // Higher threshold for better accuracy
        
        return {
            isCT,
            ctScore: Math.round(ctScore),
            confidence: Math.min(100, ctScore),
            details: [
                ...pixelAnalysis.details,
                ...edgeAnalysis.details,
                ...textureAnalysis.details,
                ...frequencyAnalysis.details,
                ...anatomicalAnalysis.details
            ]
        };
    }

    analyzeCTPatterns(data, width, height) {
        let score = 0;
        const details = [];
        
        // Check for typical CT artifacts and patterns
        let edgeCount = 0;
        let smoothRegions = 0;
        let boneEdges = 0;
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const current = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                
                // Check neighbors
                const left = (data[idx - 4] + data[idx - 3] + data[idx - 2]) / 3;
                const right = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
                const top = (data[(y - 1) * width * 4 + x * 4] + 
                           data[(y - 1) * width * 4 + x * 4 + 1] + 
                           data[(y - 1) * width * 4 + x * 4 + 2]) / 3;
                const bottom = (data[(y + 1) * width * 4 + x * 4] + 
                              data[(y + 1) * width * 4 + x * 4 + 1] + 
                              data[(y + 1) * width * 4 + x * 4 + 2]) / 3;
                
                const maxDiff = Math.max(
                    Math.abs(current - left),
                    Math.abs(current - right),
                    Math.abs(current - top),
                    Math.abs(current - bottom)
                );
                
                if (maxDiff > 60) {
                    edgeCount++;
                    // Check if it's a bone edge (high contrast)
                    if (maxDiff > 100) {
                        boneEdges++;
                    }
                } else if (maxDiff < 15) {
                    smoothRegions++;
                }
            }
        }
        
        const totalPixels = (width - 2) * (height - 2);
        const edgeRatio = edgeCount / totalPixels;
        const smoothRatio = smoothRegions / totalPixels;
        const boneEdgeRatio = boneEdges / totalPixels;
        
        // CT typically has sharp bone edges
        if (boneEdgeRatio > 0.02) {
            score += 15;
            details.push(`Bone edge density: ${(boneEdgeRatio * 100).toFixed(1)}%`);
        }
        
        // CT has both sharp edges and smooth regions
        if (edgeRatio > 0.15 && edgeRatio < 0.5) {
            score += 10;
            details.push(`Edge density: ${(edgeRatio * 100).toFixed(1)}%`);
        }
        
        if (smoothRatio > 0.3) {
            score += 10;
            details.push(`Smooth regions: ${(smoothRatio * 100).toFixed(1)}%`);
        }
        
        return { score, details };
    }

    analyzeCTPixelDistribution(data) {
        let darkPixels = 0, brightPixels = 0, grayPixels = 0, bonePixels = 0;
        let intensitySum = 0;
        let intensityVariance = 0;
        
        // Calculate mean intensity first
        for (let i = 0; i < data.length; i += 4) {
            const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            intensitySum += gray;
        }
        const meanIntensity = intensitySum / (data.length / 4);
        
        // Calculate variance and categorize pixels
        for (let i = 0; i < data.length; i += 4) {
            const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            intensityVariance += Math.pow(gray - meanIntensity, 2);
            
            if (gray < 25) darkPixels++; // Air/tissue
            else if (gray > 230) bonePixels++; // Bone (very bright in CT)
            else if (gray > 140) brightPixels++; // Soft tissue
            else grayPixels++;
        }
        
        const totalPixels = data.length / 4;
        const darkRatio = darkPixels / totalPixels;
        const brightRatio = brightPixels / totalPixels;
        const grayRatio = grayPixels / totalPixels;
        const boneRatio = bonePixels / totalPixels;
        const variance = intensityVariance / totalPixels;
        
        let score = 0;
        const details = [];
        
        // CT typically has very high variance (excellent contrast)
        if (variance > 3000) {
            score += 15;
            details.push(`Very high intensity variance: ${variance.toFixed(0)}`);
        }
        
        // CT has specific bone areas
        if (boneRatio > 0.03 && boneRatio < 0.15) {
            score += 15;
            details.push(`Optimal bone pixel ratio: ${(boneRatio * 100).toFixed(1)}%`);
        }
        
        // CT has specific dark areas (air, lungs)
        if (darkRatio > 0.15 && darkRatio < 0.35) {
            score += 10;
            details.push(`Optimal air/tissue ratio: ${(darkRatio * 100).toFixed(1)}%`);
        }
        
        // CT has good soft tissue representation
        if (brightRatio > 0.15 && brightRatio < 0.4) {
            score += 10;
            details.push(`Good soft tissue ratio: ${(brightRatio * 100).toFixed(1)}%`);
        }
        
        return { score, details };
    }

    analyzeCTEdgePatterns(data, width, height) {
        let edgeCount = 0;
        let strongEdgeCount = 0;
        let boneEdges = 0;
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const current = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                
                // Check 8 neighbors
                const neighbors = [
                    data[((y - 1) * width + x) * 4], // top
                    data[((y + 1) * width + x) * 4], // bottom
                    data[(y * width + x - 1) * 4],   // left
                    data[(y * width + x + 1) * 4],   // right
                    data[((y - 1) * width + x - 1) * 4], // top-left
                    data[((y - 1) * width + x + 1) * 4], // top-right
                    data[((y + 1) * width + x - 1) * 4], // bottom-left
                    data[((y + 1) * width + x + 1) * 4]  // bottom-right
                ];
                
                let maxDiff = 0;
                
                for (let i = 0; i < neighbors.length; i++) {
                    const diff = Math.abs(current - neighbors[i]);
                    maxDiff = Math.max(maxDiff, diff);
                }
                
                if (maxDiff > 40) {
                    edgeCount++;
                    if (maxDiff > 80) {
                        strongEdgeCount++;
                        // Check if it's a bone edge (very high contrast)
                        if (maxDiff > 120) {
                            boneEdges++;
                        }
                    }
                }
            }
        }
        
        const totalPixels = (width - 2) * (height - 2);
        const edgeRatio = edgeCount / totalPixels;
        const strongEdgeRatio = strongEdgeCount / totalPixels;
        const boneEdgeRatio = boneEdges / totalPixels;
        
        let score = 0;
        const details = [];
        
        // CT typically has sharp edges
        if (edgeRatio > 0.15 && edgeRatio < 0.5) {
            score += 15;
            details.push(`Optimal edge density: ${(edgeRatio * 100).toFixed(1)}%`);
        }
        
        // CT has very strong edges
        if (strongEdgeRatio > 0.03) {
            score += 10;
            details.push(`Strong edges detected: ${(strongEdgeRatio * 100).toFixed(1)}%`);
        }
        
        // CT has bone edges
        if (boneEdgeRatio > 0.005) {
            score += 15;
            details.push(`Bone edges detected: ${(boneEdgeRatio * 100).toFixed(1)}%`);
        }
        
        return { score, details };
    }

    analyzeCTTexture(data, width, height) {
        // Analyze CT-specific texture patterns
        let textureScore = 0;
        let uniformPatterns = 0;
        let totalPatterns = 0;
        let bonePatterns = 0;
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                
                // Get 8 neighbors
                const neighbors = [
                    (data[((y - 1) * width + x) * 4] + data[((y - 1) * width + x) * 4 + 1] + data[((y - 1) * width + x) * 4 + 2]) / 3,
                    (data[((y - 1) * width + x + 1) * 4] + data[((y - 1) * width + x + 1) * 4 + 1] + data[((y - 1) * width + x + 1) * 4 + 2]) / 3,
                    (data[(y * width + x + 1) * 4] + data[(y * width + x + 1) * 4 + 1] + data[(y * width + x + 1) * 4 + 2]) / 3,
                    (data[((y + 1) * width + x + 1) * 4] + data[((y + 1) * width + x + 1) * 4 + 1] + data[((y + 1) * width + x + 1) * 4 + 2]) / 3,
                    (data[((y + 1) * width + x) * 4] + data[((y + 1) * width + x) * 4 + 1] + data[((y + 1) * width + x) * 4 + 2]) / 3,
                    (data[((y + 1) * width + x - 1) * 4] + data[((y + 1) * width + x - 1) * 4 + 1] + data[((y + 1) * width + x - 1) * 4 + 2]) / 3,
                    (data[(y * width + x - 1) * 4] + data[(y * width + x - 1) * 4 + 1] + data[(y * width + x - 1) * 4 + 2]) / 3,
                    (data[((y - 1) * width + x - 1) * 4] + data[((y - 1) * width + x - 1) * 4 + 1] + data[((y - 1) * width + x - 1) * 4 + 2]) / 3
                ];
                
                // Create binary pattern
                let pattern = 0;
                let transitions = 0;
                let hasBone = false;
                
                for (let i = 0; i < 8; i++) {
                    if (neighbors[i] > center) {
                        pattern |= (1 << i);
                        if (neighbors[i] > 200) hasBone = true; // Bone tissue
                    }
                }
                
                // Count transitions
                for (let i = 0; i < 8; i++) {
                    const current = (pattern >> i) & 1;
                    const next = (pattern >> ((i + 1) % 8)) & 1;
                    if (current !== next) transitions++;
                }
                
                totalPatterns++;
                if (transitions <= 2) uniformPatterns++;
                if (hasBone) bonePatterns++;
            }
        }
        
        const uniformRatio = uniformPatterns / totalPatterns;
        const boneRatio = bonePatterns / totalPatterns;
        
        let score = 0;
        const details = [];
        
        // CT has specific texture patterns
        if (uniformRatio > 0.25 && uniformRatio < 0.6) {
            score += 10;
            details.push(`Optimal texture patterns: ${(uniformRatio * 100).toFixed(1)}%`);
        }
        
        // CT has bone patterns
        if (boneRatio > 0.05) {
            score += 15;
            details.push(`Bone texture patterns: ${(boneRatio * 100).toFixed(1)}%`);
        }
        
        return { score, details };
    }

    analyzeCTFrequencyDomain(data, width, height) {
        // CT-specific frequency domain analysis
        let highFreqPixels = 0;
        let lowFreqPixels = 0;
        let boneFreqPixels = 0;
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const current = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                
                // Calculate local frequency using Laplacian
                const top = (data[((y - 1) * width + x) * 4] + data[((y - 1) * width + x) * 4 + 1] + data[((y - 1) * width + x) * 4 + 2]) / 3;
                const bottom = (data[((y + 1) * width + x) * 4] + data[((y + 1) * width + x) * 4 + 1] + data[((y + 1) * width + x) * 4 + 2]) / 3;
                const left = (data[(y * width + x - 1) * 4] + data[(y * width + x - 1) * 4 + 1] + data[(y * width + x - 1) * 4 + 2]) / 3;
                const right = (data[(y * width + x + 1) * 4] + data[(y * width + x + 1) * 4 + 1] + data[(y * width + x + 1) * 4 + 2]) / 3;
                
                const laplacian = Math.abs(4 * current - top - bottom - left - right);
                
                if (laplacian > 60) {
                    highFreqPixels++;
                    if (current > 200) boneFreqPixels++; // High frequency bone areas
                } else if (laplacian < 15) {
                    lowFreqPixels++;
                }
            }
        }
        
        const totalPixels = (width - 2) * (height - 2);
        const highFreqRatio = highFreqPixels / totalPixels;
        const lowFreqRatio = lowFreqPixels / totalPixels;
        const boneFreqRatio = boneFreqPixels / totalPixels;
        
        let score = 0;
        const details = [];
        
        // CT has high frequency content
        if (highFreqRatio > 0.15 && highFreqRatio < 0.4) {
            score += 10;
            details.push(`High frequency content: ${(highFreqRatio * 100).toFixed(1)}%`);
        }
        
        // CT has bone frequency patterns
        if (boneFreqRatio > 0.01) {
            score += 15;
            details.push(`Bone frequency patterns: ${(boneFreqRatio * 100).toFixed(1)}%`);
        }
        
        return { score, details };
    }

    analyzeCTAnatomicalPatterns(data, width, height) {
        // Look for CT-specific anatomical structures
        let anatomicalScore = 0;
        const details = [];
        
        // Check for bone structures (very bright areas)
        const boneStructures = this.detectBoneStructures(data, width, height);
        if (boneStructures > 0) {
            anatomicalScore += 15;
            details.push(`${boneStructures} bone structures detected`);
        }
        
        // Check for air cavities (very dark areas)
        const airCavities = this.detectAirCavities(data, width, height);
        if (airCavities > 0) {
            anatomicalScore += 10;
            details.push(`${airCavities} air cavities detected`);
        }
        
        return { score: anatomicalScore, details };
    }

    detectBoneStructures(data, width, height) {
        // Detect bone structures (very bright, connected areas)
        let boneCount = 0;
        let visited = new Set();
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                
                if (gray > 220 && !visited.has(`${x},${y}`)) {
                    // Found potential bone pixel, check connected area
                    const boneArea = this.floodFillBone(data, width, height, x, y, visited);
                    if (boneArea > 50) { // Minimum bone area
                        boneCount++;
                    }
                }
            }
        }
        
        return boneCount;
    }

    floodFillBone(data, width, height, startX, startY, visited) {
        const stack = [[startX, startY]];
        let area = 0;
        
        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const key = `${x},${y}`;
            
            if (visited.has(key) || x < 0 || x >= width || y < 0 || y >= height) {
                continue;
            }
            
            const idx = (y * width + x) * 4;
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            
            if (gray > 200) {
                visited.add(key);
                area++;
                
                // Add neighbors
                stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
            }
        }
        
        return area;
    }

    detectAirCavities(data, width, height) {
        // Detect air cavities (very dark, connected areas)
        let cavityCount = 0;
        let visited = new Set();
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                
                if (gray < 30 && !visited.has(`${x},${y}`)) {
                    // Found potential air cavity, check connected area
                    const cavityArea = this.floodFillAir(data, width, height, x, y, visited);
                    if (cavityArea > 100) { // Minimum cavity area
                        cavityCount++;
                    }
                }
            }
        }
        
        return cavityCount;
    }

    floodFillAir(data, width, height, startX, startY, visited) {
        const stack = [[startX, startY]];
        let area = 0;
        
        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const key = `${x},${y}`;
            
            if (visited.has(key) || x < 0 || x >= width || y < 0 || y >= height) {
                continue;
            }
            
            const idx = (y * width + x) * 4;
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            
            if (gray < 40) {
                visited.add(key);
                area++;
                
                // Add neighbors
                stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
            }
        }
        
        return area;
    }

    async analyzeCTSpecific(img) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // CT-specific analysis
        const analysis = {
            hounsfieldUnits: this.estimateHounsfieldUnits(data, canvas.width, canvas.height),
            sliceThickness: this.estimateCTSliceThickness(data, canvas.width, canvas.height),
            resolution: this.analyzeCTResolution(data, canvas.width, canvas.height),
            artifacts: this.detectCTArtifacts(data, canvas.width, canvas.height),
            contrast: this.analyzeCTContrast(data, canvas.width, canvas.height),
            suspicious: false,
            confidence: 50,
            details: []
        };
        
        // Calculate overall CT authenticity score
        let ctScore = 50; // Base score
        
        // Adjust based on Hounsfield unit distribution
        if (analysis.hounsfieldUnits.reasonable) {
            ctScore += 15;
            analysis.details.push('Reasonable Hounsfield unit distribution');
        } else {
            ctScore -= 10;
            analysis.details.push('Unusual Hounsfield unit distribution');
        }
        
        // Adjust based on slice thickness
        if (analysis.sliceThickness.consistent) {
            ctScore += 10;
            analysis.details.push('Consistent slice thickness detected');
        } else {
            ctScore -= 5;
            analysis.details.push('Inconsistent slice thickness');
        }
        
        // Adjust based on resolution
        if (analysis.resolution.typical) {
            ctScore += 10;
            analysis.details.push('Typical CT resolution');
        } else {
            ctScore -= 5;
            analysis.details.push('Unusual resolution for CT');
        }
        
        // Adjust based on artifacts
        if (analysis.artifacts.count === 0) {
            ctScore -= 15; // No artifacts might indicate AI generation
            analysis.details.push('No typical CT artifacts detected');
        } else if (analysis.artifacts.count > 0 && analysis.artifacts.count < 8) {
            ctScore += 10;
            analysis.details.push(`${analysis.artifacts.count} typical CT artifacts detected`);
        } else {
            ctScore -= 5;
            analysis.details.push('Excessive artifacts detected');
        }
        
        // Adjust based on contrast
        if (analysis.contrast.natural) {
            ctScore += 10;
            analysis.details.push('Natural CT contrast patterns');
        } else {
            ctScore -= 10;
            analysis.details.push('Unusual contrast patterns');
        }
        
        analysis.confidence = Math.max(0, Math.min(100, ctScore));
        analysis.suspicious = ctScore < 40;
        
        return analysis;
    }

    estimateHounsfieldUnits(data, width, height) {
        // Estimate Hounsfield unit distribution (CT-specific)
        const histogram = new Array(256).fill(0);
        
        for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
            histogram[gray]++;
        }
        
        // Calculate typical CT ranges
        let airPixels = 0; // Very dark (air: -1000 HU)
        let fatPixels = 0; // Dark (fat: -100 to -50 HU)
        let waterPixels = 0; // Medium (water: 0 HU)
        let musclePixels = 0; // Bright (muscle: 10-40 HU)
        let bonePixels = 0; // Very bright (bone: 400-1000 HU)
        
        for (let i = 0; i < 256; i++) {
            if (i < 30) airPixels += histogram[i];
            else if (i < 80) fatPixels += histogram[i];
            else if (i < 120) waterPixels += histogram[i];
            else if (i < 180) musclePixels += histogram[i];
            else bonePixels += histogram[i];
        }
        
        const totalPixels = data.length / 4;
        const airRatio = airPixels / totalPixels;
        const fatRatio = fatPixels / totalPixels;
        const waterRatio = waterPixels / totalPixels;
        const muscleRatio = musclePixels / totalPixels;
        const boneRatio = bonePixels / totalPixels;
        
        // Check if distribution is reasonable for CT
        const reasonable = airRatio > 0.1 && boneRatio > 0.02 && waterRatio > 0.1;
        
        return {
            reasonable,
            airRatio,
            fatRatio,
            waterRatio,
            muscleRatio,
            boneRatio,
            details: [
                `Air: ${(airRatio * 100).toFixed(1)}%`,
                `Fat: ${(fatRatio * 100).toFixed(1)}%`,
                `Water: ${(waterRatio * 100).toFixed(1)}%`,
                `Muscle: ${(muscleRatio * 100).toFixed(1)}%`,
                `Bone: ${(boneRatio * 100).toFixed(1)}%`
            ]
        };
    }

    estimateCTSliceThickness(data, width, height) {
        // Analyze slice thickness for CT (different from MRI)
        const profiles = [];
        
        for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 8))) {
            const profile = [];
            for (let y = 0; y < height; y++) {
                const idx = (y * width + x) * 4;
                const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                profile.push(gray);
            }
            profiles.push(profile);
        }
        
        // Calculate consistency of intensity changes
        let consistentChanges = 0;
        let totalChanges = 0;
        
        for (const profile of profiles) {
            for (let i = 1; i < profile.length; i++) {
                const change = Math.abs(profile[i] - profile[i - 1]);
                if (change > 30) { // CT has higher contrast than MRI
                    totalChanges++;
                    // Check if change is consistent with neighboring changes
                    if (i > 1 && i < profile.length - 1) {
                        const prevChange = Math.abs(profile[i - 1] - profile[i - 2]);
                        const nextChange = Math.abs(profile[i + 1] - profile[i]);
                        if (Math.abs(change - prevChange) < 15 && Math.abs(change - nextChange) < 15) {
                            consistentChanges++;
                        }
                    }
                }
            }
        }
        
        const consistency = totalChanges > 0 ? consistentChanges / totalChanges : 0;
        
        return {
            consistent: consistency > 0.5,
            consistency: consistency,
            details: [`Slice consistency: ${(consistency * 100).toFixed(1)}%`]
        };
    }

    analyzeCTResolution(data, width, height) {
        // Check if resolution is typical for CT
        const typicalResolutions = [
            { width: 256, height: 256 },
            { width: 512, height: 512 },
            { width: 1024, height: 1024 },
            { width: 256, height: 512 },
            { width: 512, height: 256 },
            { width: 320, height: 320 },
            { width: 640, height: 640 }
        ];
        
        let isTypical = false;
        for (const res of typicalResolutions) {
            if (Math.abs(width - res.width) < 50 && Math.abs(height - res.height) < 50) {
                isTypical = true;
                break;
            }
        }
        
        return {
            typical: isTypical,
            width,
            height,
            details: [`Resolution: ${width}x${height}`]
        };
    }

    detectCTArtifacts(data, width, height) {
        const artifacts = [];
        
        // Check for common CT artifacts
        // 1. Beam hardening artifacts
        // 2. Motion artifacts
        // 3. Metal artifacts
        // 4. Partial volume effects
        
        // Simple beam hardening detection (cupping artifacts)
        for (let y = 0; y < height; y++) {
            let rowIntensities = [];
            
            // Collect row intensities
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                rowIntensities.push(gray);
            }
            
            // Check for cupping pattern (darker in center, brighter at edges)
            const center = Math.floor(width / 2);
            const centerIntensity = rowIntensities[center];
            const edgeIntensity = (rowIntensities[0] + rowIntensities[width - 1]) / 2;
            
            if (edgeIntensity > centerIntensity + 20) {
                artifacts.push({
                    type: 'beam_hardening',
                    row: y,
                    centerIntensity,
                    edgeIntensity
                });
            }
        }
        
        // Metal artifact detection (very bright spots)
        let metalPixels = 0;
        for (let i = 0; i < data.length; i += 4) {
            const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            if (gray > 240) {
                metalPixels++;
            }
        }
        
        const metalRatio = metalPixels / (data.length / 4);
        if (metalRatio > 0.01) {
            artifacts.push({
                type: 'metal',
                count: metalPixels,
                ratio: metalRatio
            });
        }
        
        return {
            count: artifacts.length,
            artifacts,
            details: [`${artifacts.length} potential CT artifacts detected`]
        };
    }

    analyzeCTContrast(data, width, height) {
        // Analyze contrast distribution typical of CT
        const histogram = new Array(256).fill(0);
        
        for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
            histogram[gray]++;
        }
        
        // Calculate contrast metrics for CT
        let totalPixels = data.length / 4;
        let cumulative = 0;
        let p5 = 0, p95 = 0;
        
        for (let i = 0; i < 256; i++) {
            cumulative += histogram[i];
            if (cumulative >= totalPixels * 0.05 && p5 === 0) {
                p5 = i;
            }
            if (cumulative >= totalPixels * 0.95 && p95 === 0) {
                p95 = i;
            }
        }
        
        const contrastRange = p95 - p5;
        const natural = contrastRange > 150 && contrastRange < 250; // Typical CT contrast range
        
        return {
            natural,
            contrastRange,
            p5,
            p95,
            details: [`Contrast range: ${contrastRange} (5th-95th percentile)`]
        };
    }

    async analyzeNoisePatterns(img) {
        // Analyze noise patterns in the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let totalNoise = 0;
        let pixelCount = 0;
        
        // Calculate noise level (simplified)
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Calculate local variance as noise indicator
            if (i > 0 && i < data.length - 4) {
                const prevR = data[i - 4];
                const nextR = data[i + 4];
                const variance = Math.abs(r - prevR) + Math.abs(r - nextR);
                totalNoise += variance;
                pixelCount++;
            }
        }
        
        const averageNoise = totalNoise / pixelCount;
        
        return {
            averageNoise,
            suspicious: averageNoise < 5 || averageNoise > 50, // Thresholds for demo
            confidence: this.calculateNoiseConfidence(averageNoise),
            details: [`Average noise level: ${averageNoise.toFixed(2)}`]
        };
    }

    calculateNoiseConfidence(noise) {
        // Normalize noise confidence (0-100)
        if (noise < 5) return 30; // Too smooth, suspicious
        if (noise > 50) return 40; // Too noisy, suspicious
        if (noise >= 10 && noise <= 30) return 80; // Normal range
        return 60; // Moderate confidence
    }

    async analyzeCompressionArtifacts(img) {
        // Analyze compression artifacts
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let compressionScore = 0;
        let blockCount = 0;
        
        // Check for blocky patterns (compression artifacts)
        for (let y = 0; y < canvas.height - 8; y += 8) {
            for (let x = 0; x < canvas.width - 8; x += 8) {
                const blockVariance = this.calculateBlockVariance(data, x, y, canvas.width);
                compressionScore += blockVariance;
                blockCount++;
            }
        }
        
        const averageCompression = compressionScore / blockCount;
        
        return {
            compressionLevel: averageCompression,
            suspicious: averageCompression > 0.8, // High compression artifacts
            confidence: this.calculateCompressionConfidence(averageCompression),
            details: [`Compression artifact score: ${averageCompression.toFixed(3)}`]
        };
    }

    calculateBlockVariance(data, x, y, width) {
        // Calculate variance within an 8x8 block
        let sum = 0;
        let sumSq = 0;
        let count = 0;
        
        for (let dy = 0; dy < 8; dy++) {
            for (let dx = 0; dx < 8; dx++) {
                const idx = ((y + dy) * width + (x + dx)) * 4;
                const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                sum += gray;
                sumSq += gray * gray;
                count++;
            }
        }
        
        const mean = sum / count;
        const variance = (sumSq / count) - (mean * mean);
        return variance;
    }

    calculateCompressionConfidence(compression) {
        if (compression > 0.8) return 30; // High compression artifacts
        if (compression < 0.2) return 70; // Low compression artifacts
        return 50; // Moderate
    }

    async analyzeStatisticalPatterns(img) {
        // Analyze statistical patterns in pixel distribution
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Calculate histogram
        const histogram = new Array(256).fill(0);
        for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
            histogram[gray]++;
        }
        
        // Calculate entropy
        const totalPixels = data.length / 4;
        let entropy = 0;
        for (let i = 0; i < 256; i++) {
            if (histogram[i] > 0) {
                const p = histogram[i] / totalPixels;
                entropy -= p * Math.log2(p);
            }
        }
        
        return {
            entropy,
            suspicious: entropy < 4 || entropy > 8, // Unusual entropy
            confidence: this.calculateEntropyConfidence(entropy),
            details: [`Image entropy: ${entropy.toFixed(2)}`]
        };
    }

    calculateEntropyConfidence(entropy) {
        if (entropy >= 5 && entropy <= 7) return 80; // Normal range
        if (entropy >= 4 && entropy <= 8) return 60; // Acceptable range
        return 30; // Suspicious
    }

    async analyzeFrequencyDomain(img) {
        // Simplified frequency domain analysis
        // In a real implementation, this would use FFT
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Calculate frequency-like patterns (simplified)
        let frequencyScore = 0;
        let count = 0;
        
        for (let y = 1; y < canvas.height - 1; y++) {
            for (let x = 1; x < canvas.width - 1; x++) {
                const idx = (y * canvas.width + x) * 4;
                const current = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                
                // Check neighbors
                const left = (data[idx - 4] + data[idx - 3] + data[idx - 2]) / 3;
                const right = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
                const top = (data[(y - 1) * canvas.width * 4 + x * 4] + 
                           data[(y - 1) * canvas.width * 4 + x * 4 + 1] + 
                           data[(y - 1) * canvas.width * 4 + x * 4 + 2]) / 3;
                const bottom = (data[(y + 1) * canvas.width * 4 + x * 4] + 
                              data[(y + 1) * canvas.width * 4 + x * 4 + 1] + 
                              data[(y + 1) * canvas.width * 4 + x * 4 + 2]) / 3;
                
                const variance = Math.abs(current - left) + Math.abs(current - right) + 
                               Math.abs(current - top) + Math.abs(current - bottom);
                frequencyScore += variance;
                count++;
            }
        }
        
        const averageFrequency = frequencyScore / count;
        
        return {
            frequencyScore: averageFrequency,
            suspicious: averageFrequency < 10 || averageFrequency > 100,
            confidence: this.calculateFrequencyConfidence(averageFrequency),
            details: [`Frequency pattern score: ${averageFrequency.toFixed(2)}`]
        };
    }

    calculateFrequencyConfidence(frequency) {
        if (frequency >= 20 && frequency <= 80) return 75; // Normal range
        if (frequency >= 10 && frequency <= 100) return 60; // Acceptable
        return 35; // Suspicious
    }

    calculateOverallScore(results) {
        // Weighted average of all analysis results
        const weights = {
            metadata: 0.08,
            noise: 0.15,
            compression: 0.12,
            statistical: 0.15,
            frequency: 0.12,
            mriDetection: 0.08,
            mriAnalysis: 0.08,
            ctDetection: 0.08,
            ctAnalysis: 0.08
        };
        
        let totalScore = 0;
        let totalWeight = 0;
        
        for (const [key, weight] of Object.entries(weights)) {
            if (results[key] && typeof results[key].confidence === 'number') {
                totalScore += results[key].confidence * weight;
                totalWeight += weight;
            }
        }
        
        const overallConfidence = totalWeight > 0 ? totalScore / totalWeight : 50;
        
        return {
            confidence: Math.round(overallConfidence),
            status: this.getStatusFromConfidence(overallConfidence),
            details: this.getOverallDetails(results),
            imageType: this.determineImageType(results)
        };
    }

    getStatusFromConfidence(confidence) {
        if (confidence >= 70) return 'Likely Authentic';
        if (confidence >= 40) return 'Uncertain';
        return 'Likely AI Generated';
    }

    getOverallDetails(results) {
        const details = [];
        let suspiciousCount = 0;
        
        for (const [key, result] of Object.entries(results)) {
            if (key !== 'overall' && result && result.suspicious) {
                suspiciousCount++;
                if (result.details && result.details.length > 0) {
                    details.push(...result.details);
                }
            }
        }
        
        if (suspiciousCount === 0) {
            details.push('No significant signs of manipulation detected');
        } else if (suspiciousCount >= 3) {
            details.push('Multiple indicators of potential manipulation');
        } else {
            details.push('Some indicators of potential manipulation');
        }
        
        // Add image type information
        const imageType = this.determineImageType(results);
        details.push(`Image identified as ${imageType}`);
        
        return details;
    }

    determineImageType(results) {
        // Determine the most likely image type based on detection results
        if (results.ctDetection?.isCT && results.ctDetection.confidence > results.mriDetection?.confidence) {
            return 'CT Scan';
        } else if (results.mriDetection?.isMRI) {
            return 'MRI Scan';
        } else {
            return 'X-Ray';
        }
    }

    async basicAnalyze(file) {
        const img = await this.createImageElement(file);
        const [metadata, noise, compression, statistical, frequency, mriDetection, mriAnalysis, ctDetection, ctAnalysis] = await Promise.all([
            this.analyzeMetadata(file),
            this.analyzeNoisePatterns(img),
            this.analyzeCompressionArtifacts(img),
            this.analyzeStatisticalPatterns(img),
            this.analyzeFrequencyDomain(img),
            this.detectMRI(img),
            this.analyzeMRISpecific(img),
            this.detectCT(img),
            this.analyzeCTSpecific(img)
        ]);
        const results = {
            metadata,
            noise,
            compression,
            statistical,
            frequency,
            mriDetection,
            mriAnalysis,
            ctDetection,
            ctAnalysis
        };
        results.overall = this.calculateOverallScore(results);
        return results;
    }
}

// Export for use in other modules
window.ImageAnalyzer = ImageAnalyzer; 