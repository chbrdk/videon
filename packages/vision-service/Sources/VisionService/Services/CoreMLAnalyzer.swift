import Foundation
import CoreML
import Vision
import CoreVideo

// MARK: - Core ML Models
struct CoreMLModel {
    let name: String
    let path: String
    let description: String
    let inputSize: CGSize
    let outputLabels: [String]
}

// MARK: - Core ML Analyzer
class CoreMLAnalyzer {
    
    // MARK: - Properties
    private var sceneClassificationModel: MLModel?
    private var customObjectModel: MLModel?
    private var personAttributesModel: MLModel?
    private var vehicleDetectionModel: MLModel?
    private let modelsDirectory: URL
    
    // MARK: - Available Models
    private let availableModels: [CoreMLModel] = [
        CoreMLModel(
            name: "SceneClassifier",
            path: "SceneClassifier.mlmodel",
            description: "Custom scene classification model",
            inputSize: CGSize(width: 224, height: 224),
            outputLabels: ["indoor", "outdoor", "nature", "urban", "water", "sky"]
        ),
        CoreMLModel(
            name: "CustomObjectDetector",
            path: "CustomObjectDetector.mlmodel",
            description: "Custom object detection for specific use cases",
            inputSize: CGSize(width: 416, height: 416),
            outputLabels: ["person", "vehicle", "animal", "building", "sign"]
        ),
        CoreMLModel(
            name: "PersonAttributes",
            path: "PersonAttributes.mlmodel",
            description: "Person attributes detection (age, gender, ethnicity)",
            inputSize: CGSize(width: 224, height: 224),
            outputLabels: ["age", "gender", "ethnicity"]
        ),
        CoreMLModel(
            name: "VehicleDetector",
            path: "VehicleDetector.mlmodel",
            description: "Vehicle brand and model detection",
            inputSize: CGSize(width: 416, height: 416),
            outputLabels: ["brand", "model", "vehicleType", "color"]
        )
    ]
    
    // MARK: - Initialization
    init() {
        // Get models directory from environment or default
        if let modelsPath = ProcessInfo.processInfo.environment["CORE_ML_MODELS_PATH"] {
            self.modelsDirectory = URL(fileURLWithPath: modelsPath)
        } else {
            // Try multiple locations:
            // 1. Bundle directory (for compiled app)
            // 2. Relative to executable (for development)
            // 3. Relative to current working directory
            
            var possibleDirectories: [URL] = []
            
            // Bundle location
            possibleDirectories.append(Bundle.main.bundleURL.appendingPathComponent("Models"))
            
            // Development: relative to executable
            if let execPath = Bundle.main.executablePath {
                let execURL = URL(fileURLWithPath: execPath)
                possibleDirectories.append(execURL.deletingLastPathComponent().appendingPathComponent("Models"))
                // Also try parent directory (for Swift Package structure)
                possibleDirectories.append(execURL.deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("Models"))
            }
            
            // Development: relative to package root
            let currentDir = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
            possibleDirectories.append(currentDir.appendingPathComponent("packages/vision-service/Models"))
            possibleDirectories.append(currentDir.appendingPathComponent("Models"))
            
            // Find first existing directory
            var foundDirectory: URL? = nil
            for directory in possibleDirectories {
                if FileManager.default.fileExists(atPath: directory.path) {
                    foundDirectory = directory
                    break
                }
            }
            
            // Use first directory if found, otherwise use bundle location as fallback
            self.modelsDirectory = foundDirectory ?? possibleDirectories.first!
        }
        
        loadModels()
    }
    
    // MARK: - Model Loading
    private func loadModels() {
        for modelInfo in availableModels {
            let modelURL = modelsDirectory.appendingPathComponent(modelInfo.path)
            
            // Check if model file exists before trying to load
            guard FileManager.default.fileExists(atPath: modelURL.path) else {
                print("ℹ️ Model \(modelInfo.name) not found at \(modelURL.path) - skipping (optional)")
                continue
            }
            
            do {
                // Try to compile model first if it's a .mlmodel file
                let compiledURL: URL
                if modelURL.pathExtension == "mlmodel" {
                    do {
                        compiledURL = try MLModel.compileModel(at: modelURL)
                    } catch {
                        // If compilation fails, try loading directly
                        compiledURL = modelURL
                    }
                } else {
                    compiledURL = modelURL
                }
                
                let model = try MLModel(contentsOf: compiledURL)
                
                switch modelInfo.name {
                case "SceneClassifier":
                    sceneClassificationModel = model
                    print("✅ Loaded Scene Classifier model")
                case "CustomObjectDetector":
                    customObjectModel = model
                    print("✅ Loaded Custom Object Detector model")
                case "PersonAttributes":
                    personAttributesModel = model
                    print("✅ Loaded Person Attributes model")
                case "VehicleDetector":
                    vehicleDetectionModel = model
                    print("✅ Loaded Vehicle Detector model")
                default:
                    print("⚠️ Unknown model: \(modelInfo.name)")
                }
            } catch {
                print("❌ Failed to load model \(modelInfo.name): \(error)")
            }
        }
    }
    
