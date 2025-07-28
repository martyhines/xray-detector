// DICOM Parser Utility for Medical Image Analysis
class DICOMParser {
    constructor() {
        this.supportedModalities = ['CR', 'CT', 'MR', 'XA', 'DX', 'MG', 'US', 'NM', 'PT'];
    }

    async parseDICOMFile(file) {
        try {
            // Read file as ArrayBuffer
            const arrayBuffer = await this.readFileAsArrayBuffer(file);
            
            // Parse DICOM data
            const dataSet = dicomParser.parseDICOM(arrayBuffer);
            
            // Extract metadata
            const metadata = this.extractMetadata(dataSet);
            
            // Convert to canvas for analysis
            const canvas = await this.convertToCanvas(dataSet);
            
            return {
                success: true,
                metadata,
                canvas,
                dataSet
            };
        } catch (error) {
            console.error('DICOM parsing error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    extractMetadata(dataSet) {
        const metadata = {
            patientInfo: {},
            studyInfo: {},
            seriesInfo: {},
            imageInfo: {},
            deviceInfo: {},
            technicalInfo: {}
        };

        try {
            // Patient Information
            metadata.patientInfo = {
                patientName: this.getTagValue(dataSet, 'x00100010'),
                patientID: this.getTagValue(dataSet, 'x00100020'),
                patientBirthDate: this.getTagValue(dataSet, 'x00100030'),
                patientSex: this.getTagValue(dataSet, 'x00100040')
            };

            // Study Information
            metadata.studyInfo = {
                studyDate: this.getTagValue(dataSet, 'x00080020'),
                studyTime: this.getTagValue(dataSet, 'x00080030'),
                studyDescription: this.getTagValue(dataSet, 'x00081030'),
                studyID: this.getTagValue(dataSet, 'x00200010'),
                accessionNumber: this.getTagValue(dataSet, 'x00080050')
            };

            // Series Information
            metadata.seriesInfo = {
                seriesDate: this.getTagValue(dataSet, 'x00080021'),
                seriesTime: this.getTagValue(dataSet, 'x00080031'),
                seriesDescription: this.getTagValue(dataSet, 'x0008103e'),
                seriesNumber: this.getTagValue(dataSet, 'x00200011'),
                modality: this.getTagValue(dataSet, 'x00080060')
            };

            // Image Information
            metadata.imageInfo = {
                imageDate: this.getTagValue(dataSet, 'x00080022'),
                imageTime: this.getTagValue(dataSet, 'x00080032'),
                imageNumber: this.getTagValue(dataSet, 'x00200013'),
                samplesPerPixel: this.getTagValue(dataSet, 'x00280002'),
                photometricInterpretation: this.getTagValue(dataSet, 'x00280004'),
                rows: this.getTagValue(dataSet, 'x00280010'),
                columns: this.getTagValue(dataSet, 'x00280011'),
                bitsAllocated: this.getTagValue(dataSet, 'x00280100'),
                bitsStored: this.getTagValue(dataSet, 'x00280101'),
                highBit: this.getTagValue(dataSet, 'x00280102'),
                pixelRepresentation: this.getTagValue(dataSet, 'x00280103'),
                windowCenter: this.getTagValue(dataSet, 'x00281050'),
                windowWidth: this.getTagValue(dataSet, 'x00281051'),
                rescaleIntercept: this.getTagValue(dataSet, 'x00281052'),
                rescaleSlope: this.getTagValue(dataSet, 'x00281053')
            };

            // Device Information
            metadata.deviceInfo = {
                manufacturer: this.getTagValue(dataSet, 'x00080070'),
                manufacturerModelName: this.getTagValue(dataSet, 'x00081090'),
                deviceSerialNumber: this.getTagValue(dataSet, 'x00181000'),
                softwareVersions: this.getTagValue(dataSet, 'x00181020')
            };

            // Technical Information
            metadata.technicalInfo = {
                kvp: this.getTagValue(dataSet, 'x00180060'),
                exposureTime: this.getTagValue(dataSet, 'x00180050'),
                exposure: this.getTagValue(dataSet, 'x00181152'),
                exposureInuAs: this.getTagValue(dataSet, 'x00181153'),
                filterType: this.getTagValue(dataSet, 'x00187000'),
                convolutionKernel: this.getTagValue(dataSet, 'x00181210'),
                sliceThickness: this.getTagValue(dataSet, 'x00180050'),
                spacingBetweenSlices: this.getTagValue(dataSet, 'x00180088')
            };

        } catch (error) {
            console.warn('Error extracting DICOM metadata:', error);
        }

        return metadata;
    }

    getTagValue(dataSet, tag) {
        try {
            const element = dataSet.elements[tag];
            if (element && element.length > 0) {
                return dataSet.string(tag);
            }
        } catch (error) {
            // Tag not found or not readable
        }
        return null;
    }

    async convertToCanvas(dataSet) {
        try {
            // Get pixel data
            const pixelData = this.getPixelData(dataSet);
            if (!pixelData) {
                throw new Error('Unable to extract pixel data from DICOM');
            }

            // Get image dimensions
            const rows = dataSet.uint16('x00280010');
            const columns = dataSet.uint16('x00280011');
            const samplesPerPixel = dataSet.uint16('x00280002') || 1;
            const bitsAllocated = dataSet.uint16('x00280100');
            const bitsStored = dataSet.uint16('x00280101');
            const highBit = dataSet.uint16('x00280102');
            const pixelRepresentation = dataSet.uint16('x00280103');
            const photometricInterpretation = dataSet.string('x00280004');

            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.width = columns;
            canvas.height = rows;
            const ctx = canvas.getContext('2d');
            const imageData = ctx.createImageData(columns, rows);

            // Convert pixel data to image data
            this.convertPixelDataToImageData(
                pixelData, 
                imageData.data, 
                rows, 
                columns, 
                samplesPerPixel, 
                bitsAllocated, 
                bitsStored, 
                highBit, 
                pixelRepresentation, 
                photometricInterpretation
            );

            // Apply window/level if available
            this.applyWindowLevel(imageData, dataSet);

            // Put image data on canvas
            ctx.putImageData(imageData, 0, 0);

            return canvas;
        } catch (error) {
            console.error('Error converting DICOM to canvas:', error);
            throw error;
        }
    }

    getPixelData(dataSet) {
        try {
            // Try to get pixel data from various possible tags
            const pixelDataElement = dataSet.elements['x7fe00010'];
            if (pixelDataElement) {
                return new Uint8Array(dataSet.byteArray, pixelDataElement.dataOffset, pixelDataElement.length);
            }
        } catch (error) {
            console.warn('Error getting pixel data:', error);
        }
        return null;
    }

    convertPixelDataToImageData(pixelData, imageData, rows, columns, samplesPerPixel, bitsAllocated, bitsStored, highBit, pixelRepresentation, photometricInterpretation) {
        const isSigned = pixelRepresentation === 1;
        const maxValue = Math.pow(2, bitsStored) - 1;
        const minValue = isSigned ? -Math.pow(2, bitsStored - 1) : 0;

        for (let i = 0; i < pixelData.length; i++) {
            let pixelValue;
            
            if (bitsAllocated === 16) {
                pixelValue = isSigned ? 
                    new Int16Array(pixelData.buffer, pixelData.byteOffset + i * 2, 1)[0] :
                    new Uint16Array(pixelData.buffer, pixelData.byteOffset + i * 2, 1)[0];
            } else {
                pixelValue = pixelData[i];
            }

            // Normalize to 0-255
            const normalizedValue = Math.max(0, Math.min(255, 
                ((pixelValue - minValue) / (maxValue - minValue)) * 255
            ));

            const pixelIndex = i * 4;
            imageData[pixelIndex] = normalizedValue;     // Red
            imageData[pixelIndex + 1] = normalizedValue; // Green
            imageData[pixelIndex + 2] = normalizedValue; // Blue
            imageData[pixelIndex + 3] = 255;             // Alpha
        }
    }

    applyWindowLevel(imageData, dataSet) {
        try {
            const windowCenter = dataSet.float('x00281050');
            const windowWidth = dataSet.float('x00281051');
            
            if (windowCenter && windowWidth) {
                const min = windowCenter - windowWidth / 2;
                const max = windowCenter + windowWidth / 2;
                const range = max - min;

                for (let i = 0; i < imageData.data.length; i += 4) {
                    const value = imageData.data[i];
                    const normalized = Math.max(0, Math.min(255, 
                        ((value - min) / range) * 255
                    ));
                    imageData.data[i] = normalized;
                    imageData.data[i + 1] = normalized;
                    imageData.data[i + 2] = normalized;
                }
            }
        } catch (error) {
            console.warn('Error applying window/level:', error);
        }
    }

    isDICOMFile(file) {
        // Check file extension
        if (file.name.toLowerCase().endsWith('.dcm')) {
            return true;
        }

        // Check magic bytes (DICOM files start with 'DICM')
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const arrayBuffer = e.target.result;
                const uint8Array = new Uint8Array(arrayBuffer);
                
                // Check for DICOM magic bytes
                if (uint8Array.length >= 132) {
                    const dicomSignature = String.fromCharCode(...uint8Array.slice(128, 132));
                    resolve(dicomSignature === 'DICM');
                } else {
                    resolve(false);
                }
            };
            reader.readAsArrayBuffer(file.slice(0, 140)); // Read just the header
        });
    }

    validateDICOMMetadata(metadata) {
        const issues = [];
        
        // Check for required fields
        if (!metadata.seriesInfo.modality) {
            issues.push('Missing modality information');
        }
        
        if (!metadata.imageInfo.rows || !metadata.imageInfo.columns) {
            issues.push('Missing image dimensions');
        }
        
        // Check for suspicious patterns
        if (metadata.deviceInfo.manufacturer && 
            metadata.deviceInfo.manufacturer.toLowerCase().includes('ai')) {
            issues.push('Suspicious manufacturer name');
        }
        
        if (metadata.studyInfo.studyDate && 
            new Date(metadata.studyInfo.studyDate) > new Date()) {
            issues.push('Future study date detected');
        }
        
        return {
            isValid: issues.length === 0,
            issues
        };
    }
}

// Export for global use
window.DICOMParser = DICOMParser; 