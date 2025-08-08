// Web Worker for Medical Image Type Classification
// Determines if an image is medical (X-ray, MRI, CT) or non-medical

// =========================
// Configuration & Utilities
// =========================
const CONFIG = {
    DEBUG: false,
    // Downsampling target to cap work while keeping enough detail
    DOWNSAMPLE: { width: 256, height: 256 },
    // Sampling rates
    COLOR_SAMPLE_RATE: 4,      // every Nth pixel for color/stats
    EDGE_STEP: 8,              // step in pixels for edge sampling
    TEXTURE_STEP: 16,          // step in pixels for texture sampling
    // Thresholds
    COLOR_DIFF_THRESHOLD: 0.1, // grayscale (R≈G≈B)
    EDGE_GRAD_THRESHOLD: 0.1,  // gradient magnitude (normalized 0..1)
    EDGE_STRONG_THRESHOLD: 0.3,
    TEXTURE_UNIFORM_TRANSITIONS_MAX: 1,
    MEDICAL_GRID_THRESHOLD: 0.01,
    MEDICAL_MARKER_THRESHOLD: 0.01,
    // Decision thresholds
    MEDICAL_SCORE_MIN: 0.4,
};

// Allow toggling DEBUG via query param (?debug=1 or true)
try {
    const qs = (self && self.location && self.location.search) ? self.location.search : '';
    if (qs) {
        const params = new URLSearchParams(qs);
        const dbg = params.get('debug');
        if (dbg === '1' || dbg === 'true') CONFIG.DEBUG = true;
    }
} catch (e) {
    // noop
}

function logDebug(...args) {
    if (CONFIG.DEBUG) {
        // eslint-disable-next-line no-console
        console.log('[ImageTypeWorker]', ...args);
    }
}

// =========================
// Worker Init
// =========================
// Initialize worker
async function initWorker() {
    try {
        logDebug('Image type classifier worker ready');
        return true;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to initialize image type worker:', error);
        return false;
    }
}

// =========================
// Preprocess: downsample for consistent work budget
// =========================
async function preprocessImage(imageData) {
    return new Promise((resolve) => {
        // Downsample using OffscreenCanvas for consistent feature extraction cost
        const srcCanvas = new OffscreenCanvas(imageData.width, imageData.height);
        const srcCtx = srcCanvas.getContext('2d');
        srcCtx.putImageData(imageData, 0, 0);

        const dstCanvas = new OffscreenCanvas(CONFIG.DOWNSAMPLE.width, CONFIG.DOWNSAMPLE.height);
        const dstCtx = dstCanvas.getContext('2d');
        // High quality scaling
        dstCtx.imageSmoothingEnabled = true;
        dstCtx.imageSmoothingQuality = 'high';
        dstCtx.drawImage(srcCanvas, 0, 0, CONFIG.DOWNSAMPLE.width, CONFIG.DOWNSAMPLE.height);

        const downsampled = dstCtx.getImageData(0, 0, CONFIG.DOWNSAMPLE.width, CONFIG.DOWNSAMPLE.height);
        resolve({
            width: downsampled.width,
            height: downsampled.height,
            data: downsampled.data,
            totalPixels: downsampled.width * downsampled.height,
        });
    });
}

// =========================
// Optimized Feature Helpers
// =========================
function computeStatsAndColor(data, sampleRate = CONFIG.COLOR_SAMPLE_RATE) {
    let count = 0;
    let mean = 0, M2 = 0; // Welford online variance
    let min = Infinity, max = -Infinity;
    let grayscalePixels = 0, colorPixels = 0;

    for (let i = 0; i + 2 < data.length; i += sampleRate * 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Luma (BT.709)
        const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

        count++;
        const delta = luma - mean;
        mean += delta / count;
        M2 += delta * (luma - mean);

        if (luma < min) min = luma;
        if (luma > max) max = luma;

        const colorDiff = (Math.abs(r - g) + Math.abs(g - b) + Math.abs(r - b)) / 255;
        if (colorDiff < CONFIG.COLOR_DIFF_THRESHOLD) grayscalePixels++; else colorPixels++;
    }

    const variance = count > 1 ? M2 / count : 0;
    const std = Math.sqrt(variance);
    const range = max - min;
        
        return {
        statistics: { mean, std, variance, range, max, min },
        color: {
            grayscaleRatio: count ? grayscalePixels / count : 0,
            colorRatio: count ? colorPixels / count : 0,
            isGrayscale: count ? (grayscalePixels / count > 0.8) : false,
            isColor: count ? (colorPixels / count > 0.2) : false,
        }
    };
}

