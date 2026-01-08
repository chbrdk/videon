import Foundation
import Vision
import CoreVideo

class ObjectDetector {
    
    func detectObjects(in pixelBuffer: CVPixelBuffer) async throws -> [ObjectDetection] {
        return try await withCheckedThrowingContinuation { continuation in
            let request = VNClassifyImageRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let observations = request.results as? [VNClassificationObservation] else {
                    continuation.resume(returning: [])
                    return
                }
                
                let objects = observations
                    .filter { $0.confidence > 0.5 } // Filter low confidence results
                    .prefix(10) // Limit to top 10 results
                    .map { observation in
                        ObjectDetection(
                            label: observation.identifier,
                            confidence: observation.confidence,
                            boundingBox: [0, 0, 1, 1] // VNClassifyImageRequest doesn't provide bounding boxes
                        )
                    }
                
                continuation.resume(returning: Array(objects))
            }
            
            // request.imageCropAndScaleOption = .scaleFill // Not available in VNClassifyImageRequest
            
            let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, options: [:])
            
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
    
    func detectAnimals(in pixelBuffer: CVPixelBuffer) async throws -> [ObjectDetection] {
        return try await withCheckedThrowingContinuation { continuation in
            let request = VNRecognizeAnimalsRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let observations = request.results as? [VNRecognizedObjectObservation] else {
                    continuation.resume(returning: [])
                    return
                }
                
                let animals = observations
                    .filter { $0.confidence > 0.5 }
                    .map { observation in
                        ObjectDetection(
                            label: observation.labels.first?.identifier ?? "animal",
                            confidence: observation.confidence,
                            boundingBox: [
                                Float(observation.boundingBox.origin.x),
                                Float(observation.boundingBox.origin.y),
                                Float(observation.boundingBox.size.width),
                                Float(observation.boundingBox.size.height)
                            ]
                        )
                    }
                
                continuation.resume(returning: animals)
            }
            
            let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, options: [:])
            
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
    
