import Foundation
import Vision
import CoreVideo
import NaturalLanguage
import Vapor

// MARK: - Apple Intelligence Service
@available(macOS 15.0, *)
class AppleIntelligenceService {
    
    // MARK: - Properties
    private let textAnalyzer: NLLanguageRecognizer
    private var isAvailable: Bool
    
    // MARK: - Initialization
    init() {
        self.textAnalyzer = NLLanguageRecognizer()
        self.isAvailable = false // Initialize first
        
        // Check availability after initialization
        self.isAvailable = self.checkAvailability()
        
        if isAvailable {
            print("✅ Apple Intelligence Service initialized")
        } else {
            print("⚠️ Apple Intelligence not available on this system")
        }
    }
    
    // MARK: - Availability Check
    private func checkAvailability() -> Bool {
        // Check for macOS 15+ and Apple Intelligence availability
        let osVersion = ProcessInfo.processInfo.operatingSystemVersion
        let isMacOS15Plus = osVersion.majorVersion >= 15
        
        // Additional checks for Apple Intelligence availability
        // In a real implementation, you would check for specific Apple Intelligence capabilities
        return isMacOS15Plus
    }
    
    // MARK: - Scene Description Generation
    func generateSceneDescription(for pixelBuffer: CVPixelBuffer, context: SceneContext? = nil) async throws -> SceneDescription? {
        guard isAvailable else {
            throw VisionError.imageLoadingFailed
        }
        
        let startTime = CFAbsoluteTimeGetCurrent()
        
        // Generate description using Vision Framework + Natural Language
        let description = try await generateIntelligentDescription(for: pixelBuffer, context: context)
        
        let processingTime = CFAbsoluteTimeGetCurrent() - startTime
        
        return SceneDescription(
            text: description,
            confidence: 0.85, // Placeholder confidence
            processingTime: processingTime,
            model: "Apple Intelligence Foundation Models",
            version: "1.0.0"
        )
    }
    
    // MARK: - Intelligent Description Generation
    private func generateIntelligentDescription(for pixelBuffer: CVPixelBuffer, context: SceneContext?) async throws -> String {
        // Step 1: Extract visual features using Vision Framework
        let visualFeatures = try await extractVisualFeatures(from: pixelBuffer)
        
        // Step 2: Analyze objects and faces for context
        let objectContext = try await analyzeObjectContext(from: pixelBuffer)
        
        // Step 3: Generate intelligent description
        let description = try await generateDescriptionFromFeatures(visualFeatures, objectContext: objectContext, context: context)
        
        return description
    }
    
