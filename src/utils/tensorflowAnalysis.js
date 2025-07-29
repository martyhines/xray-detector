// TensorFlow.js Analysis Utility with Web Worker
class TensorFlowAnalyzer {
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
            console.error('Failed to initialize analysis worker:', error);
        }
    }

    async initWorker() {
        if (this.workerLoading || this.isWorkerReady) return;
        
        this.workerLoading = true;
        this.updateModelStatus('Initializing analysis worker...');

        try {
            // Create Web Worker
            this.worker = new Worker('/src/workers/analysisWorker.js');
            
            // Set up message handlers
            this.worker.onmessage = (e) => {
                const { type, message, results, error } = e.data;
                
                switch (type) {
                    case 'ready':
                        this.isWorkerReady = true;
                        this.updateModelStatus('Ready');
                        console.log('Analysis worker ready');
                        break;
                        
                    case 'progress':
                        this.updateModelStatus(message);
                        break;
                        
                    case 'complete':
                        this.updateModelStatus('Analysis complete');
                        break;
                        
                    case 'error':
                        console.error('Worker error:', error);
                        this.updateModelStatus('Analysis failed');
                        break;
                }
            };
            
            // Initialize the worker
            this.worker.postMessage({ type: 'init' });
            
        } catch (error) {
            console.error('Error initializing worker:', error);
            this.updateModelStatus('Failed to initialize');
            this.isWorkerReady = false;
        } finally {
            this.workerLoading = false;
        }
    }



    async analyzeImage(file) {
        // Ensure worker is ready before analysis
        if (!this.isWorkerReady) {
            await this.initWorker();
        }

        // Wait for worker to be ready
        let attempts = 0;
        while (!this.isWorkerReady && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 250));
            attempts++;
        }

        if (!this.isWorkerReady) {
            throw new Error('Analysis worker failed to initialize after multiple attempts');
        }

        try {
            this.updateModelStatus('Preparing image for analysis...');
            
            // Convert file to ImageData for worker
            const imageData = await this.fileToImageData(file);
            
            // Send analysis request to worker
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Analysis timeout'));
                }, 30000); // 30 second timeout
                
                // Set up one-time result handler
                const resultHandler = (e) => {
                    const { type, results, error } = e.data;
                    
                    if (type === 'complete') {
                        clearTimeout(timeout);
                        this.worker.removeEventListener('message', resultHandler);
                        resolve(this.interpretResults(results));
                    } else if (type === 'error') {
                        clearTimeout(timeout);
                        this.worker.removeEventListener('message', resultHandler);
                        reject(new Error(error));
                    }
                };
                
                this.worker.addEventListener('message', resultHandler);
                
                // Send analysis request
                this.worker.postMessage({
                    type: 'analyze',
                    data: { imageData }
                });
            });
            
        } catch (error) {
            console.error('Worker analysis error:', error);
            this.updateModelStatus('Analysis failed');
            throw error;
        }
    }

    async fileToImageData(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Set canvas size to image size
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // Draw image to canvas
                    ctx.drawImage(img, 0, 0);
                    
                    // Get ImageData
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    resolve(imageData);
                    
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }





    interpretResults(prediction) {
        const aiProbability = prediction.aiGenerated;
        const confidence = prediction.confidence;
        const features = prediction.features || [];
        const detailedFeatures = prediction.detailedFeatures || {};
        
        // Convert to our confidence scale (0-100)
        const confidenceScore = Math.round(confidence * 100);
        
        // Determine status based on AI probability
        let status, details;
        
        if (aiProbability > 0.7) {
            status = 'Likely AI Generated';
            details = `High confidence of AI generation detected by advanced CNN. Features: ${features.slice(0, 3).join(', ')}`;
        } else if (aiProbability > 0.4) {
            status = 'Suspicious';
            details = `Multiple AI indicators detected. Features: ${features.slice(0, 3).join(', ')}`;
        } else {
            status = 'Likely Authentic';
            details = `Low probability of AI generation. Features: ${features.slice(0, 3).join(', ')}`;
        }

        return {
            confidence: confidenceScore,
            status,
            details: [details],
            aiProbability: aiProbability,
            features: features,
            detailedFeatures: detailedFeatures,
            method: prediction.method || 'Advanced CNN Analysis (Worker)'
        };
    }

    updateModelStatus(status) {
        const modelStatusElement = document.getElementById('modelStatus');
        if (modelStatusElement) {
            modelStatusElement.textContent = status;
            
            // Add appropriate styling
            if (status === 'Ready') {
                modelStatusElement.className = 'status-authentic';
            } else if (status === 'Loading...' || status === 'Analyzing...') {
                modelStatusElement.className = 'status-suspicious';
            } else if (status === 'Failed to load' || status === 'Analysis failed') {
                modelStatusElement.className = 'status-fake';
            } else {
                modelStatusElement.className = '';
            }
        }
    }

    // Method to get model information
    getModelInfo() {
        return {
            loaded: this.isWorkerReady,
            type: 'Web Worker CNN for AI Detection',
            inputShape: [224, 224, 3],
            architecture: 'Convolutional Neural Network with Background Processing',
            purpose: 'Detect AI-generated medical images with full accuracy'
        };
    }
}

// Export for use in other modules
window.TensorFlowAnalyzer = TensorFlowAnalyzer; 