function analyzeEdgesFast(imageInfo) {
    const { width, height, data } = imageInfo;
    let edgeCount = 0;
    let strongEdges = 0;
    let totalSamples = 0;

    // Simple gradient on luma (no kernel allocs)
    const step = CONFIG.EDGE_STEP;
    for (let y = step; y < height - step; y += step) {
        for (let x = step; x < width - step; x += step) {
            const idx = (y * width + x) * 4;
            if (idx + 6 >= data.length) continue;
            const center = (data[idx] + data[idx + 1] + data[idx + 2]) / (3 * 255);
            const rightIdx = idx + 4;
            const bottomIdx = ((y + 1) * width + x) * 4;
            if (bottomIdx + 2 >= data.length) continue;
            const right = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / (3 * 255);
            const bottom = (data[bottomIdx] + data[bottomIdx + 1] + data[bottomIdx + 2]) / (3 * 255);

            const grad = Math.abs(center - right) + Math.abs(center - bottom);
            if (grad > CONFIG.EDGE_GRAD_THRESHOLD) {
                edgeCount++;
                if (grad > CONFIG.EDGE_STRONG_THRESHOLD) strongEdges++;
            }
            totalSamples++;
        }
    }

        return {
        edgeDensity: totalSamples ? edgeCount / totalSamples : 0,
        strongEdgeRatio: totalSamples ? strongEdges / totalSamples : 0,
        totalEdges: edgeCount,
        totalSamples: totalSamples
    };
}

function analyzeTextureFast(imageInfo) {
    const { width, height, data } = imageInfo;
    let uniformPatterns = 0;
    let totalPatterns = 0;

    const step = CONFIG.TEXTURE_STEP;
    for (let y = 1; y < height - 1; y += step) {
        for (let x = 1; x < width - 1; x += step) {
            const idx = (y * width + x) * 4;
            if (idx + 3 >= data.length) continue;
            const center = (data[idx] + data[idx + 1] + data[idx + 2]) / (3 * 255);

            let transitions = 0;
            let prevBit = null;
            let validNeighbors = 0;

            // top
            const topIdx = ((y - 1) * width + x) * 4;
            if (topIdx >= 0 && topIdx + 3 < data.length) {
                const top = (data[topIdx] + data[topIdx + 1] + data[topIdx + 2]) / (3 * 255);
                const bit = top > center;
                prevBit = bit;
                validNeighbors++;
            }
            // bottom
            const bottomIdx = ((y + 1) * width + x) * 4;
            if (bottomIdx + 3 < data.length) {
                const bottom = (data[bottomIdx] + data[bottomIdx + 1] + data[bottomIdx + 2]) / (3 * 255);
                const bit = bottom > center;
                if (prevBit !== null && bit !== prevBit) transitions++;
                prevBit = bit;
                validNeighbors++;
            }
            // left
            const leftIdx = (y * width + (x - 1)) * 4;
            if (leftIdx >= 0 && leftIdx + 3 < data.length) {
                const left = (data[leftIdx] + data[leftIdx + 1] + data[leftIdx + 2]) / (3 * 255);
                const bit = left > center;
                if (prevBit !== null && bit !== prevBit) transitions++;
                prevBit = bit;
                validNeighbors++;
            }
            // right
            const rightIdx = (y * width + (x + 1)) * 4;
            if (rightIdx + 3 < data.length) {
                const right = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / (3 * 255);
                const bit = right > center;
                if (prevBit !== null && bit !== prevBit) transitions++;
                validNeighbors++;
            }

            if (validNeighbors >= 3) {
                if (transitions <= CONFIG.TEXTURE_UNIFORM_TRANSITIONS_MAX) uniformPatterns++;
                totalPatterns++;
            }
        }
    }

    return {
        uniformity: totalPatterns > 0 ? uniformPatterns / totalPatterns : 0.5,
        uniformPatterns,
        totalPatterns
    };
}

