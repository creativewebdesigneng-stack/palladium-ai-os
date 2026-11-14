// swift-tools-version: 5.9
import PackageDescription

// Compiles the provider-neutral iOS boundary with the Swift standard library.
// App Intents stay behind canImport, so this package does not require Xcode
// or a physical device. Device SDK certification remains a separate gate.
let package = Package(
    name: "BlackstarMobileIntelligence",
    products: [
        .library(name: "BlackstarMobileIntelligence", targets: ["BlackstarMobileIntelligence"]),
    ],
    targets: [
        .target(
            name: "BlackstarMobileIntelligence",
            path: ".",
            sources: [
                "ios/BlackstarFoundationModelBoundary.swift",
                "ios/BlackstarMobileBridge.swift",
                "ios/BlackstarMobileIntent.swift",
            ]
        ),
    ]
)
