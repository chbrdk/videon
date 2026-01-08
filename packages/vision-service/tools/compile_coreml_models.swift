#!/usr/bin/env swift

// Script zum Kompilieren von .mlmodel zu .mlmodelc
import Foundation
import CoreML

let args = CommandLine.arguments
guard args.count > 1 else {
    print("Usage: compile_coreml_models.swift <model1.mlmodel> [model2.mlmodel ...]")
    exit(1)
}

let fileManager = FileManager.default

for modelPath in args.dropFirst() {
    let url = URL(fileURLWithPath: modelPath)
    
    guard fileManager.fileExists(atPath: url.path) else {
        print("⚠️  File not found: \(url.path)")
        continue
    }
    
    guard url.pathExtension == "mlmodel" else {
        print("⚠️  Not a .mlmodel file: \(url.path)")
        continue
    }
    
    print("🔄 Compiling: \(url.lastPathComponent)...")
    
    do {
        // Try to compile the model
        let compiledURL = try MLModel.compileModel(at: url)
        print("✅ Compiled to: \(compiledURL.path)")
        
        // The compiled model is in a temporary location
        // We can either use it directly or copy it
        print("   Model compiled successfully!")
        
    } catch {
        print("❌ Failed to compile \(url.lastPathComponent): \(error)")
    }
}

print("\n✅ Done!")