// =========================
// Existing Feature Methods (kept), now call optimized helpers
// =========================
function extractClassificationFeatures(imageInfo) {
    try {
        const { width, height, data, totalPixels } = imageInfo;
        logDebug('Extracting features from image...', { width, height, totalPixels });

        // Stats & Color
        const statsColor = computeStatsAndColor(data, CONFIG.COLOR_SAMPLE_RATE);

        // Edges
        const edgeFeatures = analyzeEdgesFast(imageInfo);

        // Texture
        const textureFeatures = analyzeTextureFast(imageInfo);

        // Medical-specific features (kept as-is for now)
        const medicalFeatures = analyzeMedicalFeatures(imageInfo);
        
        // Anatomical pattern analysis (kept as-is)
        const anatomicalFeatures = analyzeAnatomicalPatterns(imageInfo);
        
        return {
            statistics: statsColor.statistics,
            color: statsColor.color,
            edges: edgeFeatures,
            texture: textureFeatures,
            medical: medicalFeatures,
            anatomical: anatomicalFeatures
        };
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Feature extraction error:', error);
        // Return safe defaults
        return {
            statistics: { mean: 0.5, std: 0.2, variance: 0.04, range: 0.5, max: 0.8, min: 0.3 },
            color: {
                grayscaleRatio: 0.5,
                colorRatio: 0.5,
                isGrayscale: false,
                isColor: true
            },
            edges: { edgeDensity: 0.1, strongEdgeRatio: 0.05, totalEdges: 0, totalSamples: 1 },
            texture: { uniformity: 0.5, uniformPatterns: 0, totalPatterns: 1 },
            medical: { gridLineRatio: 0, markerRatio: 0, hasMedicalArtifacts: false },
            anatomical: { symmetry: 0.5, symmetrySamples: 1, isSymmetrical: false }
        };
    }
}

// Analyze medical-specific features
function analyzeMedicalFeatures(imageInfo) {
    const { width, height, data } = imageInfo;
    let gridLines = 0;
    let markers = 0;
    let totalSamples = 0;
    
    // Look for medical artifacts
    for (let i = 0; i < data.length; i += 32) { // Sample every 8th pixel
        if (i + 3 < data.length) {
            const pixel = (data[i] + data[i + 1] + data[i + 2]) / (3 * 255);
            
            // Check for very bright pixels (potential markers/labels)
            if (pixel > 0.9) {
                markers++;
            }
            
            // Check for very dark pixels (potential grid lines)
            if (pixel < 0.1) {
                gridLines++;
            }
            
            totalSamples++;
        }
    }
    
    return {
        gridLineRatio: totalSamples ? gridLines / totalSamples : 0,
        markerRatio: totalSamples ? markers / totalSamples : 0,
        hasMedicalArtifacts: totalSamples ? (gridLines / totalSamples) > CONFIG.MEDICAL_GRID_THRESHOLD || (markers / totalSamples) > CONFIG.MEDICAL_MARKER_THRESHOLD : false
    };
}

