import Foundation
import Vapor

struct ObjectDetection: Codable {
    let label: String
    let confidence: Float
    let boundingBox: [Float] // [x, y, width, height] normalized coordinates
}

struct FaceDetection: Codable {
    let confidence: Float
    let landmarks: [String: [Float]]? // facial landmarks if available
    let boundingBox: [Float] // [x, y, width, height] normalized coordinates
}

// MARK: - Core ML Results
struct SceneClassificationResult: Codable {
    let label: String
    let confidence: Float
    let category: String
}

struct CustomObjectResult: Codable {
    let label: String
    let confidence: Float
    let boundingBox: [Float] // [x, y, width, height] normalized
}

// MARK: - Core ML Enhanced Results
struct PersonAttributesResult: Codable {
    let ageRange: String? // e.g., "young", "middle-aged", "senior"
    let estimatedAge: Int? // Estimated age in years
    let gender: String? // "male", "female", "unknown"
    let ethnicity: String? // "asian", "caucasian", "african", "hispanic", "unknown"
    let confidence: Float
    let boundingBox: [Float] // [x, y, width, height] normalized coordinates
}

struct VehicleAttributesResult: Codable {
    let brand: String? // e.g., "Porsche", "BMW", "Mercedes"
    let model: String? // e.g., "911", "X5", "C-Class"
    let vehicleType: String? // "car", "truck", "motorcycle", "bus"
    let color: String? // Dominant color
    let confidence: Float
    let boundingBox: [Float] // [x, y, width, height] normalized coordinates
}

struct SceneDescription: Codable {
    let text: String
    let confidence: Float
    let processingTime: Double
    let model: String
    let version: String
}

struct TextRecognition: Codable {
    let text: String
    let confidence: Float
    let boundingBox: [Float] // [x, y, width, height] normalized coordinates
    let language: String? // Detected language if available
}

struct HumanBodyPose: Codable {
    let keypoints: [String: [Float]] // Body landmark positions [x, y, confidence]
    let confidence: Float
    let boundingBox: [Float] // [x, y, width, height] normalized coordinates
}

struct VisionAnalysisResult: Codable, Content {
    let objects: [ObjectDetection]
    let faces: [FaceDetection]
    let textRecognitions: [TextRecognition]? // OCR Results (macOS 15+)
    let humanRectangles: [ObjectDetection]? // Human body detection (macOS 13+)
    let humanBodyPoses: [HumanBodyPose]? // Body pose detection (macOS 14+)
    let sceneClassification: [SceneClassificationResult]?
    let customObjects: [CustomObjectResult]?
    let personAttributes: [PersonAttributesResult]? // Core ML enhanced person attributes
    let vehicleAttributes: [VehicleAttributesResult]? // Core ML enhanced vehicle detection
    let aiDescription: SceneDescription?
    let processingTime: Double
    let visionVersion: String
    let timestamp: Date
    let sceneStartTime: Double?
    let sceneEndTime: Double?
    
    init(objects: [ObjectDetection] = [], faces: [FaceDetection] = [], processingTime: Double = 0.0, sceneStartTime: Double? = nil, sceneEndTime: Double? = nil) {
        self.objects = objects
        self.faces = faces
        self.textRecognitions = nil
        self.humanRectangles = nil
        self.humanBodyPoses = nil
        self.sceneClassification = nil
        self.customObjects = nil
        self.personAttributes = nil
        self.vehicleAttributes = nil
        self.aiDescription = nil
        self.processingTime = processingTime
        self.visionVersion = "macOS \(ProcessInfo.processInfo.operatingSystemVersion.majorVersion).\(ProcessInfo.processInfo.operatingSystemVersion.minorVersion)"
        self.timestamp = Date()
        self.sceneStartTime = sceneStartTime
        self.sceneEndTime = sceneEndTime
    }
    
    init(objects: [ObjectDetection], faces: [FaceDetection], textRecognitions: [TextRecognition]? = nil, humanRectangles: [ObjectDetection]? = nil, humanBodyPoses: [HumanBodyPose]? = nil, sceneClassification: [SceneClassificationResult]? = nil, customObjects: [CustomObjectResult]? = nil, personAttributes: [PersonAttributesResult]? = nil, vehicleAttributes: [VehicleAttributesResult]? = nil, aiDescription: SceneDescription? = nil, processingTime: Double, sceneStartTime: Double? = nil, sceneEndTime: Double? = nil) {
        self.objects = objects
        self.faces = faces
        self.textRecognitions = textRecognitions
        self.humanRectangles = humanRectangles
        self.humanBodyPoses = humanBodyPoses
        self.sceneClassification = sceneClassification
        self.customObjects = customObjects
        self.personAttributes = personAttributes
        self.vehicleAttributes = vehicleAttributes
        self.aiDescription = aiDescription
        self.processingTime = processingTime
        self.visionVersion = "macOS \(ProcessInfo.processInfo.operatingSystemVersion.majorVersion).\(ProcessInfo.processInfo.operatingSystemVersion.minorVersion)"
        self.timestamp = Date()
        self.sceneStartTime = sceneStartTime
        self.sceneEndTime = sceneEndTime
    }
}

struct VisionAnalysisRequest: Codable, Content {
    let sceneId: String
    let keyframePath: String
}

struct HealthResponse: Codable, Content {
    let status: String
    let timestamp: Date
    let visionVersion: String
    
    init() {
        self.status = "healthy"
        self.timestamp = Date()
        self.visionVersion = "macOS \(ProcessInfo.processInfo.operatingSystemVersion.majorVersion).\(ProcessInfo.processInfo.operatingSystemVersion.minorVersion)"
    }
}

// MARK: - Core ML API Responses
struct SizeInfo: Codable {
    let width: Float
    let height: Float
}

struct ModelInfo: Codable, Content {
    let name: String
    let description: String
    let inputSize: SizeInfo
    let outputLabels: [String]
    let loaded: Bool
}

struct ModelsResponse: Codable, Content {
    let models: [ModelInfo]
}
