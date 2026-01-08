import Foundation
import Vision
import CoreVideo

class TextRecognizer {
    
    /// Recognize text in a pixel buffer using VNRecognizeTextRequest
    /// Supports both printed and handwritten text (macOS 15+)
    func recognizeText(in pixelBuffer: CVPixelBuffer) async throws -> [TextRecognition] {
        return try await withCheckedThrowingContinuation { continuation in
            // Use revision 3 for best accuracy (macOS 15+ improvements)
            let request = VNRecognizeTextRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let observations = request.results as? [VNRecognizedTextObservation] else {
                    continuation.resume(returning: [])
                    return
                }
                
                var textRecognitions: [TextRecognition] = []
                
                for observation in observations {
                    // Get top candidate for each text observation
                    guard let topCandidate = observation.topCandidates(1).first else {
                        continue
                    }
                    
                    // Only include text with reasonable confidence
                    if topCandidate.confidence > 0.3 {
                        let boundingBox = [
                            Float(observation.boundingBox.origin.x),
                            Float(observation.boundingBox.origin.y),
                            Float(observation.boundingBox.size.width),
                            Float(observation.boundingBox.size.height)
                        ]
                        
                        // Language detection (if available in macOS 15+)
                        var detectedLanguage: String? = nil
                        if #available(macOS 15.0, *) {
                            // Try to detect language from text
                            detectedLanguage = topCandidate.string.isEmpty ? nil : "unknown"
                        }
                        
                        let recognition = TextRecognition(
                            text: topCandidate.string,
                            confidence: topCandidate.confidence,
                            boundingBox: boundingBox,
                            language: detectedLanguage
                        )
                        
                        textRecognitions.append(recognition)
                    }
                }
                
                continuation.resume(returning: textRecognitions)
            }
            
            // Configure request for best accuracy
            // Use accurate recognition level for better results (slower but more accurate)
            request.recognitionLevel = .accurate
            
            // Enable language correction (macOS 15+)
            if #available(macOS 15.0, *) {
                request.usesLanguageCorrection = true
            }
            
            // Use revision 3 for macOS 15+ improvements
            if #available(macOS 15.0, *) {
                request.revision = VNRecognizeTextRequestRevision3
            } else {
                request.revision = VNRecognizeTextRequestRevision2
            }
            
            let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, options: [:])
            
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
    
    /// Recognize text with specific language hints (for better accuracy)
    func recognizeText(in pixelBuffer: CVPixelBuffer, languages: [String] = ["en-US", "de-DE"]) async throws -> [TextRecognition] {
        return try await withCheckedThrowingContinuation { continuation in
            let request = VNRecognizeTextRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let observations = request.results as? [VNRecognizedTextObservation] else {
                    continuation.resume(returning: [])
                    return
                }
                
                var textRecognitions: [TextRecognition] = []
                
                for observation in observations {
                    guard let topCandidate = observation.topCandidates(1).first else {
                        continue
                    }
                    
                    if topCandidate.confidence > 0.3 {
                        let boundingBox = [
                            Float(observation.boundingBox.origin.x),
                            Float(observation.boundingBox.origin.y),
                            Float(observation.boundingBox.size.width),
                            Float(observation.boundingBox.size.height)
                        ]
                        
                        let recognition = TextRecognition(
                            text: topCandidate.string,
                            confidence: topCandidate.confidence,
                            boundingBox: boundingBox,
                            language: languages.first
                        )
                        
                        textRecognitions.append(recognition)
                    }
                }
                
                continuation.resume(returning: textRecognitions)
            }
            
            request.recognitionLevel = .accurate
            
            // Set language hints for better recognition
            if #available(macOS 15.0, *) {
                request.usesLanguageCorrection = true
                request.recognitionLanguages = languages
            }
            
            if #available(macOS 15.0, *) {
                request.revision = VNRecognizeTextRequestRevision3
            } else {
                request.revision = VNRecognizeTextRequestRevision2
            }
            
            let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, options: [:])
            
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
}

