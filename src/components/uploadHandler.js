// Upload Handler Component
class UploadHandler {
    constructor() {
        this.supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/tiff', 'application/dicom', 'application/octet-stream'];
        this.supportedExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.dcm'];
        this.maxFileSize = 100 * 1024 * 1024; // 100MB for DICOM files
        this.dicomParser = null;
        this.init();
    }

    init() {
        this.setupDragAndDrop();
        this.setupFileInput();
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');
        
        if (!uploadArea) return;

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => this.preventDefaults(e), false);
            document.body.addEventListener(eventName, (e) => this.preventDefaults(e), false);
        });

        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => this.highlight(e), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => this.unhighlight(e), false);
        });

        // Handle dropped files
        uploadArea.addEventListener('drop', (e) => this.handleDrop(e), false);
    }

    setupFileInput() {
        const fileInput = document.getElementById('fileInput');
        if (!fileInput) return;

        fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                this.handleFiles(files);
            }
        });
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    highlight(e) {
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.classList.add('dragover');
        }
    }

    unhighlight(e) {
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.classList.remove('dragover');
        }
    }

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        this.handleFiles(files);
    }

    async handleFiles(files) {
        if (files.length === 0) return;

        const file = files[0]; // Only handle the first file
        
        // Validate file
        const validation = await this.validateFile(file);
        if (!validation.valid) {
            this.showError(validation.message);
            return;
        }

        // Process the file
        await this.processFile(file, validation.isDICOM);
    }

    async validateFile(file) {
        // Check if file exists
        if (!file) {
            return { valid: false, message: 'No file selected.' };
        }

        // Check file extension
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        const isDICOM = fileExtension === '.dcm' || file.name.toLowerCase().endsWith('.dcm');
        
        // For DICOM files, we'll do additional validation
        if (isDICOM) {
            // Check file size
            if (file.size > this.maxFileSize) {
                return { 
                    valid: false, 
                    message: `DICOM file too large. Maximum size is ${this.formatFileSize(this.maxFileSize)}.` 
                };
            }
            
            // Validate DICOM format
            try {
                if (!this.dicomParser) {
                    // Check if DICOMParser class is available
                    if (typeof window.DICOMParser === 'undefined') {
                        return { 
                            valid: false, 
                            message: 'DICOM parser not available. Please refresh the page and try again.' 
                        };
                    }
                    this.dicomParser = new DICOMParser();
                }
                const isDICOMFile = await this.dicomParser.isDICOMFile(file);
                if (!isDICOMFile) {
                    return { valid: false, message: 'Invalid DICOM file format.' };
                }
            } catch (error) {
                console.error('DICOM validation error:', error);
                return { 
                    valid: false, 
                    message: 'Error validating DICOM file. The DICOM parser library may not be loaded properly.' 
                };
            }
            
            return { valid: true, isDICOM: true };
        }

        // For regular images
        if (!this.supportedTypes.includes(file.type) && !this.supportedExtensions.includes(fileExtension)) {
            return { 
                valid: false, 
                message: `Unsupported file type. Please upload: ${this.supportedExtensions.join(', ')} or DICOM (.dcm) files.` 
            };
        }

        // Check file size for regular images
        if (file.size > this.maxFileSize) {
            return { 
                valid: false, 
                message: `File too large. Maximum size is ${this.formatFileSize(this.maxFileSize)}.` 
            };
        }

        // Check if file is actually an image
        if (!file.type.startsWith('image/') && !isDICOM) {
            return { valid: false, message: 'Selected file is not a supported image or DICOM format.' };
        }

        return { valid: true, isDICOM: false };
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async processFile(file, isDICOM = false) {
        try {
            // Show loading state
            this.showLoadingState();

            let processedFile = file;
            let dicomMetadata = null;

            // If it's a DICOM file, parse it and convert to canvas
            if (isDICOM) {
                try {
                    if (!this.dicomParser) {
                        // Check if DICOMParser class is available
                        if (typeof window.DICOMParser === 'undefined') {
                            throw new Error('DICOM parser library not loaded. Please refresh the page and try again.');
                        }
                        this.dicomParser = new DICOMParser();
                    }
                    
                    const dicomResult = await this.dicomParser.parseDICOMFile(file);
                    if (!dicomResult.success) {
                        throw new Error(dicomResult.error || 'Failed to parse DICOM file');
                    }
                    
                    // Convert canvas to blob for processing
                    const canvas = dicomResult.canvas;
                    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                    
                    // Create a new file object from the blob
                    processedFile = new File([blob], file.name.replace('.dcm', '.png'), {
                        type: 'image/png',
                        lastModified: Date.now()
                    });
                    
                    // Store DICOM metadata
                    dicomMetadata = dicomResult.metadata;
                    
                } catch (dicomError) {
                    console.error('DICOM processing error:', dicomError);
                    this.showError(`Error processing DICOM file: ${dicomError.message}. Please try again or use a different image format.`);
                    this.hideLoadingState();
                    return;
                }
            }

            // Store file reference and metadata
            this.currentFile = processedFile;
            this.dicomMetadata = dicomMetadata;

            // Notify main app about file selection
            if (this.onFileSelected) {
                this.onFileSelected(processedFile, dicomMetadata);
            }

            // Hide loading state
            this.hideLoadingState();

        } catch (error) {
            console.error('Error processing file:', error);
            this.showError('Error processing file. Please try again.');
            this.hideLoadingState();
        }
    }

    showLoadingState() {
        const uploadContent = document.querySelector('.upload-content');
        if (uploadContent) {
            uploadContent.innerHTML = `
                <div class="loading"></div>
                <h3>Processing Image...</h3>
                <p>Please wait while we prepare your image for analysis</p>
            `;
        }
    }

    hideLoadingState() {
        const uploadContent = document.querySelector('.upload-content');
        if (uploadContent) {
            uploadContent.innerHTML = `
                <i class="fas fa-cloud-upload-alt"></i>
                <h3>Upload X-Ray Image</h3>
                <p>Drag and drop your X-ray image here, or click to browse</p>
                <input type="file" id="fileInput" accept="image/*" hidden>
                <button class="btn btn-primary" onclick="document.getElementById('fileInput').click()">
                    Choose File
                </button>
            `;
            
            // Re-setup the file input event listener
            this.setupFileInput();
        }
    }



    resetUpload() {
        this.currentFile = null;
        
        // Clear file input
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.value = '';
        }
        
        // Notify main app to reset
        if (this.onReset) {
            this.onReset();
        }
    }

    showError(message) {
        // Create a temporary error notification
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f56565;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
        
        // Add CSS animations if not already present
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    getCurrentFile() {
        return this.currentFile;
    }
}

// Export for use in other modules
window.UploadHandler = UploadHandler; 