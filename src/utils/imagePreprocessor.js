// Enhanced Image Preprocessor for Medical Images
class ImagePreprocessor {
    constructor() {
        this.targetSize = 256;
        this.textDetectionThreshold = 0.8;
        this.overlayDetectionThreshold = 0.7;
    }

    async preprocessImage(imageData, isDICOM = false) {
        try {
            if (isDICOM) {
                // DICOM files are already preprocessed
                return imageData;
            }

            console.log('Starting enhanced preprocessing for non-DICOM image...');
            
            // Step 1: Convert to grayscale
            const grayscaleData = this.convertToGrayscale(imageData);
            console.log('✓ Converted to grayscale');

            // Step 2: Detect and crop patient info/overlays
            const croppedData = await this.detectAndCropOverlays(grayscaleData);
            console.log('✓ Detected and cropped overlays');

            // Step 3: Normalize pixel values
            const normalizedData = this.normalizePixels(croppedData);
            console.log('✓ Normalized pixel values');

            // Step 4: Resize to standard dimensions
            const resizedData = this.resizeToStandard(normalizedData);
            console.log('✓ Resized to 256x256');

            return resizedData;
        } catch (error) {
            console.error('Preprocessing error:', error);
            // Return original data if preprocessing fails
            return imageData;
        }
    }

    convertToGrayscale(imageData) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Create temporary canvas with original image
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;
        tempCtx.putImageData(imageData, 0, 0);

        // Set target canvas size
        canvas.width = imageData.width;
        canvas.height = imageData.height;

        // Convert to grayscale using luminance formula
        ctx.filter = 'grayscale(100%)';
        ctx.drawImage(tempCanvas, 0, 0);

        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    async detectAndCropOverlays(imageData) {
        const { width, height, data } = imageData;
        
        // Detect text regions and overlays
        const textRegions = this.detectTextRegions(data, width, height);
        const overlayRegions = this.detectOverlayRegions(data, width, height);
        
        // Combine all regions to crop
        const regionsToCrop = [...textRegions, ...overlayRegions];
        
        if (regionsToCrop.length === 0) {
            return imageData; // No overlays detected
        }

        // Calculate safe cropping boundaries
        const cropBounds = this.calculateCropBounds(regionsToCrop, width, height);
        
        // Apply cropping
        return this.cropImage(imageData, cropBounds);
    }

    detectTextRegions(data, width, height) {
        const regions = [];
        const visited = new Set();
        
        // Scan for high-contrast regions that might be text
        for (let y = 0; y < height; y += 10) { // Sample every 10 pixels
            for (let x = 0; x < width; x += 10) {
                const idx = (y * width + x) * 4;
                const pixel = data[idx];
                
                // Check for high contrast (potential text)
                if (this.isHighContrastRegion(data, x, y, width, height)) {
                    const region = this.floodFillText(data, x, y, width, height, visited);
                    if (region && region.area > 100) { // Minimum text area
                        regions.push(region);
                    }
                }
            }
        }
        
        return regions;
    }

    detectOverlayRegions(data, width, height) {
        const regions = [];
        
        // Detect common overlay patterns
        const patterns = [
            { name: 'timestamp', yRange: [0, 0.1], xRange: [0.7, 1.0] }, // Top-right corner
            { name: 'patient_info', yRange: [0, 0.15], xRange: [0, 0.4] }, // Top-left corner
            { name: 'device_info', yRange: [0.85, 1.0], xRange: [0, 0.3] }, // Bottom-left corner
            { name: 'measurements', yRange: [0.8, 1.0], xRange: [0.7, 1.0] } // Bottom-right corner
        ];

        patterns.forEach(pattern => {
            const region = this.detectPatternInRegion(data, width, height, pattern);
            if (region) {
                regions.push(region);
            }
        });

        return regions;
    }

    isHighContrastRegion(data, x, y, width, height) {
        const sampleSize = 5;
        let minVal = 255, maxVal = 0;
        
        for (let dy = -sampleSize; dy <= sampleSize; dy++) {
            for (let dx = -sampleSize; dx <= sampleSize; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const idx = (ny * width + nx) * 4;
                    const pixel = data[idx];
                    minVal = Math.min(minVal, pixel);
                    maxVal = Math.max(maxVal, pixel);
                }
            }
        }
        
