// Result Display Component
class ResultDisplay {
    constructor() {
        this.currentResults = null;
        this.init();
    }

    init() {
        // Initialize result display
        console.log('Result Display initialized');
    }

    showResults(results, analysisTime) {
        this.currentResults = results;
        
        // Show results section
        this.showResultsSection();
        
        // Animate confidence meter
        this.animateConfidenceMeter(results.confidence);
        
        // Update status and details
        this.updateStatus(results.status, results.confidence);
        this.updateAnalysisTime(analysisTime);
        
        // Show detailed breakdown if available
        if (results.details && results.details.length > 0) {
            this.showDetailedBreakdown(results);
        }
    }

    showResultsSection() {
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.style.display = 'block';
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    animateConfidenceMeter(confidence) {
        const confidenceBar = document.getElementById('confidenceBar');
        const confidenceValue = document.getElementById('confidenceValue');
        
        if (!confidenceBar || !confidenceValue) return;

        // Reset to 0
        confidenceBar.style.width = '0%';
        confidenceValue.textContent = '0%';

        // Animate to target value
        let currentValue = 0;
        const targetValue = confidence;
        const duration = 1500; // 1.5 seconds
        const steps = 60;
        const increment = targetValue / steps;
        const stepDuration = duration / steps;

        const animation = setInterval(() => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                currentValue = targetValue;
                clearInterval(animation);
            }

            const roundedValue = Math.round(currentValue);
            confidenceBar.style.width = `${roundedValue}%`;
            confidenceValue.textContent = `${roundedValue}%`;
        }, stepDuration);
    }

    updateStatus(status, confidence) {
        const statusValue = document.getElementById('statusValue');
        if (!statusValue) return;

        // Clear any loading state
        statusValue.innerHTML = status;
        
        // Add appropriate CSS class
        statusValue.className = this.getStatusClass(confidence);
        
        // Add icon based on status
        const icon = this.getStatusIcon(confidence);
        statusValue.innerHTML = `${icon} ${status}`;
    }

    getStatusClass(confidence) {
        if (confidence >= 70) return 'status-authentic';
        if (confidence >= 40) return 'status-suspicious';
        return 'status-fake';
    }

    getStatusIcon(confidence) {
        if (confidence >= 70) return '<i class="fas fa-check-circle"></i>';
        if (confidence >= 40) return '<i class="fas fa-exclamation-triangle"></i>';
        return '<i class="fas fa-times-circle"></i>';
    }

    updateAnalysisTime(analysisTime) {
        const analysisTimeElement = document.getElementById('analysisTime');
        if (analysisTimeElement) {
            analysisTimeElement.textContent = `${(analysisTime / 1000).toFixed(1)}s`;
        }
    }

    showDetailedBreakdown(results) {
        // Create detailed breakdown section if it doesn't exist
        let breakdownSection = document.getElementById('detailedBreakdown');
        
        if (!breakdownSection) {
            breakdownSection = document.createElement('div');
            breakdownSection.id = 'detailedBreakdown';
            breakdownSection.className = 'detailed-breakdown';
            breakdownSection.innerHTML = `
                <h4>Detailed Analysis</h4>
                <div class="breakdown-content"></div>
                <div class="advisory-content"></div>
            `;
            
            const resultCard = document.querySelector('.result-card');
            if (resultCard) {
                resultCard.appendChild(breakdownSection);
            }
        }

        // Populate breakdown content
        const breakdownContent = breakdownSection.querySelector('.breakdown-content');
        if (breakdownContent) {
            breakdownContent.innerHTML = this.generateBreakdownHTML(results);
        }

        // Populate advisory if enabled and present
        const advisoryContainer = breakdownSection.querySelector('.advisory-content');
        if (advisoryContainer) {
            advisoryContainer.innerHTML = this.generateAdvisoryHTML(results);
        }
    }

    generateAdvisoryHTML(results) {
        if (!window.AppConfig?.ADVISORY?.ENABLE_GPT_ADVISORY) return '';
        const backend = results.backend || (results.traditional && results.traditional.backend) || null;
        if (!backend || backend.advisoryStatus !== 'ok') return '';
        const advisoryLines = (backend.details || []).filter(d => typeof d === 'string' && d.startsWith('Advisory: '));
        if (!advisoryLines.length) return '';
        const advisoryText = advisoryLines[0].replace('Advisory: ', '').trim();
        const bullets = advisoryText.split('\n').map(s => s.trim()).filter(Boolean);
        const ts = results.timestamp || new Date().toISOString();
        return `
            <div class="advisory-panel">
                <div class="advisory-header">
                    <h4><i class="fas fa-user-md"></i> Expert advisory (AI-generated)</h4>
                    <button class="btn btn-secondary btn-small" onclick="(function(btn){ const p=btn.closest('.advisory-panel'); const b=p.querySelector('.advisory-body'); b.style.display=b.style.display==='none'?'block':'none';})(this)">Toggle</button>
                </div>
                <div class="advisory-body" style="display: none;">
                    <div class="advisory-disclaimer"><i class="fas fa-info-circle"></i> This advisory is AI-generated, for guidance only. Not a medical diagnosis.</div>
                    <ul class="advisory-list">
                        ${bullets.map(b => `<li>${b}</li>`).join('')}
                    </ul>
                    <div class="advisory-meta">Source: GPT advisory via backend • ${ts}</div>
                </div>
            </div>
        `;
    }

    generateBreakdownHTML(results) {
        let html = '<div class="breakdown-grid">';
        
        // Add image type classification (if available)
        if (results.imageType) {
            html += `
                <div class="breakdown-item">
                    <div class="breakdown-label"><i class="fas fa-image"></i> Image Type</div>
                    <div class="breakdown-value confidence-high">
                        ${results.imageType}
                    </div>
                    <div class="breakdown-details">
                        Classification confidence: ${Math.round(results.imageTypeConfidence * 100)}%
                    </div>
                </div>
            `;
        }
        
        // Add overall confidence
        html += `
            <div class="breakdown-item">
                <div class="breakdown-label"><i class="fas fa-star"></i> Overall Confidence</div>
                <div class="breakdown-value ${this.getConfidenceClass(results.confidence)}">
                    ${results.confidence}%
                </div>
            </div>
        `;

        // Add traditional analysis results if available
        if (results.traditional) {
            const imageType = results.traditional.imageType || 'Medical Image';
            html += `
                <div class="breakdown-item">
                    <div class="breakdown-label"><i class="fas fa-microscope"></i> Traditional Analysis (${imageType})</div>
                    <div class="breakdown-value ${this.getConfidenceClass(results.traditional.confidence)}">
                        ${results.traditional.confidence}%
                    </div>
                    <div class="breakdown-details">
                        ${results.traditional.method}
                    </div>
                </div>
            `;
        }

        // Add TensorFlow analysis results if available
        if (results.tensorflow) {
            html += `
                <div class="breakdown-item">
                    <div class="breakdown-label"><i class="fas fa-brain"></i> AI Analysis (TensorFlow)</div>
                    <div class="breakdown-value ${this.getConfidenceClass(results.tensorflow.confidence)}">
                        ${results.tensorflow.confidence}%
                    </div>
                    <div class="breakdown-details">
                        ${results.tensorflow.method} - AI Probability: ${(results.tensorflow.aiProbability * 100).toFixed(1)}%
                    </div>
                </div>
            `;
        }

        // Add Enhanced AI analysis results if available
        if (results.enhancedAI) {
            html += `
                <div class="breakdown-item">
                    <div class="breakdown-label"><i class="fas fa-robot"></i> Enhanced AI Analysis</div>
                    <div class="breakdown-value ${this.getConfidenceClass(results.enhancedAI.confidence)}">
                        ${results.enhancedAI.confidence}%
                    </div>
                    <div class="breakdown-details">
                        ${results.enhancedAI.method} - AI Probability: ${(results.enhancedAI.aiProbability * 100).toFixed(1)}%
                    </div>
                </div>
            `;
        }

        // Add MRI-specific analysis if available
        if (results.traditional && results.traditional.mriDetection) {
            const mriDetection = results.traditional.mriDetection;
            html += `
                <div class="breakdown-item">
                    <div class="breakdown-label"><i class="fas fa-magnet"></i> MRI Detection</div>
                    <div class="breakdown-value ${mriDetection.isMRI ? 'confidence-high' : 'confidence-medium'}">
                        ${mriDetection.isMRI ? 'MRI Detected' : 'Not MRI'}
                    </div>
                    <div class="breakdown-details">
                        Confidence: ${mriDetection.confidence}% - ${mriDetection.details.slice(0, 2).join(', ')}
                    </div>
                </div>
            `;
        }

        if (results.traditional && results.traditional.mriAnalysis) {
            const mriAnalysis = results.traditional.mriAnalysis;
            html += `
                <div class="breakdown-item">
                    <div class="breakdown-label"><i class="fas fa-layer-group"></i> MRI-Specific Analysis</div>
                    <div class="breakdown-value ${this.getConfidenceClass(mriAnalysis.confidence)}">
                        ${mriAnalysis.confidence}%
                    </div>
                    <div class="breakdown-details">
                        ${mriAnalysis.details.slice(0, 3).join(', ')}
                    </div>
                </div>
            `;
        }

        // Add CT-specific analysis if available
        if (results.traditional && results.traditional.ctDetection) {
            const ctDetection = results.traditional.ctDetection;
            html += `
                <div class="breakdown-item">
                    <div class="breakdown-label"><i class="fas fa-cube"></i> CT Detection</div>
                    <div class="breakdown-value ${ctDetection.isCT ? 'confidence-high' : 'confidence-medium'}">
                        ${ctDetection.isCT ? 'CT Detected' : 'Not CT'}
                    </div>
                    <div class="breakdown-details">
                        Confidence: ${ctDetection.confidence}% - ${ctDetection.details.slice(0, 2).join(', ')}
                    </div>
                </div>
            `;
        }

        if (results.traditional && results.traditional.ctAnalysis) {
            const ctAnalysis = results.traditional.ctAnalysis;
            html += `
                <div class="breakdown-item">
                    <div class="breakdown-label"><i class="fas fa-cubes"></i> CT-Specific Analysis</div>
                    <div class="breakdown-value ${this.getConfidenceClass(ctAnalysis.confidence)}">
                        ${ctAnalysis.confidence}%
                    </div>
                    <div class="breakdown-details">
                        ${ctAnalysis.details.slice(0, 3).join(', ')}
                    </div>
                </div>
            `;
        }

        html += '</div>';
        
        // Add preprocessing info if available
        if (results.preprocessing) {
            html += this.generatePreprocessingHTML(results.preprocessing);
        }

        // Add detailed Enhanced AI breakdown if available
        if (results.enhancedAI && results.enhancedAI.methods) {
            html += this.generateEnhancedAIDetailedBreakdown(results.enhancedAI.methods);
        }

        // Add recommendations
        html += this.generateRecommendations(results);

        return html;
    }

    generateEnhancedAIDetailedBreakdown(methods) {
        let html = '<div class="enhanced-ai-breakdown">';
        html += '<h4><i class="fas fa-robot"></i> Enhanced AI Detection Methods</h4>';
        html += '<div class="enhanced-ai-grid">';
        
        const methodNames = {
            frequencyAnalysis: 'Frequency Analysis',
            noiseInconsistency: 'Noise Inconsistency',
            compressionArtifacts: 'Compression Artifacts',
            statisticalAnomalies: 'Statistical Anomalies',
            edgeAnalysis: 'Edge Pattern Analysis',
            textureAnalysis: 'Texture Analysis',
            colorSpaceAnalysis: 'Color Space Analysis',
            metadataAnalysis: 'Metadata Analysis',
            perceptualHashing: 'Perceptual Hashing',
            deepLearningFeatures: 'Deep Learning Features'
        };
        
        const methodIcons = {
            frequencyAnalysis: 'fas fa-wave-square',
            noiseInconsistency: 'fas fa-random',
            compressionArtifacts: 'fas fa-compress',
            statisticalAnomalies: 'fas fa-chart-bar',
            edgeAnalysis: 'fas fa-cut',
            textureAnalysis: 'fas fa-th',
            colorSpaceAnalysis: 'fas fa-palette',
            metadataAnalysis: 'fas fa-info-circle',
            perceptualHashing: 'fas fa-fingerprint',
            deepLearningFeatures: 'fas fa-network-wired'
        };
        
        Object.entries(methods).forEach(([methodKey, methodResult]) => {
            if (methodResult && methodResult.confidence > 0) {
                html += `
                    <div class="enhanced-ai-item">
                        <div class="enhanced-ai-label">
                            <i class="${methodIcons[methodKey] || 'fas fa-cog'}"></i>
                            ${methodNames[methodKey] || methodKey}
                        </div>
                        <div class="enhanced-ai-value ${this.getConfidenceClass(methodResult.confidence)}">
                            ${methodResult.confidence}%
                        </div>
                        <div class="enhanced-ai-probability">
                            AI Probability: ${(methodResult.aiProbability * 100).toFixed(1)}%
                        </div>
                        ${methodResult.details && methodResult.details.length > 0 ? 
                            `<div class="enhanced-ai-details">
                                ${methodResult.details.slice(0, 2).join(', ')}
                            </div>` : ''
                        }
                    </div>
                `;
            }
        });
        
        html += '</div></div>';
        return html;
    }

    getConfidenceClass(confidence) {
        if (confidence >= 70) return 'confidence-high';
        if (confidence >= 40) return 'confidence-medium';
        return 'confidence-low';
    }

    generatePreprocessingHTML(preprocessing) {
        let html = '<div class="preprocessing-info">';
        html += '<h5><i class="fas fa-cogs"></i> Image Preprocessing</h5>';
        html += '<div class="preprocessing-details">';
        html += `<div class="preprocessing-item"><strong>Original Size:</strong> ${preprocessing.originalSize}</div>`;
        html += `<div class="preprocessing-item"><strong>Processed Size:</strong> ${preprocessing.processedSize}</div>`;
        html += `<div class="preprocessing-item"><strong>Size Reduction:</strong> ${preprocessing.sizeReduction}</div>`;
        html += `<div class="preprocessing-item"><strong>Target Size:</strong> ${preprocessing.targetSize}</div>`;
        html += '</div>';
        html += '<div class="preprocessing-steps">';
        html += '<h6>Applied Steps (Before Classification):</h6>';
        html += '<ul>';
        html += '<li>✓ Converted to grayscale</li>';
        html += '<li>✓ Detected and cropped patient info/overlays</li>';
        html += '<li>✓ Normalized pixel values</li>';
        html += '<li>✓ Resized to standard dimensions</li>';
        html += '</ul>';
        html += '<p class="preprocessing-note"><i class="fas fa-info-circle"></i> <strong>Note:</strong> Preprocessing was applied before image classification to improve accuracy.</p>';
        html += '</div>';
        html += '</div>';
        return html;
    }

    generateRecommendations(results) {
        let recommendations = '<div class="recommendations">';
        recommendations += '<h5>Recommendations</h5><ul>';

        if (results.confidence >= 70) {
            recommendations += '<li>✅ Image appears to be authentic</li>';
            recommendations += '<li>✅ No immediate concerns detected</li>';
        } else if (results.confidence >= 40) {
            recommendations += '<li>⚠️ Manual review recommended</li>';
            recommendations += '<li>⚠️ Consider additional verification methods</li>';
        } else {
            recommendations += '<li>❌ High probability of AI generation or manipulation</li>';
            recommendations += '<li>❌ Professional verification strongly recommended</li>';
        }

        recommendations += '</ul></div>';
        return recommendations;
    }

    hideResults() {
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
    }

    clearResults() {
        this.currentResults = null;
        
        // Reset confidence meter
        const confidenceBar = document.getElementById('confidenceBar');
        const confidenceValue = document.getElementById('confidenceValue');
        
        if (confidenceBar) confidenceBar.style.width = '0%';
        if (confidenceValue) confidenceValue.textContent = '0%';

        // Clear status
        const statusValue = document.getElementById('statusValue');
        if (statusValue) {
            statusValue.textContent = 'Analyzing...';
            statusValue.className = '';
        }

        // Clear analysis time
        const analysisTimeElement = document.getElementById('analysisTime');
        if (analysisTimeElement) {
            analysisTimeElement.textContent = '-';
        }

        // Remove detailed breakdown
        const breakdownSection = document.getElementById('detailedBreakdown');
        if (breakdownSection) {
            breakdownSection.remove();
        }
    }

    showLoadingState() {
        const statusValue = document.getElementById('statusValue');
        if (statusValue) {
            statusValue.innerHTML = '<span class="loading"></span> Analyzing...';
        }
        
        this.showResultsSection();
    }
}

// Export for use in other modules
window.ResultDisplay = ResultDisplay; 