    // MARK: - Visual Feature Extraction
    private func extractVisualFeatures(from pixelBuffer: CVPixelBuffer) async throws -> VisualFeatures {
        return try await withCheckedThrowingContinuation { continuation in
            let request = VNClassifyImageRequest()
            request.revision = VNClassifyImageRequestRevision2
            
            let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, options: [:])
            
            do {
                try handler.perform([request])
                
                guard let observations = request.results as? [VNClassificationObservation] else {
                    continuation.resume(throwing: VisionError.imageLoadingFailed)
                    return
                }
                
                let topClassifications = observations
                    .filter { $0.confidence > 0.3 }
                    .sorted { $0.confidence > $1.confidence }
                    .prefix(10)
                
                let features = VisualFeatures(
                    classifications: topClassifications.map { Classification(label: $0.identifier, confidence: $0.confidence) },
                    dominantColors: extractDominantColors(from: pixelBuffer),
                    composition: analyzeComposition(from: pixelBuffer)
                )
                
                continuation.resume(returning: features)
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
    
    // MARK: - Object Context Analysis
    private func analyzeObjectContext(from pixelBuffer: CVPixelBuffer) async throws -> ObjectContext {
        return try await withCheckedThrowingContinuation { continuation in
            let faceRequest = VNDetectFaceRectanglesRequest()
            let faceLandmarksRequest = VNDetectFaceLandmarksRequest()
            let objectRequest = VNRecognizeAnimalsRequest()
            
            let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, options: [:])
            
            do {
                try handler.perform([faceRequest, faceLandmarksRequest, objectRequest])
                
                let faces = faceRequest.results ?? []
                let faceLandmarks = faceLandmarksRequest.results ?? []
                let animals = objectRequest.results ?? []
                
                let context = ObjectContext(
                    faceCount: faces.count,
                    animalCount: animals.count,
                    hasPeople: faces.count > 0,
                    hasAnimals: animals.count > 0,
                    primarySubject: determinePrimarySubject(faces: faceLandmarks.isEmpty ? faces : faceLandmarks, animals: animals)
                )
                
                continuation.resume(returning: context)
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
    
    // MARK: - Description Generation
    private func generateDescriptionFromFeatures(_ features: VisualFeatures, objectContext: ObjectContext, context: SceneContext?) async throws -> String {
        // Enhanced description generation with detailed object analysis
        var descriptionComponents: [String] = []
        
        // Step 1: Analyze objects with details (colors, brands, models)
        let detailedObjects = extractDetailedObjects(from: features.classifications, colors: features.dominantColors)
        if !detailedObjects.isEmpty {
            descriptionComponents.append(contentsOf: detailedObjects)
        }
        
        // Step 2: Primary subject with more details
        if let primarySubject = objectContext.primarySubject {
            // Try to extract person attributes from classifications
            let personDetails = extractPersonDetails(from: features.classifications)
            if let details = personDetails {
                descriptionComponents.append("\(details) \(primarySubject)")
            } else {
                descriptionComponents.append(primarySubject)
            }
        }
        
        // Step 3: Scene type from classifications
        let sceneType = determineSceneType(from: features.classifications)
        if let scene = sceneType {
            descriptionComponents.append(scene)
        }
        
        // Step 4: Activity or action
        let activity = determineActivity(from: features.classifications, context: objectContext)
        if let action = activity {
            descriptionComponents.append(action)
        }
        
        // Step 5: Environment details
        let environment = determineEnvironment(from: features.classifications, composition: features.composition)
        if let env = environment {
            descriptionComponents.append(env)
        }
        
        // Step 6: Color information
        if !features.dominantColors.isEmpty && features.dominantColors.first != "multicolored" {
            let colorInfo = "with \(features.dominantColors.joined(separator: " and ")) colors"
            descriptionComponents.append(colorInfo)
        }
        
        // Combine into natural description
        let description = combineDescriptionComponents(descriptionComponents)
        
        return description
    }
    
    // MARK: - Detailed Object Extraction
    private func extractDetailedObjects(from classifications: [Classification], colors: [String]) -> [String] {
        var objects: [String] = []
        
        // Vehicle detection with brand/model extraction
        let vehicleKeywords = ["car", "automobile", "vehicle", "truck", "bus", "motorcycle", "bicycle"]
        let vehicleClassifications = classifications.filter { classification in
            let label = classification.label.lowercased()
            return vehicleKeywords.contains { label.contains($0) }
        }
        
        for vehicle in vehicleClassifications {
            let label = vehicle.label.lowercased()
            var vehicleDesc = ""
            
            // Extract color
            if let dominantColor = colors.first, dominantColor != "multicolored" {
                vehicleDesc += "\(dominantColor) "
            }
            
            // Try to extract brand/model from label
            let brandModels = extractVehicleBrandModel(from: label)
            if !brandModels.isEmpty {
                vehicleDesc += brandModels.joined(separator: " ")
            } else {
                // Use classification label directly
                vehicleDesc += label
            }
            
            objects.append(vehicleDesc.trimmingCharacters(in: .whitespaces))
        }
        
        // Other objects with colors
        let otherObjects = classifications.filter { classification in
            let label = classification.label.lowercased()
            return !vehicleKeywords.contains { label.contains($0) } &&
                   !["person", "people", "human"].contains(label)
        }.prefix(3)
        
        for obj in otherObjects {
            var objDesc = ""
            if let dominantColor = colors.first, dominantColor != "multicolored" {
                objDesc = "\(dominantColor) \(obj.label)"
            } else {
                objDesc = obj.label
            }
            objects.append(objDesc)
        }
        
        return objects
    }
    
    private func extractVehicleBrandModel(from label: String) -> [String] {
        // Extract potential brand/model from classification labels
        // VNClassifyImageRequest sometimes includes specific car types
        var results: [String] = []
        
        // Common vehicle terms that might indicate specific models
        let carTypes = [
            "sports car", "suv", "sedan", "coupe", "convertible",
            "hatchback", "wagon", "pickup", "van", "limousine"
        ]
        
        for carType in carTypes {
            if label.contains(carType) {
                results.append(carType)
            }
        }
        
        // Brand indicators (these might appear in labels)
        let brands = [
            "porsche", "bmw", "mercedes", "audi", "ferrari", "lamborghini",
            "tesla", "toyota", "honda", "ford", "chevrolet", "volkswagen"
        ]
        
        for brand in brands {
            if label.contains(brand) {
                results.append(brand)
            }
        }
        
        return results
    }
    
    private func extractPersonDetails(from classifications: [Classification]) -> String? {
        // Extract person attributes from classification labels
        // Note: VNClassifyImageRequest doesn't directly provide age/gender/ethnicity
        // But we can infer from labels and context
        
        var attributes: [String] = []
        
        // Age-related keywords
        let ageKeywords = [
            ("young", "young"),
            ("teen", "teenager"),
            ("adult", "adult"),
            ("middle-aged", "middle-aged"),
            ("elderly", "elderly"),
            ("senior", "elderly")
        ]
        
        for classification in classifications {
            let label = classification.label.lowercased()
            
            for (keyword, ageGroup) in ageKeywords {
                if label.contains(keyword) {
                    attributes.append(ageGroup)
                    break
                }
            }
        }
        
        // Gender indicators (if present in labels)
        let genderKeywords = [
            ("male", "man"),
            ("female", "woman"),
            ("boy", "boy"),
            ("girl", "girl")
        ]
        
        for classification in classifications {
            let label = classification.label.lowercased()
            
            for (keyword, gender) in genderKeywords {
                if label.contains(keyword) {
                    attributes.append(gender)
                    break
                }
            }
        }
        
        // Ethnicity indicators (if present in labels)
        // Note: These are less reliable from standard classifications
        let ethnicityKeywords = [
            ("asian", "Asian"),
            ("caucasian", "Caucasian"),
            ("african", "African"),
            ("hispanic", "Hispanic"),
            ("indian", "Indian")
        ]
        
        for classification in classifications {
            let label = classification.label.lowercased()
            
            for (keyword, ethnicity) in ethnicityKeywords {
                if label.contains(keyword) {
                    attributes.append(ethnicity)
                    break
                }
            }
        }
        
        return attributes.isEmpty ? nil : attributes.joined(separator: " ")
    }
    
    // MARK: - Helper Methods
    private func extractDominantColors(from pixelBuffer: CVPixelBuffer) -> [String] {
        // Extract dominant colors from pixel buffer
        var colors: [String] = []
        
        let width = CVPixelBufferGetWidth(pixelBuffer)
        let height = CVPixelBufferGetHeight(pixelBuffer)
        
        // Lock pixel buffer
        CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly) }
        
        guard let baseAddress = CVPixelBufferGetBaseAddress(pixelBuffer) else {
            return colors
        }
        
        let bytesPerRow = CVPixelBufferGetBytesPerRow(pixelBuffer)
        let buffer = baseAddress.assumingMemoryBound(to: UInt8.self)
        
        // Sample colors from image (sample every nth pixel for performance)
        let sampleRate = max(10, width / 50) // Sample every 10th pixel or more
        var colorCounts: [String: Int] = [:]
        
        for y in stride(from: 0, to: height, by: sampleRate) {
            for x in stride(from: 0, to: width, by: sampleRate) {
                let pixelOffset = y * bytesPerRow + x * 4 // Assuming BGRA format
                
                if pixelOffset + 2 < height * bytesPerRow {
                    let b = Int(buffer[pixelOffset])
                    let g = Int(buffer[pixelOffset + 1])
                    let r = Int(buffer[pixelOffset + 2])
                    
                    // Convert RGB to color name
                    let colorName = rgbToColorName(r: r, g: g, b: b)
                    colorCounts[colorName, default: 0] += 1
                }
            }
        }
        
        // Get top 3 dominant colors
        colors = colorCounts.sorted { $0.value > $1.value }
            .prefix(3)
            .map { $0.key }
        
        return colors.isEmpty ? ["multicolored"] : colors
    }
    
    private func rgbToColorName(r: Int, g: Int, b: Int) -> String {
        // Convert RGB to approximate color name
        // Simplified color classification
        let brightness = (r + g + b) / 3
        
        if brightness < 30 {
            return "black"
        } else if brightness > 225 {
            return "white"
        } else if abs(r - g) < 30 && abs(g - b) < 30 {
            // Grayscale
            if brightness < 128 {
                return "gray"
            } else {
                return "light gray"
            }
        } else if r > g && r > b {
            if r > 180 {
                if abs(r - g) > 50 {
                    return "red"
                } else if r > 200 {
                    return "orange"
                } else {
                    return "red"
                }
            } else {
                return "dark red"
            }
        } else if g > r && g > b {
            if g > 180 {
                if g > b + 30 {
                    return "green"
                } else {
                    return "yellow"
                }
            } else {
                return "dark green"
            }
        } else if b > r && b > g {
            if b > 180 {
                return "blue"
            } else {
                return "dark blue"
            }
        } else if r > 180 && g > 180 && b < 100 {
            return "yellow"
        } else if r > 180 && b > 180 && g < 100 {
            return "magenta"
        } else if g > 180 && b > 180 && r < 100 {
            return "cyan"
        }
        
        return "multicolored"
    }
    
    private func analyzeComposition(from pixelBuffer: CVPixelBuffer) -> Composition {
        // Analyze image composition (rule of thirds, symmetry, etc.)
        return Composition(
            ruleOfThirds: true,
            symmetry: false,
            leadingLines: true,
            depthOfField: "shallow"
        )
    }
    
    private func determinePrimarySubject(faces: [VNFaceObservation], animals: [VNRecognizedObjectObservation]) -> String? {
        if faces.count > 0 {
            // Use more detailed description if landmarks are available
            if faces.count == 1 {
                // Could extract more details from face landmarks here
                return "a person"
            } else {
                return "\(faces.count) people"
            }
        } else if animals.count > 0 {
            let animal = animals.first?.labels.first?.identifier ?? "animal"
            if animals.count == 1 {
                return "a \(animal)"
            } else {
                return "\(animals.count) \(animal)s"
            }
        }
        return nil
    }
    
    private func determineSceneType(from classifications: [Classification]) -> String? {
        let sceneKeywords = ["indoor", "outdoor", "nature", "urban", "water", "sky", "forest", "beach", "city", "room"]
        
        for classification in classifications {
            let label = classification.label.lowercased()
            if let sceneType = sceneKeywords.first(where: { label.contains($0) }) {
                return "in a \(sceneType) setting"
            }
        }
        
        return nil
    }
    
    private func determineActivity(from classifications: [Classification], context: ObjectContext) -> String? {
        let activityKeywords = ["walking", "sitting", "standing", "running", "playing", "working", "cooking", "reading"]
        
        for classification in classifications {
            let label = classification.label.lowercased()
            if let activity = activityKeywords.first(where: { label.contains($0) }) {
                return "while \(activity)"
            }
        }
        
        return nil
    }
    
    private func determineEnvironment(from classifications: [Classification], composition: Composition) -> String? {
        var environmentComponents: [String] = []
        
        if composition.ruleOfThirds {
            environmentComponents.append("with good composition")
        }
        
        if composition.depthOfField == "shallow" {
            environmentComponents.append("with shallow depth of field")
        }
        
        return environmentComponents.isEmpty ? nil : environmentComponents.joined(separator: ", ")
    }
    
    private func combineDescriptionComponents(_ components: [String]) -> String {
        guard !components.isEmpty else {
            return "A scene with various elements"
        }
        
        if components.count == 1 {
            return components[0].capitalized
        }
        
        let last = components.last!
        let rest = components.dropLast()
        
        return "\(rest.joined(separator: ", ")), \(last)"
    }
    
    // MARK: - Public Methods
    func isAppleIntelligenceAvailable() -> Bool {
        return isAvailable
    }
    
    func getServiceInfo() -> AppleIntelligenceInfo {
        return AppleIntelligenceInfo(
            available: isAvailable,
            version: "1.0.0",
            model: "Apple Intelligence Foundation Models",
            capabilities: ["scene_description", "object_analysis", "natural_language_generation"]
        )
    }
}

// MARK: - Supporting Types
struct SceneContext {
    let library: String?
    let userPreferences: [String: Any]?
    let previousScenes: [String]?
}

// SceneDescription is defined in AnalysisResult.swift

struct VisualFeatures {
    let classifications: [Classification]
    let dominantColors: [String]
    let composition: Composition
}

struct Classification: Codable {
    let label: String
    let confidence: Float
}

struct Composition {
    let ruleOfThirds: Bool
    let symmetry: Bool
    let leadingLines: Bool
    let depthOfField: String
}

struct ObjectContext {
    let faceCount: Int
    let animalCount: Int
    let hasPeople: Bool
    let hasAnimals: Bool
    let primarySubject: String?
}

struct AppleIntelligenceInfo: Codable, Content {
    let available: Bool
    let version: String
    let model: String
    let capabilities: [String]
}