    // MARK: - Scene Classification
    func classifyScene(in pixelBuffer: CVPixelBuffer) async throws -> [SceneClassificationResult] {
        guard let model = sceneClassificationModel else {
            // Return empty array if model not loaded (graceful degradation)
            return []
        }
        
        return try await withCheckedThrowingContinuation { continuation in
            let request = VNCoreMLRequest(model: try! VNCoreMLModel(for: model)) { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let observations = request.results as? [VNClassificationObservation] else {
                    continuation.resume(throwing: VisionError.imageLoadingFailed)
                    return
                }
                
                let results = observations
                    .filter { $0.confidence > 0.1 }
                    .map { observation in
                        SceneClassificationResult(
                            label: observation.identifier,
                            confidence: observation.confidence,
                            category: self.categorizeScene(observation.identifier)
                        )
                    }
                    .sorted { $0.confidence > $1.confidence }
                
                continuation.resume(returning: results)
            }
            
            // Configure request
            request.imageCropAndScaleOption = .scaleFill
            
            let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, options: [:])
            
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
    
    // MARK: - Custom Object Detection
    func detectCustomObjects(in pixelBuffer: CVPixelBuffer) async throws -> [CustomObjectResult] {
        guard let model = customObjectModel else {
            // Return empty array if model not loaded (graceful degradation)
            return []
        }
        
        return try await withCheckedThrowingContinuation { continuation in
            let request = VNCoreMLRequest(model: try! VNCoreMLModel(for: model)) { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let observations = request.results as? [VNRecognizedObjectObservation] else {
                    continuation.resume(throwing: VisionError.imageLoadingFailed)
                    return
                }
                
                let results = observations
                    .filter { $0.confidence > 0.3 }
                    .compactMap { observation -> CustomObjectResult? in
                        guard let topLabelObservation = observation.labels.first else {
                            return nil
                        }
                        
                        return CustomObjectResult(
                            label: topLabelObservation.identifier,
                            confidence: topLabelObservation.confidence,
                            boundingBox: [
                                Float(observation.boundingBox.origin.x),
                                Float(observation.boundingBox.origin.y),
                                Float(observation.boundingBox.size.width),
                                Float(observation.boundingBox.size.height)
                            ]
                        )
                    }
                    .sorted { $0.confidence > $1.confidence }
                
                continuation.resume(returning: results)
            }
            
            // Configure request
            request.imageCropAndScaleOption = .scaleFill
            
            let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, options: [:])
            
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
    
    // MARK: - Person Attributes Detection
    func detectPersonAttributes(in pixelBuffer: CVPixelBuffer, faceBoundingBox: [Float]? = nil) async throws -> [PersonAttributesResult] {
        guard let model = personAttributesModel else {
            // Return empty array if model not loaded (graceful degradation)
            return []
        }
        
        return try await withCheckedThrowingContinuation { continuation in
            let request = VNCoreMLRequest(model: try! VNCoreMLModel(for: model)) { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                // Try to get classification results (for age, gender, ethnicity)
                guard let observations = request.results as? [VNClassificationObservation] else {
                    continuation.resume(returning: [])
                    return
                }
                
                // Parse classification results into person attributes
                var attributes: [String: (value: String, confidence: Float)] = [:]
                
                for observation in observations {
                    let label = observation.identifier.lowercased()
                    let confidence = observation.confidence
                    
                    // Parse age
                    if label.contains("age") || label.contains("young") || label.contains("old") || label.contains("senior") {
                        let ageRange = self.parseAgeRange(from: label)
                        if attributes["ageRange"] == nil || attributes["ageRange"]!.confidence < confidence {
                            attributes["ageRange"] = (ageRange, confidence)
                        }
                    }
                    
                    // Parse gender
                    if label.contains("male") || label.contains("female") || label.contains("gender") {
                        let gender = label.contains("female") ? "female" : (label.contains("male") ? "male" : "unknown")
                        if attributes["gender"] == nil || attributes["gender"]!.confidence < confidence {
                            attributes["gender"] = (gender, confidence)
                        }
                    }
                    
                    // Parse ethnicity
                    let ethnicityLabels = ["asian", "caucasian", "african", "hispanic", "latino", "european", "indian", "middle eastern"]
                    for ethnicityLabel in ethnicityLabels {
                        if label.contains(ethnicityLabel) {
                            let ethnicity = self.normalizeEthnicity(ethnicityLabel)
                            if attributes["ethnicity"] == nil || attributes["ethnicity"]!.confidence < confidence {
                                attributes["ethnicity"] = (ethnicity, confidence)
                            }
                            break
                        }
                    }
                }
                
                // Create result
                if !attributes.isEmpty {
                    let ageRange = attributes["ageRange"]?.value
                    let estimatedAge = self.estimateAge(from: ageRange)
                    let gender = attributes["gender"]?.value
                    let ethnicity = attributes["ethnicity"]?.value
                    let avgConfidence = attributes.values.map { $0.confidence }.reduce(0, +) / Float(attributes.count)
                    
                    let result = PersonAttributesResult(
                        ageRange: ageRange,
                        estimatedAge: estimatedAge,
                        gender: gender,
                        ethnicity: ethnicity,
                        confidence: avgConfidence,
                        boundingBox: faceBoundingBox ?? [0.0, 0.0, 1.0, 1.0]
                    )
                    
                    continuation.resume(returning: [result])
                } else {
                    continuation.resume(returning: [])
                }
            }
            
            request.imageCropAndScaleOption = .scaleFill
            
            let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, options: [:])
            
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
    
    // MARK: - Vehicle Detection
    func detectVehicleAttributes(in pixelBuffer: CVPixelBuffer) async throws -> [VehicleAttributesResult] {
        guard let model = vehicleDetectionModel else {
            // Return empty array if model not loaded (graceful degradation)
            return []
        }
        
        return try await withCheckedThrowingContinuation { continuation in
            let request = VNCoreMLRequest(model: try! VNCoreMLModel(for: model)) { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                // Try object detection first (for YOLO models)
                if let objectObservations = request.results as? [VNRecognizedObjectObservation] {
                    let vehicleKeywords = ["car", "truck", "bus", "motorcycle", "vehicle", "automobile"]
                    
                    let vehicleResults = objectObservations
                        .filter { observation in
                            guard let topLabel = observation.labels.first else { return false }
                            return observation.confidence > 0.3 && vehicleKeywords.contains { keyword in
                                topLabel.identifier.lowercased().contains(keyword)
                            }
                        }
                        .compactMap { observation -> VehicleAttributesResult? in
                            guard let topLabel = observation.labels.first else { return nil }
                            
                            let label = topLabel.identifier.lowercased()
                            let confidence = topLabel.confidence
                            
                            // Parse vehicle attributes from label
                            var brand: String? = nil
                            let vehicleModel: String? = nil  // Future: parse from label if model supports it
                            var vehicleType: String? = nil
                            
                            // Known vehicle brands
                            let vehicleBrands = ["porsche", "bmw", "mercedes", "audi", "volkswagen", "ford", "toyota", "honda", "tesla", "ferrari", "lamborghini"]
                            for brandName in vehicleBrands {
                                if label.contains(brandName) {
                                    brand = brandName.capitalized
                                    break
                                }
                            }
                            
                            // Vehicle types
                            let vehicleTypes = ["car", "truck", "suv", "motorcycle", "bus", "van", "automobile"]
                            for type in vehicleTypes {
                                if label.contains(type) {
                                    vehicleType = type.capitalized
                                    break
                                }
                            }
                            
                            let boundingBox = [
                                Float(observation.boundingBox.origin.x),
                                Float(observation.boundingBox.origin.y),
                                Float(observation.boundingBox.size.width),
                                Float(observation.boundingBox.size.height)
                            ]
                            
                            return VehicleAttributesResult(
                                brand: brand,
                                model: vehicleModel,
                                vehicleType: vehicleType,
                                color: nil, // Color detection would require additional processing
                                confidence: confidence,
                                boundingBox: boundingBox
                            )
                        }
                        .sorted { $0.confidence > $1.confidence }
                    
                    continuation.resume(returning: vehicleResults)
                    return
                }
                
                // Fallback: Try classification results (for classification models)
                if let classificationObservations = request.results as? [VNClassificationObservation] {
                    let vehicleKeywords = ["car", "truck", "bus", "motorcycle", "vehicle", "automobile"]
                    
                    let vehicleResults = classificationObservations
                        .filter { observation in
                            observation.confidence > 0.3 && vehicleKeywords.contains { keyword in
                                observation.identifier.lowercased().contains(keyword)
                            }
                        }
                        .map { observation -> VehicleAttributesResult in
                            let label = observation.identifier.lowercased()
                            
                            // Parse vehicle attributes
                            var brand: String? = nil
                            let vehicleModel: String? = nil  // Future: parse from label if model supports it
                            var vehicleType: String? = nil
                            
                            let vehicleBrands = ["porsche", "bmw", "mercedes", "audi", "volkswagen", "ford", "toyota", "honda", "tesla", "ferrari", "lamborghini"]
                            for brandName in vehicleBrands {
                                if label.contains(brandName) {
                                    brand = brandName.capitalized
                                    break
                                }
                            }
                            
                            let vehicleTypes = ["car", "truck", "suv", "motorcycle", "bus", "van"]
                            for type in vehicleTypes {
                                if label.contains(type) {
                                    vehicleType = type.capitalized
                                    break
                                }
                            }
                            
                            return VehicleAttributesResult(
                                brand: brand,
                                model: vehicleModel,
                                vehicleType: vehicleType,
                                color: nil,
                                confidence: observation.confidence,
                                boundingBox: [0.0, 0.0, 1.0, 1.0]
                            )
                        }
                        .sorted { $0.confidence > $1.confidence }
                    
                    continuation.resume(returning: vehicleResults)
                    return
                }
                
                // No vehicle detections
                continuation.resume(returning: [])
            }
            
            request.imageCropAndScaleOption = .scaleFill
            
            let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, options: [:])
            
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
    
    // MARK: - Helper Methods
    private func parseAgeRange(from label: String) -> String {
        if label.contains("young") || label.contains("teen") || label.contains("child") {
            return "young"
        } else if label.contains("middle") || label.contains("adult") {
            return "middle-aged"
        } else if label.contains("senior") || label.contains("old") || label.contains("elderly") {
            return "senior"
        }
        return "adult"
    }
    
    private func estimateAge(from ageRange: String?) -> Int? {
        guard let range = ageRange else { return nil }
        switch range.lowercased() {
        case "young", "teen", "child":
            return 20
        case "middle-aged", "adult":
            return 45
        case "senior", "old", "elderly":
            return 70
        default:
            return nil
        }
    }
    
    private func normalizeEthnicity(_ label: String) -> String {
        switch label.lowercased() {
        case "asian", "east asian", "southeast asian":
            return "asian"
        case "caucasian", "white", "european":
            return "caucasian"
        case "african", "black", "afro":
            return "african"
        case "hispanic", "latino", "latin":
            return "hispanic"
        case "indian", "south asian":
            return "indian"
        case "middle eastern", "arab":
            return "middle eastern"
        default:
            return "unknown"
        }
    }
    
    private func categorizeScene(_ label: String) -> String {
        switch label.lowercased() {
        case "indoor", "room", "office", "home":
            return "indoor"
        case "outdoor", "street", "city":
            return "outdoor"
        case "nature", "forest", "mountain", "beach":
            return "nature"
        case "urban", "building", "architecture":
            return "urban"
        case "water", "ocean", "lake", "river":
            return "water"
        case "sky", "cloud", "sunset":
            return "sky"
        default:
            return "unknown"
        }
    }
    
    // MARK: - Model Management
    func getAvailableModels() -> [CoreMLModel] {
        return availableModels
    }
    
    func isModelLoaded(_ modelName: String) -> Bool {
        switch modelName {
        case "SceneClassifier":
            return sceneClassificationModel != nil
        case "CustomObjectDetector":
            return customObjectModel != nil
        case "PersonAttributes":
            return personAttributesModel != nil
        case "VehicleDetector":
            return vehicleDetectionModel != nil
        default:
            return false
        }
    }
    
    func getModelInfo(_ modelName: String) -> CoreMLModel? {
        return availableModels.first { $0.name == modelName }
    }
}