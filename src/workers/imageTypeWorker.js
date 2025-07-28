// Web Worker for Medical Image Type Classification
// Determines if an image is medical (X-ray, MRI, CT) or non-medical

// Initialize worker
async function initWorker() {
    try {
        console.log('Image type classifier worker ready');
        return true;
    } catch (error) {
        console.error('Failed to initialize image type worker:', error);
        return false;
    }
}

// Preprocess image for classification
async function preprocessImage(imageData) {
    return new Promise((resolve) => {
        // Create a simple data structure for analysis
        const imageInfo = {
            width: imageData.width,
            height: imageData.height,
            data: imageData.data,
            totalPixels: imageData.width * imageData.height
        };
        resolve(imageInfo);
    });
}

// Classify image type using comprehensive analysis
async function classifyImageType(imageInfo) {
    try {
        // Extract comprehensive features for classification
        const features = extractClassificationFeatures(imageInfo);
        
        // Determine image type based on features
        const classification = determineImageType(features);
        
        return {
            type: classification.type,
            confidence: classification.confidence,
            details: classification.details,
            features: features
        };
    } catch (error) {
        console.error('Classification error:', error);
        // Return a safe default classification
        return {
            type: 'Non-Medical',
            confidence: 0.6,
            details: ['Unable to perform detailed analysis - defaulting to non-medical'],
            features: {}
        };
    }
}

