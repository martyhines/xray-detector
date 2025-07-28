// Image Type Classification Utility
// Determines if an uploaded image is medical (X-ray, MRI, CT) or non-medical

class ImageTypeClassifier {
    constructor() {
        this.worker = null;
        this.isWorkerReady = false;
        this.workerLoading = false;
        this.init();
    }

    async init() {
        try {
            await this.initWorker();
        } catch (error) {
            console.error('Failed to initialize image type classifier:', error);
        }
    }

    async initWorker() {
        if (this.workerLoading || this.isWorkerReady) return;
        
        this.workerLoading = true;

        try {
            console.log('Initializing image type worker...');
            // Create Web Worker
            this.worker = new Worker('./src/workers/imageTypeWorker.js');
            
            // Set up message handlers
            this.worker.onmessage = (e) => {
                const { type, message, results, error } = e.data;
                console.log('Worker message received:', type, message || results || error);
                
                switch (type) {
                    case 'ready':
                        this.isWorkerReady = true;
                        console.log('Image type classifier ready');
                        break;
                        
                    case 'progress':
                        console.log('Worker progress:', message);
                        break;
                        
                    case 'complete':
                        console.log('Worker analysis complete');
                        break;
                        
                    case 'error':
                        console.error('Image type worker error:', error);
                        break;
                }
            };
            
            // Initialize the worker
            this.worker.postMessage({ type: 'init' });
            
        } catch (error) {
            console.error('Error initializing image type worker:', error);
            this.isWorkerReady = false;
            this.workerLoading = false;
            throw error;
        } finally {
            this.workerLoading = false;
        }
    }

    async classifyImage(file) {
        console.log('🔍 CLASSIFIER DEBUG: Starting image classification...');
        console.log('🔍 CLASSIFIER DEBUG: File size:', file.size, 'bytes');
        console.log('🔍 CLASSIFIER DEBUG: File type:', file.type);
        
        // Ensure worker is ready
        if (!this.isWorkerReady) {
            console.log('🔍 CLASSIFIER DEBUG: Worker not ready, initializing...');
            await this.initWorker();
        }

        // Wait for worker to be ready
        let attempts = 0;
        while (!this.isWorkerReady && attempts < 20) {
            console.log(`Waiting for worker to be ready... attempt ${attempts + 1}`);
            await new Promise(resolve => setTimeout(resolve, 250));
            attempts++;
        }

        if (!this.isWorkerReady) {
            throw new Error('Image type classifier failed to initialize after multiple attempts');
        }

        try {
            // Convert file to ImageData for worker
            console.log('🔍 CLASSIFIER DEBUG: Converting file to ImageData...');
            const imageData = await this.fileToImageData(file);
            console.log('🔍 CLASSIFIER DEBUG: ImageData created - width:', imageData.width, 'height:', imageData.height);
            
            // Send classification request to worker
            console.log('🔍 CLASSIFIER DEBUG: Sending classification request to worker...');
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Image type classification timeout'));
                }, 15000); // 15 second timeout
                
                // Set up one-time result handler
                const resultHandler = (e) => {
                    const { type, results, error } = e.data;
                    
                    if (type === 'complete') {
                        clearTimeout(timeout);
                        this.worker.removeEventListener('message', resultHandler);
                        console.log('🔍 CLASSIFIER DEBUG: Classification completed:', results);
                        resolve(results);
                    } else if (type === 'error') {
                        clearTimeout(timeout);
                        this.worker.removeEventListener('message', resultHandler);
                        console.error('🔍 CLASSIFIER DEBUG: Classification error:', error);
                        reject(new Error(error));
                    }
                };
                
                this.worker.addEventListener('message', resultHandler);
                
                // Send classification request
                this.worker.postMessage({
                    type: 'classify',
                    data: { imageData }
                });
            });
            
        } catch (error) {
            console.error('Image type classification error:', error);
            throw error;
        }
    }

    async fileToImageData(file) {
        return new Promise((resolve, reject) => {
            console.log('Converting file to ImageData...', file.name, file.size);
            const img = new Image();
            img.onload = () => {
                try {
                    console.log('Image loaded, creating canvas...', img.width, 'x', img.height);
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Set canvas size to image size
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // Draw image to canvas
                    ctx.drawImage(img, 0, 0);
                    
                    // Get ImageData
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    console.log('ImageData created:', imageData.width, 'x', imageData.height, 'data length:', imageData.data.length);
                    resolve(imageData);
                    
                } catch (error) {
                    console.error('Error creating ImageData:', error);
                    reject(error);
                }
            };
            img.onerror = (error) => {
                console.error('Error loading image:', error);
                reject(error);
            };
            img.src = URL.createObjectURL(file);
        });
    }

    // Helper method to check if image is medical
    isMedicalImage(classification) {
        return classification.type === 'X-ray' || 
               classification.type === 'MRI' || 
               classification.type === 'CT';
    }

    // Helper method to get user-friendly message
    getClassificationMessage(classification) {
        const { type, confidence, details } = classification;
        
        if (this.isMedicalImage(classification)) {
            return {
                title: `${type} Image Detected`,
                message: `This appears to be a ${type} image (${Math.round(confidence * 100)}% confidence). Proceeding with authenticity analysis.`,
                type: 'medical',
                canProceed: true
            };
        } else {
            return {
                title: 'Non-Medical Image Detected',
                message: `This appears to be a non-medical image (${Math.round(confidence * 100)}% confidence). Please upload a medical image (X-ray, MRI, or CT scan) for authenticity analysis.`,
                type: 'non-medical',
                canProceed: false,
                details: details.join(', ')
            };
        }
    }

    // Get model information
    getModelInfo() {
        return {
            loaded: this.isWorkerReady,
            type: 'Medical Image Type Classifier',
            purpose: 'Distinguish between medical and non-medical images',
            supportedTypes: ['X-ray', 'MRI', 'CT', 'Non-Medical']
        };
    }
}

// Export for use in other modules
window.ImageTypeClassifier = ImageTypeClassifier; 