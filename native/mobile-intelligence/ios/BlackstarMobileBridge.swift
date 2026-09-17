import Foundation

/// Native iOS adapter boundary for Blackstar Mobile Intelligence.
/// App Intents and Foundation Models availability must be detected by the app at runtime.
struct BlackstarMobileCapabilityReport: Codable {
    let platform: String = "ios"
    let osVersion: String
    let nativeIntelligenceAvailable: Bool
    let nativeProvider: String?
    let capabilities: [String]
    let appActionsAvailable: Bool
}

enum BlackstarMobileBridge {
    static func report(
        nativeIntelligenceAvailable: Bool,
        capabilities: [String],
        appActionsAvailable: Bool
    ) -> BlackstarMobileCapabilityReport {
        BlackstarMobileCapabilityReport(
            osVersion: ProcessInfo.processInfo.operatingSystemVersionString,
            nativeIntelligenceAvailable: nativeIntelligenceAvailable,
            nativeProvider: nativeIntelligenceAvailable ? "apple-foundation-models" : nil,
            capabilities: Array(Set(capabilities)).sorted(),
            appActionsAvailable: appActionsAvailable
        )
    }
}
