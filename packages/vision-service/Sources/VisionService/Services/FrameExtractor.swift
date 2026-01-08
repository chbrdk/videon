import Foundation
import AVFoundation
import CoreVideo

class FrameExtractor {
    
    func extractFrame(from videoURL: URL, at time: CMTime) async throws -> CVPixelBuffer? {
        let asset = AVAsset(url: videoURL)
        
        let videoTracks = try await asset.loadTracks(withMediaType: .video)
        guard videoTracks.count > 0 else {
            throw VisionError.noVideoTrack
        }
        
        let generator = AVAssetImageGenerator(asset: asset)
        generator.requestedTimeToleranceBefore = .zero
        generator.requestedTimeToleranceAfter = .zero
        generator.appliesPreferredTrackTransform = true
        
        // Configure for optimal quality
        generator.maximumSize = CGSize(width: 1920, height: 1080)
        
        do {
            let cgImage = try await generator.image(at: time).image
            return try await convertCGImageToPixelBuffer(cgImage)
        } catch {
            throw VisionError.frameExtractionFailed(error)
        }
    }
    
    func extractFrame(from imageURL: URL) async throws -> CVPixelBuffer? {
        guard let imageSource = CGImageSourceCreateWithURL(imageURL as CFURL, nil),
              let cgImage = CGImageSourceCreateImageAtIndex(imageSource, 0, nil) else {
            throw VisionError.imageLoadingFailed
        }
        
        return try await convertCGImageToPixelBuffer(cgImage)
    }
    
    private func convertCGImageToPixelBuffer(_ cgImage: CGImage) async throws -> CVPixelBuffer {
        let attributes: [String: Any] = [
            kCVPixelBufferCGImageCompatibilityKey as String: true,
            kCVPixelBufferCGBitmapContextCompatibilityKey as String: true,
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
        ]
        
        var pixelBuffer: CVPixelBuffer?
        let status = CVPixelBufferCreate(
            kCFAllocatorDefault,
            cgImage.width,
            cgImage.height,
            kCVPixelFormatType_32BGRA,
            attributes as CFDictionary,
            &pixelBuffer
        )
        
        guard status == kCVReturnSuccess, let buffer = pixelBuffer else {
            throw VisionError.pixelBufferCreationFailed
        }
        
        CVPixelBufferLockBaseAddress(buffer, CVPixelBufferLockFlags(rawValue: 0))
        defer { CVPixelBufferUnlockBaseAddress(buffer, CVPixelBufferLockFlags(rawValue: 0)) }
        
        let pixelData = CVPixelBufferGetBaseAddress(buffer)
        let rgbColorSpace = CGColorSpaceCreateDeviceRGB()
        let context = CGContext(
            data: pixelData,
            width: cgImage.width,
            height: cgImage.height,
            bitsPerComponent: 8,
            bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
            space: rgbColorSpace,
            bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
        )
        
        context?.draw(cgImage, in: CGRect(x: 0, y: 0, width: cgImage.width, height: cgImage.height))
        
        return buffer
    }
}

enum VisionError: Error, LocalizedError {
    case noVideoTrack
    case failedToCreateAssetReader
    case failedToCreateAssetReaderOutput
    case failedToStartAssetReader
    case failedToExtractFrame
    case frameExtractionFailed(Error)
    case imageLoadingFailed
    case invalidImageBuffer
    case pixelBufferCreationFailed
    
    var errorDescription: String? {
        switch self {
        case .noVideoTrack:
            return "No video track found in asset"
        case .failedToCreateAssetReader:
            return "Failed to create AVAssetReader"
        case .failedToCreateAssetReaderOutput:
            return "Failed to create AVAssetReaderTrackOutput"
        case .failedToStartAssetReader:
            return "Failed to start AVAssetReader"
        case .failedToExtractFrame:
            return "Failed to extract frame from video"
        case .frameExtractionFailed(let error):
            return "Frame extraction failed: \(error.localizedDescription)"
        case .imageLoadingFailed:
            return "Failed to load image"
        case .invalidImageBuffer:
            return "Invalid image buffer"
        case .pixelBufferCreationFailed:
            return "Failed to create pixel buffer"
        }
    }
}