// Extract features for image type classification
function extractClassificationFeatures(imageInfo) {
    try {
        const { width, height, data, totalPixels } = imageInfo;
        
        // Sample pixels for analysis (every 4th pixel for performance)
        const sampleRate = 4;
        let grayscalePixels = 0;
        let colorPixels = 0;
        let totalSamples = 0;
        let pixelValues = [];
        
        for (let i = 0; i < data.length; i += sampleRate * 4) {
            if (i + 3 < data.length) {
                const r = data[i] / 255;
                const g = data[i + 1] / 255;
                const b = data[i + 2] / 255;
                
                // Check if pixel is grayscale (R ≈ G ≈ B)
                const colorDiff = Math.abs(r - g) + Math.abs(g - b) + Math.abs(r - b);
                if (colorDiff < 0.1) {
                    grayscalePixels++;
                } else {
                    colorPixels++;
                }
                
                pixelValues.push((r + g + b) / 3);
                totalSamples++;
            }
        }
        
        // Calculate statistics with safety checks
        if (pixelValues.length === 0) {
            throw new Error('No valid pixels found for analysis');
        }
        
        const mean = pixelValues.reduce((sum, val) => sum + val, 0) / pixelValues.length;
        const variance = pixelValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / pixelValues.length;
        const std = Math.sqrt(variance);
        const min = Math.min(...pixelValues);
        const max = Math.max(...pixelValues);
        const range = max - min;
        
        // Edge analysis
        const edgeFeatures = analyzeEdges(imageInfo);
        
        // Texture analysis
        const textureFeatures = analyzeTexture(imageInfo);
        
        // Medical-specific features
        const medicalFeatures = analyzeMedicalFeatures(imageInfo);
        
        // Anatomical pattern analysis
        const anatomicalFeatures = analyzeAnatomicalPatterns(imageInfo);
        
        return {
            statistics: { mean, std, variance, range, max, min },
            color: {
                grayscaleRatio: grayscalePixels / totalSamples,
                colorRatio: colorPixels / totalSamples,
                isGrayscale: grayscalePixels / totalSamples > 0.8,
                isColor: colorPixels / totalSamples > 0.2
            },
            edges: edgeFeatures,
            texture: textureFeatures,
            medical: medicalFeatures,
            anatomical: anatomicalFeatures
        };
    } catch (error) {
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

// Analyze edge patterns
function analyzeEdges(imageInfo) {
    const { width, height, data } = imageInfo;
    let edgeCount = 0;
    let strongEdges = 0;
    let totalSamples = 0;
    
    // Sample edges for analysis
    for (let y = 1; y < height - 1; y += 8) {
        for (let x = 1; x < width - 1; x += 8) {
            const idx = (y * width + x) * 4;
            if (idx + 3 < data.length) {
                const center = (data[idx] + data[idx + 1] + data[idx + 2]) / (3 * 255);
                const right = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / (3 * 255);
                const bottom = (data[(y + 1) * width * 4 + x * 4] + data[(y + 1) * width * 4 + x * 4 + 1] + data[(y + 1) * width * 4 + x * 4 + 2]) / (3 * 255);
                
                const gradient = Math.abs(center - right) + Math.abs(center - bottom);
                
                if (gradient > 0.1) {
                    edgeCount++;
                    if (gradient > 0.3) {
                        strongEdges++;
                    }
                }
                totalSamples++;
            }
        }
    }
    
    return {
        edgeDensity: edgeCount / totalSamples,
        strongEdgeRatio: strongEdges / totalSamples,
        totalEdges: edgeCount,
        totalSamples: totalSamples
    };
}

// Analyze texture patterns
function analyzeTexture(imageInfo) {
    const { width, height, data } = imageInfo;
    let uniformPatterns = 0;
    let totalPatterns = 0;
    
    try {
        // Sample texture patterns with bounds checking
        for (let y = 1; y < height - 1; y += 16) { // Increased step size for performance
            for (let x = 1; x < width - 1; x += 16) {
                const idx = (y * width + x) * 4;
                
                // Bounds checking
                if (idx + 3 >= data.length) continue;
                
                const center = (data[idx] + data[idx + 1] + data[idx + 2]) / (3 * 255);
                
                // Check 4 neighbors with bounds checking
                let transitions = 0;
                let prevBit = null;
                let validNeighbors = 0;
                
                // Top neighbor
                const topIdx = ((y - 1) * width + x) * 4;
                if (topIdx >= 0 && topIdx + 3 < data.length) {
                    const topPixel = (data[topIdx] + data[topIdx + 1] + data[topIdx + 2]) / (3 * 255);
                    const bit = topPixel > center;
                    prevBit = bit;
                    validNeighbors++;
                }
                
                // Bottom neighbor
                const bottomIdx = ((y + 1) * width + x) * 4;
                if (bottomIdx + 3 < data.length) {
                    const bottomPixel = (data[bottomIdx] + data[bottomIdx + 1] + data[bottomIdx + 2]) / (3 * 255);
                    const bit = bottomPixel > center;
                    if (prevBit !== null && bit !== prevBit) {
                        transitions++;
                    }
                    prevBit = bit;
                    validNeighbors++;
                }
                
                // Left neighbor
                const leftIdx = (y * width + (x - 1)) * 4;
                if (leftIdx >= 0 && leftIdx + 3 < data.length) {
                    const leftPixel = (data[leftIdx] + data[leftIdx + 1] + data[leftIdx + 2]) / (3 * 255);
                    const bit = leftPixel > center;
                    if (prevBit !== null && bit !== prevBit) {
                        transitions++;
                    }
                    prevBit = bit;
                    validNeighbors++;
                }
                
                // Right neighbor
                const rightIdx = (y * width + (x + 1)) * 4;
                if (rightIdx + 3 < data.length) {
                    const rightPixel = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / (3 * 255);
                    const bit = rightPixel > center;
                    if (prevBit !== null && bit !== prevBit) {
                        transitions++;
                    }
                    validNeighbors++;
                }
                
                // Only count if we have enough valid neighbors
                if (validNeighbors >= 3) {
                    if (transitions <= 1) {
                        uniformPatterns++;
                    }
                    totalPatterns++;
                }
            }
        }
    } catch (error) {
        console.error('Texture analysis error:', error);
        // Return safe defaults
        return {
            uniformity: 0.5,
            uniformPatterns: 0,
            totalPatterns: 1
        };
    }
    
    return {
        uniformity: totalPatterns > 0 ? uniformPatterns / totalPatterns : 0.5,
        uniformPatterns: uniformPatterns,
        totalPatterns: totalPatterns
    };
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
        gridLineRatio: gridLines / totalSamples,
        markerRatio: markers / totalSamples,
        hasMedicalArtifacts: (gridLines / totalSamples) > 0.01 || (markers / totalSamples) > 0.01
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
        symmetry: symmetryScore / symmetrySamples,
        symmetrySamples: symmetrySamples,
        isSymmetrical: (symmetryScore / symmetrySamples) > 0.7
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
    console.log('Classification features:', {
        color: color,
        statistics: statistics,
        edges: edges,
        texture: texture,
        medical: medical,
        anatomical: anatomical
    });
    
    // Medical vs Non-Medical Classification
    
    // 1. Color analysis - More strict
    if (color.isGrayscale && color.grayscaleRatio > 0.9) {
        medicalScore += 0.3;
        details.push('Strongly grayscale image (medical characteristic)');
    } else if (color.isColor && color.colorRatio > 0.3) {
        nonMedicalScore += 0.6; // Increased weight for color images
        details.push('Color image (strong non-medical characteristic)');
    }
    
    // 2. Contrast analysis - More strict
    if (statistics.range > 0.7) {
        medicalScore += 0.3;
        details.push('Very high contrast (medical characteristic)');
    } else if (statistics.range < 0.4) {
        nonMedicalScore += 0.4;
        details.push('Low contrast (non-medical characteristic)');
    }
    
    // 3. Edge analysis - More strict
    if (edges.edgeDensity > 0.05 && edges.edgeDensity < 0.25) {
        medicalScore += 0.2;
        details.push('Moderate edge density (medical characteristic)');
    } else if (edges.edgeDensity > 0.4) {
        nonMedicalScore += 0.4;
        details.push('High edge density (non-medical characteristic)');
    }
    
    // 4. Medical artifacts - More strict
    if (medical.hasMedicalArtifacts && (medical.gridLineRatio > 0.02 || medical.markerRatio > 0.02)) {
        medicalScore += 0.4;
        details.push('Clear medical artifacts detected (grids, markers)');
    }
    
    // 5. Anatomical patterns - More strict
    if (anatomical.isSymmetrical && anatomical.symmetry > 0.8) {
        medicalScore += 0.3;
        details.push('Strong symmetrical patterns (anatomical characteristic)');
    }
    
    // 6. Texture analysis - More strict
    if (texture.uniformity > 0.5 && texture.uniformity < 0.85) {
        medicalScore += 0.2;
        details.push('Medical texture patterns');
    } else if (texture.uniformity > 0.9) {
        nonMedicalScore += 0.3;
        details.push('Overly uniform texture (non-medical)');
    }
    
    // 7. Additional non-medical indicators
    if (statistics.mean > 0.7) {
        nonMedicalScore += 0.3;
        details.push('Very bright overall (non-medical characteristic)');
    }
    
    if (statistics.std < 0.1) {
        nonMedicalScore += 0.2;
        details.push('Low variance (non-medical characteristic)');
    }
    
    // Determine primary classification
    let type, confidence;
    
    console.log('Classification scores:', {
        medicalScore,
        nonMedicalScore,
        xrayScore,
        mriScore,
        ctScore
    });
    
    if (medicalScore > nonMedicalScore && medicalScore > 0.7) {
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
    
    console.log('Final classification:', { type, confidence, details });
    
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
                    const results = await classifyImageType(imageInfo);
                    
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
        console.error('Image type worker error:', error);
        self.postMessage({ type: 'error', error: error.message });
    }
}; 