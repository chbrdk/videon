// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "VisionService",
    platforms: [
        .macOS(.v13) // macOS 13+ for Vision Framework compatibility
    ],
    products: [
        .executable(
            name: "VisionService",
            targets: ["VisionService"]
        ),
    ],
    dependencies: [
        .package(url: "https://github.com/vapor/vapor.git", from: "4.0.0"),
    ],
        targets: [
            .executableTarget(
                name: "VisionService",
                dependencies: [
                    .product(name: "Vapor", package: "vapor"),
                ]
            ),
        .testTarget(
            name: "VisionServiceTests",
            dependencies: ["VisionService"],
            path: "Tests/VisionServiceTests"
        ),
    ]
)