// Analyze anatomical patterns
function analyzeAnatomicalPatterns(imageInfo) {
    const { width, height, data } = imageInfo;
    
    // Analyze symmetry (common in medical images)
    let symmetryScore = 0;
    let symmetrySamples = 0;
    
    for (let y = 0; y < height; y += 16) {
        for (let x = 0; x < width / 2; x += 16) {
            const leftIdx = (y * width + x) * 4;
            const rightIdx = (y * width + (width - 1 - x)) * 4;
            
            if (leftIdx + 3 < data.length && rightIdx + 3 < data.length) {
                const leftPixel = (data[leftIdx] + data[leftIdx + 1] + data[leftIdx + 2]) / (3 * 255);
                const rightPixel = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / (3 * 255);
                
                const symmetry = 1 - Math.abs(leftPixel - rightPixel);
                symmetryScore += symmetry;
                symmetrySamples++;
            }
        }
    }
    
    return {
        symmetry: symmetrySamples ? symmetryScore / symmetrySamples : 0,
        symmetrySamples: symmetrySamples,
        isSymmetrical: symmetrySamples ? (symmetryScore / symmetrySamples) > 0.7 : false
    };
}

// Determine image type based on extracted features
function determineImageType(features) {
    const { statistics, color, edges, texture, medical, anatomical } = features;
    
    let medicalScore = 0;
    let xrayScore = 0;
    let mriScore = 0;
    let ctScore = 0;
    let nonMedicalScore = 0;
    
    const details = [];
    
    // Debug logging
    logDebug('Classification features:', {
        color: color,
        statistics: statistics,
        edges: edges,
        texture: texture,
        medical: medical,
        anatomical: anatomical
    });
    
    // Medical vs Non-Medical Classification
    
    // 1. Color analysis - More lenient
    if (color.isGrayscale && color.grayscaleRatio > 0.7) {
        medicalScore += 0.3;
        details.push('Grayscale image (medical characteristic)');
    } else if (color.isColor && color.colorRatio > 0.5) {
        nonMedicalScore += 0.4; // Reduced weight for color images
        details.push('Color image (non-medical characteristic)');
    }
    
    // 2. Contrast analysis - More lenient
    if (statistics.range > 0.5) {
        medicalScore += 0.3;
        details.push('High contrast (medical characteristic)');
    } else if (statistics.range < 0.2) {
        nonMedicalScore += 0.3;
        details.push('Very low contrast (non-medical characteristic)');
    }
    
    // 3. Edge analysis - More lenient
    if (edges.edgeDensity > 0.03 && edges.edgeDensity < 0.35) {
        medicalScore += 0.2;
        details.push('Moderate edge density (medical characteristic)');
    } else if (edges.edgeDensity > 0.5) {
        nonMedicalScore += 0.3;
        details.push('Very high edge density (non-medical characteristic)');
    }
    
    // 4. Medical artifacts - More lenient
    if (medical.hasMedicalArtifacts && (medical.gridLineRatio > CONFIG.MEDICAL_GRID_THRESHOLD || medical.markerRatio > CONFIG.MEDICAL_MARKER_THRESHOLD)) {
        medicalScore += 0.4;
        details.push('Medical artifacts detected (grids, markers)');
    }
    
    // 5. Anatomical patterns - More lenient
    if (anatomical.isSymmetrical && anatomical.symmetry > 0.6) {
        medicalScore += 0.3;
        details.push('Symmetrical patterns (anatomical characteristic)');
    }
    
    // 6. Texture analysis - More lenient
    if (texture.uniformity > 0.3 && texture.uniformity < 0.9) {
        medicalScore += 0.2;
        details.push('Medical texture patterns');
    } else if (texture.uniformity > 0.95) {
        nonMedicalScore += 0.2;
        details.push('Overly uniform texture (non-medical)');
    }
    
    // 7. Additional non-medical indicators - More lenient
    if (statistics.mean > 0.8) {
        nonMedicalScore += 0.2;
        details.push('Very bright overall (non-medical characteristic)');
    }
    
    if (statistics.std < 0.05) {
        nonMedicalScore += 0.2;
        details.push('Very low variance (non-medical characteristic)');
    }
    
    // Determine primary classification
    let type, confidence;
    
    logDebug('🔍 SCORE DEBUG: Classification scores:', {
        medicalScore: medicalScore.toFixed(3),
        nonMedicalScore: nonMedicalScore.toFixed(3),
        xrayScore: xrayScore.toFixed(3),
        mriScore: mriScore.toFixed(3),
        ctScore: ctScore.toFixed(3)
    });
    
    if (medicalScore > nonMedicalScore && medicalScore > CONFIG.MEDICAL_SCORE_MIN) {
        // It's a medical image, determine specific type
        if (statistics.mean < 0.4) {
            xrayScore += 0.4;
            details.push('Dark overall appearance (X-ray characteristic)');
        }
        
        if (edges.strongEdgeRatio > 0.1) {
            ctScore += 0.3;
            details.push('Strong edge patterns (CT characteristic)');
        }
        
        if (texture.uniformity > 0.7) {
            mriScore += 0.3;
            details.push('Uniform texture patterns (MRI characteristic)');
        }
        
        // Determine medical subtype
        if (xrayScore > mriScore && xrayScore > ctScore) {
            type = 'X-ray';
            confidence = Math.min(0.95, 0.6 + (medicalScore * 0.2));
        } else if (mriScore > ctScore) {
            type = 'MRI';
            confidence = Math.min(0.95, 0.6 + (medicalScore * 0.2));
        } else {
            type = 'CT';
            confidence = Math.min(0.95, 0.6 + (medicalScore * 0.2));
        }
    } else {
        // Non-medical image
        type = 'Non-Medical';
        confidence = Math.min(0.95, 0.6 + (nonMedicalScore * 0.2));
        details.push('Appears to be a non-medical image (photo, illustration, object)');
    }
    
    logDebug('🔍 FINAL DEBUG: Final classification:', { 
        type, 
        confidence: confidence.toFixed(3), 
        details: details.slice(0, 3) // Show first 3 details
    });
    
    return {
        type,
        confidence,
        details: details.slice(0, 5) // Limit to top 5 details
    };
}

