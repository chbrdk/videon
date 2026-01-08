import Foundation
import Vision
import CoreVideo

class FaceDetector {
    
    func detectFaces(in pixelBuffer: CVPixelBuffer) async throws -> [FaceDetection] {
        return try await withCheckedThrowingContinuation { continuation in
            let request = VNDetectFaceRectanglesRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let observations = request.results as? [VNFaceObservation] else {
                    continuation.resume(returning: [])
                    return
                }
                
                let faces = observations
                    .filter { $0.confidence > 0.5 }
                    .map { observation in
                        FaceDetection(
                            confidence: observation.confidence,
                            landmarks: nil, // Basic face detection doesn't include landmarks
                            boundingBox: [
                                Float(observation.boundingBox.origin.x),
                                Float(observation.boundingBox.origin.y),
                                Float(observation.boundingBox.size.width),
                                Float(observation.boundingBox.size.height)
                            ]
                        )
                    }
                
                continuation.resume(returning: faces)
            }
            
            let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, options: [:])
            
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
    
    func detectFaceLandmarks(in pixelBuffer: CVPixelBuffer) async throws -> [FaceDetection] {
        return try await withCheckedThrowingContinuation { continuation in
            let request = VNDetectFaceLandmarksRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let observations = request.results as? [VNFaceObservation] else {
                    continuation.resume(returning: [])
                    return
                }
                
                let faces = observations
                    .filter { $0.confidence > 0.5 }
                    .map { observation in
                        var landmarks: [String: [Float]] = [:]
                        
                        // Extract facial landmarks if available
                        if let faceContour = observation.landmarks?.faceContour {
                            landmarks["faceContour"] = faceContour.normalizedPoints.flatMap { [Float($0.x), Float($0.y)] }
                        }
                        if let leftEye = observation.landmarks?.leftEye {
                            landmarks["leftEye"] = leftEye.normalizedPoints.flatMap { [Float($0.x), Float($0.y)] }
                        }
                        if let rightEye = observation.landmarks?.rightEye {
                            landmarks["rightEye"] = rightEye.normalizedPoints.flatMap { [Float($0.x), Float($0.y)] }
                        }
                        if let nose = observation.landmarks?.nose {
                            landmarks["nose"] = nose.normalizedPoints.flatMap { [Float($0.x), Float($0.y)] }
                        }
                        if let outerLips = observation.landmarks?.outerLips {
                            landmarks["outerLips"] = outerLips.normalizedPoints.flatMap { [Float($0.x), Float($0.y)] }
                        }
                        
                        return FaceDetection(
                            confidence: observation.confidence,
                            landmarks: landmarks.isEmpty ? nil : landmarks,
                            boundingBox: [
                                Float(observation.boundingBox.origin.x),
                                Float(observation.boundingBox.origin.y),
                                Float(observation.boundingBox.size.width),
                                Float(observation.boundingBox.size.height)
                            ]
                        )
                    }
                
                continuation.resume(returning: faces)
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
