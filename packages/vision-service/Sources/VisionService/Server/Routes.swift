import Vapor

func routes(_ app: Application) throws {
    let visionAnalyzer = VisionAnalyzer()
    
    // Health check endpoint
    app.get("health") { req -> HealthResponse in
        return HealthResponse()
    }
    
    // Vision analysis endpoint
    app.post("analyze", "vision") { req -> VisionAnalysisResult in
        let request = try req.content.decode(VisionAnalysisRequest.self)
        
        // Validate file exists
        let fileManager = FileManager.default
        guard fileManager.fileExists(atPath: request.keyframePath) else {
            throw Abort(.badRequest, reason: "Keyframe file not found at path: \(request.keyframePath)")
        }
        
        // Perform vision analysis
        return try await visionAnalyzer.analyzeImage(at: request.keyframePath)
    }
    
    // Video analysis endpoint (for testing)
    app.post("analyze", "video") { req -> [VisionAnalysisResult] in
        struct VideoAnalysisRequest: Content {
            let videoPath: String
            let timeInterval: Double?
        }
        
        let request = try req.content.decode(VideoAnalysisRequest.self)
        
        // Validate file exists
        let fileManager = FileManager.default
        guard fileManager.fileExists(atPath: request.videoPath) else {
            throw Abort(.badRequest, reason: "Video file not found at path: \(request.videoPath)")
        }
        
        // Perform video analysis
        return try await visionAnalyzer.analyzeVideo(
            at: request.videoPath,
            timeInterval: request.timeInterval ?? 1.0
        )
    }
    
    // Core ML models endpoint
    app.get("models") { req -> ModelsResponse in
        let models = visionAnalyzer.getAvailableModels()
        let modelInfo = models.map { model in
            ModelInfo(
                name: model.name,
                description: model.description,
                inputSize: SizeInfo(width: Float(model.inputSize.width), height: Float(model.inputSize.height)),
                outputLabels: model.outputLabels,
                loaded: visionAnalyzer.isModelLoaded(model.name)
            )
        }
        return ModelsResponse(models: modelInfo)
    }
    
    // Core ML model info endpoint
    app.get("models", ":modelName") { req -> ModelInfo in
        let modelName = req.parameters.get("modelName") ?? ""
        guard let modelInfo = visionAnalyzer.getModelInfo(modelName) else {
            throw Abort(.notFound, reason: "Model not found: \(modelName)")
        }
        
        return ModelInfo(
            name: modelInfo.name,
            description: modelInfo.description,
            inputSize: SizeInfo(width: Float(modelInfo.inputSize.width), height: Float(modelInfo.inputSize.height)),
            outputLabels: modelInfo.outputLabels,
            loaded: visionAnalyzer.isModelLoaded(modelName)
        )
    }
    
    // Apple Intelligence info endpoint
    app.get("apple-intelligence") { req -> AppleIntelligenceInfo in
        return visionAnalyzer.getAppleIntelligenceInfo() ?? AppleIntelligenceInfo(
            available: false,
            version: "0.0.0",
            model: "Not Available",
            capabilities: []
        )
    }
    
    // Apple Intelligence availability check
    app.get("apple-intelligence", "available") { req -> [String: Bool] in
        return ["available": visionAnalyzer.isAppleIntelligenceAvailable()]
    }
    
    // Hardware acceleration info endpoint
    app.get("hardware-acceleration") { req -> Response in
        let info = visionAnalyzer.getHardwareAccelerationInfo()
        return try Response(status: .ok, body: .init(data: JSONSerialization.data(withJSONObject: info)))
    }
    
    // Hardware acceleration availability check
    app.get("hardware-acceleration", "available") { req -> [String: Bool] in
        return ["available": visionAnalyzer.isHardwareAccelerationAvailable()]
    }
    
    // Performance metrics endpoint
    app.get("performance") { req -> Response in
        let metrics = visionAnalyzer.getPerformanceMetrics()
        return try Response(status: .ok, body: .init(data: JSONSerialization.data(withJSONObject: metrics)))
    }
    
    // Performance benchmark endpoint
    app.post("benchmark") { req -> [String: Double] in
        struct BenchmarkRequest: Content {
            let testImagePath: String
            let iterations: Int?
        }
        
        let request = try req.content.decode(BenchmarkRequest.self)
        
        // Validate file exists
        let fileManager = FileManager.default
        guard fileManager.fileExists(atPath: request.testImagePath) else {
            throw Abort(.badRequest, reason: "Test image not found at path: \(request.testImagePath)")
        }
        
        let iterations = request.iterations ?? 10
        var times: [Double] = []
        
        for _ in 0..<iterations {
            let startTime = CFAbsoluteTimeGetCurrent()
            _ = try await visionAnalyzer.analyzeImage(at: request.testImagePath)
            let elapsed = CFAbsoluteTimeGetCurrent() - startTime
            times.append(elapsed)
        }
        
        let mean = times.reduce(0, +) / Double(times.count)
        let variance = times.map { pow($0 - mean, 2) }.reduce(0, +) / Double(times.count)
        let stdDev = sqrt(variance)
        
        return [
            "mean": mean,
            "stdDev": stdDev,
            "min": times.min() ?? 0,
            "max": times.max() ?? 0,
            "iterations": Double(iterations)
        ]
    }
}