// Send progress updates to main thread
function sendProgress(message) {
    self.postMessage({
        type: 'progress',
        message: message,
        timestamp: Date.now()
    });
}

// Main message handler
self.onmessage = async function(e) {
    const { type, data } = e.data;
    
    try {
        switch (type) {
            case 'init':
                sendProgress('Initializing image type classifier...');
                const ready = await initWorker();
                if (ready) {
                    self.postMessage({ type: 'ready' });
                } else {
                    self.postMessage({ type: 'error', error: 'Failed to initialize worker' });
                }
                break;
                
            case 'classify':
                sendProgress('Analyzing image type...');
                const { imageData } = data;
                
                // Add timeout to prevent hanging
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Analysis timeout')), 30000); // 30 second timeout
                });
                
                const analysisPromise = (async () => {
                    // Preprocess image
                    const imageInfo = await preprocessImage(imageData);
                    
                    // Classify image type
                    const results = await determineImageType(extractClassificationFeatures(imageInfo));
                    
                    return results;
                })();
                
                try {
                    const results = await Promise.race([analysisPromise, timeoutPromise]);
                    
                    sendProgress('Image type analysis complete');
                    self.postMessage({
                        type: 'complete',
                        results: results
                    });
                } catch (timeoutError) {
                    // eslint-disable-next-line no-console
                    console.error('Analysis timeout or error:', timeoutError);
                    self.postMessage({
                        type: 'complete',
                        results: {
                            type: 'Non-Medical',
                            confidence: 0.6,
                            details: ['Analysis timed out - defaulting to non-medical'],
                            features: {}
                        }
                    });
                }
                break;
                
            default:
                self.postMessage({ type: 'error', error: 'Unknown message type' });
        }
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Image type worker error:', error);
        self.postMessage({ type: 'error', error: error.message });
    }
}; 