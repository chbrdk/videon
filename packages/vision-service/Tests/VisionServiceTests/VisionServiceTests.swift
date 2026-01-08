import XCTest
@testable import VisionService

final class VisionServiceTests: XCTestCase {
    
    func testHealthResponse() throws {
        let health = HealthResponse()
        XCTAssertEqual(health.status, "healthy")
        XCTAssertFalse(health.visionVersion.isEmpty)
    }
    
    func testObjectDetectionModel() throws {
        let detection = ObjectDetection(
            label: "person",
            confidence: 0.95,
            boundingBox: [0.1, 0.2, 0.3, 0.4]
        )
        
        XCTAssertEqual(detection.label, "person")
        XCTAssertEqual(detection.confidence, 0.95)
        XCTAssertEqual(detection.boundingBox.count, 4)
    }
    
    func testFaceDetectionModel() throws {
        let face = FaceDetection(
            confidence: 0.98,
            landmarks: ["leftEye": [[0.1, 0.2], [0.3, 0.4]]],
            boundingBox: [0.1, 0.2, 0.3, 0.4]
        )
        
        XCTAssertEqual(face.confidence, 0.98)
        XCTAssertNotNil(face.landmarks)
        XCTAssertEqual(face.boundingBox.count, 4)
    }
}