    /// Detect human rectangles in the image (macOS 13+)
    @available(macOS 13.0, *)
    func detectHumanRectangles(in pixelBuffer: CVPixelBuffer) async throws -> [ObjectDetection] {
        return try await withCheckedThrowingContinuation { continuation in
            let request = VNDetectHumanRectanglesRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let observations = request.results as? [VNHumanObservation] else {
                    continuation.resume(returning: [])
                    return
                }
                
                let humans = observations
                    .filter { $0.confidence > 0.5 }
                    .map { observation in
                        ObjectDetection(
                            label: "person",
                            confidence: observation.confidence,
                            boundingBox: [
                                Float(observation.boundingBox.origin.x),
                                Float(observation.boundingBox.origin.y),
                                Float(observation.boundingBox.size.width),
                                Float(observation.boundingBox.size.height)
                            ]
                        )
                    }
                
                continuation.resume(returning: humans)
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

/// Human Body Pose Detection (macOS 14+)
@available(macOS 14.0, *)
class HumanPoseDetector {
    
    struct BodyPose {
        let keypoints: [String: [Float]] // e.g., "leftShoulder": [x, y, confidence]
        let confidence: Float
        let boundingBox: [Float] // [x, y, width, height]
    }
    
    func detectBodyPose(in pixelBuffer: CVPixelBuffer) async throws -> [BodyPose] {
        return try await withCheckedThrowingContinuation { continuation in
            let request = VNDetectHumanBodyPoseRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let observations = request.results as? [VNHumanBodyPoseObservation] else {
                    continuation.resume(returning: [])
                    return
                }
                
                var poses: [BodyPose] = []
                
                for observation in observations {
                    guard observation.confidence > 0.5 else { continue }
                    
                    var keypoints: [String: [Float]] = [:]
                    
                    // Extract available body landmarks
                    if let leftShoulder = try? observation.recognizedPoint(.leftShoulder) {
                        keypoints["leftShoulder"] = [Float(leftShoulder.location.x), Float(leftShoulder.location.y), Float(leftShoulder.confidence)]
                    }
                    if let rightShoulder = try? observation.recognizedPoint(.rightShoulder) {
                        keypoints["rightShoulder"] = [Float(rightShoulder.location.x), Float(rightShoulder.location.y), Float(rightShoulder.confidence)]
                    }
                    if let leftElbow = try? observation.recognizedPoint(.leftElbow) {
                        keypoints["leftElbow"] = [Float(leftElbow.location.x), Float(leftElbow.location.y), Float(leftElbow.confidence)]
                    }
                    if let rightElbow = try? observation.recognizedPoint(.rightElbow) {
                        keypoints["rightElbow"] = [Float(rightElbow.location.x), Float(rightElbow.location.y), Float(rightElbow.confidence)]
                    }
                    if let leftWrist = try? observation.recognizedPoint(.leftWrist) {
                        keypoints["leftWrist"] = [Float(leftWrist.location.x), Float(leftWrist.location.y), Float(leftWrist.confidence)]
                    }
                    if let rightWrist = try? observation.recognizedPoint(.rightWrist) {
                        keypoints["rightWrist"] = [Float(rightWrist.location.x), Float(rightWrist.location.y), Float(rightWrist.confidence)]
                    }
                    if let leftHip = try? observation.recognizedPoint(.leftHip) {
                        keypoints["leftHip"] = [Float(leftHip.location.x), Float(leftHip.location.y), Float(leftHip.confidence)]
                    }
                    if let rightHip = try? observation.recognizedPoint(.rightHip) {
                        keypoints["rightHip"] = [Float(rightHip.location.x), Float(rightHip.location.y), Float(rightHip.confidence)]
                    }
                    if let leftKnee = try? observation.recognizedPoint(.leftKnee) {
                        keypoints["leftKnee"] = [Float(leftKnee.location.x), Float(leftKnee.location.y), Float(leftKnee.confidence)]
                    }
                    if let rightKnee = try? observation.recognizedPoint(.rightKnee) {
                        keypoints["rightKnee"] = [Float(rightKnee.location.x), Float(rightKnee.location.y), Float(rightKnee.confidence)]
                    }
                    if let leftAnkle = try? observation.recognizedPoint(.leftAnkle) {
                        keypoints["leftAnkle"] = [Float(leftAnkle.location.x), Float(leftAnkle.location.y), Float(leftAnkle.confidence)]
                    }
                    if let rightAnkle = try? observation.recognizedPoint(.rightAnkle) {
                        keypoints["rightAnkle"] = [Float(rightAnkle.location.x), Float(rightAnkle.location.y), Float(rightAnkle.confidence)]
                    }
                    if let neck = try? observation.recognizedPoint(.neck) {
                        keypoints["neck"] = [Float(neck.location.x), Float(neck.location.y), Float(neck.confidence)]
                    }
                    if let root = try? observation.recognizedPoint(.root) {
                        keypoints["root"] = [Float(root.location.x), Float(root.location.y), Float(root.confidence)]
                    }
                    if let nose = try? observation.recognizedPoint(.nose) {
                        keypoints["nose"] = [Float(nose.location.x), Float(nose.location.y), Float(nose.confidence)]
                    }
                    
                    // Calculate bounding box from keypoints
                    var minX: Float = 1.0
                    var minY: Float = 1.0
                    var maxX: Float = 0.0
                    var maxY: Float = 0.0
                    
                    for (_, point) in keypoints {
                        if point.count >= 2 {
                            let x = point[0]
                            let y = point[1]
                            minX = min(minX, x)
                            minY = min(minY, y)
                            maxX = max(maxX, x)
                            maxY = max(maxY, y)
                        }
                    }
                    
                    // If no valid keypoints, use default bounding box
                    let boundingBox = (minX <= maxX && minY <= maxY) ? [minX, minY, maxX - minX, maxY - minY] : [0.0, 0.0, 1.0, 1.0]
                    
                    let pose = BodyPose(
                        keypoints: keypoints,
                        confidence: observation.confidence,
                        boundingBox: boundingBox
                    )
                    
                    poses.append(pose)
                }
                
                continuation.resume(returning: poses)
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