        return (maxVal - minVal) > 100; // High contrast threshold
    }

    floodFillText(data, startX, startY, width, height, visited) {
        const queue = [{x: startX, y: startY}];
        const region = { x: startX, y: startY, width: 0, height: 0, area: 0 };
        const pixels = [];
        
        while (queue.length > 0) {
            const {x, y} = queue.shift();
            const key = `${x},${y}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            const idx = (y * width + x) * 4;
            const pixel = data[idx];
            
            // Check if pixel is part of text (dark or bright)
            if (pixel < 50 || pixel > 200) {
                pixels.push({x, y});
                region.area++;
                
                // Add neighbors
                const neighbors = [
                    {x: x+1, y}, {x: x-1, y},
                    {x, y: y+1}, {x, y: y-1}
                ];
                
                neighbors.forEach(n => {
                    if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
                        queue.push(n);
                    }
                });
            }
        }
        
        if (region.area > 50) { // Minimum area for text region
            // Calculate bounding box
            const xs = pixels.map(p => p.x);
            const ys = pixels.map(p => p.y);
            region.x = Math.min(...xs);
            region.y = Math.min(...ys);
            region.width = Math.max(...xs) - region.x;
            region.height = Math.max(...ys) - region.y;
            return region;
        }
        
        return null;
    }

    detectPatternInRegion(data, width, height, pattern) {
        const startY = Math.floor(pattern.yRange[0] * height);
        const endY = Math.floor(pattern.yRange[1] * height);
        const startX = Math.floor(pattern.xRange[0] * width);
        const endX = Math.floor(pattern.xRange[1] * width);
        
        let hasOverlay = false;
        let overlayPixels = 0;
        const totalPixels = (endX - startX) * (endY - startY);
        
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const idx = (y * width + x) * 4;
                const pixel = data[idx];
                
                // Check for overlay characteristics (very dark or very bright)
                if (pixel < 30 || pixel > 225) {
                    overlayPixels++;
                }
            }
        }
        
        const overlayRatio = overlayPixels / totalPixels;
        hasOverlay = overlayRatio > this.overlayDetectionThreshold;
        
        if (hasOverlay) {
            return {
                x: startX,
                y: startY,
                width: endX - startX,
                height: endY - startY,
                type: pattern.name
            };
        }
        
        return null;
    }

    calculateCropBounds(regions, imageWidth, imageHeight) {
        if (regions.length === 0) {
            return { x: 0, y: 0, width: imageWidth, height: imageHeight };
        }
        
        // Find the largest safe area by excluding overlay regions
        let minX = 0, minY = 0, maxX = imageWidth, maxY = imageHeight;
        
        regions.forEach(region => {
            // Expand crop area to avoid overlays
            if (region.x < imageWidth * 0.5) {
                minX = Math.max(minX, region.x + region.width);
            }
            if (region.y < imageHeight * 0.5) {
                minY = Math.max(minY, region.y + region.height);
            }
            if (region.x > imageWidth * 0.5) {
                maxX = Math.min(maxX, region.x);
            }
            if (region.y > imageHeight * 0.5) {
                maxY = Math.min(maxY, region.y);
            }
        });
        
        // Ensure minimum crop size
        const minCropSize = Math.min(imageWidth, imageHeight) * 0.6;
        const cropWidth = maxX - minX;
        const cropHeight = maxY - minY;
        
        if (cropWidth < minCropSize || cropHeight < minCropSize) {
            // If crop is too small, use center crop
            const centerX = imageWidth / 2;
            const centerY = imageHeight / 2;
            const halfSize = minCropSize / 2;
            
            return {
                x: Math.max(0, centerX - halfSize),
                y: Math.max(0, centerY - halfSize),
                width: Math.min(imageWidth, minCropSize),
                height: Math.min(imageHeight, minCropSize)
            };
        }
        
        return { x: minX, y: minY, width: cropWidth, height: cropHeight };
    }

    cropImage(imageData, bounds) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Create temporary canvas with original image
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;
        tempCtx.putImageData(imageData, 0, 0);
        
        // Set crop canvas size
        canvas.width = bounds.width;
        canvas.height = bounds.height;
        
        // Draw cropped region
        ctx.drawImage(
            tempCanvas,
            bounds.x, bounds.y, bounds.width, bounds.height,
            0, 0, bounds.width, bounds.height
        );
        
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    normalizePixels(imageData) {
        const { data, width, height } = imageData;
        const normalizedData = new Uint8ClampedArray(data.length);
        
        // Find min and max values for normalization
        let minVal = 255, maxVal = 0;
        for (let i = 0; i < data.length; i += 4) {
            const pixel = data[i];
            minVal = Math.min(minVal, pixel);
            maxVal = Math.max(maxVal, pixel);
        }
        
        const range = maxVal - minVal;
        
        // Normalize to [0, 255] range
        for (let i = 0; i < data.length; i += 4) {
            const normalizedValue = range > 0 ? 
                ((data[i] - minVal) / range) * 255 : 0;
            
            normalizedData[i] = normalizedValue;     // Red
            normalizedData[i + 1] = normalizedValue; // Green
            normalizedData[i + 2] = normalizedValue; // Blue
            normalizedData[i + 3] = 255;             // Alpha
        }
        
        return new ImageData(normalizedData, width, height);
    }

    resizeToStandard(imageData) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Create temporary canvas with current image
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;
        tempCtx.putImageData(imageData, 0, 0);
        
        // Set target size
        canvas.width = this.targetSize;
        canvas.height = this.targetSize;
        
        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw resized image
        ctx.drawImage(tempCanvas, 0, 0, this.targetSize, this.targetSize);
        
        return ctx.getImageData(0, 0, this.targetSize, this.targetSize);
    }

    // Utility method to get preprocessing statistics
    getPreprocessingStats(originalData, processedData) {
        return {
            originalSize: `${originalData.width}x${originalData.height}`,
            processedSize: `${processedData.width}x${processedData.height}`,
            sizeReduction: `${((1 - (processedData.width * processedData.height) / (originalData.width * originalData.height)) * 100).toFixed(1)}%`,
            targetSize: `${this.targetSize}x${this.targetSize}`
        };
    }
}

// Export for global use
window.ImagePreprocessor = ImagePreprocessor; 