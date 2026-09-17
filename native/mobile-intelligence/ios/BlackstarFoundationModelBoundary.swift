import Foundation

/// Provider-neutral boundary used by the iOS target before binding to Apple's
/// Foundation Models framework. Availability must be checked at runtime.
protocol BlackstarOnDeviceLanguageModel {
    var isAvailable: Bool { get }
    func generate(prompt: String) async throws -> String
}

enum BlackstarOnDeviceModelError: Error {
    case unavailable
}

func runBlackstarOnDeviceModel(_ model: BlackstarOnDeviceLanguageModel, prompt: String) async throws -> String {
    guard model.isAvailable else { throw BlackstarOnDeviceModelError.unavailable }
    return try await model.generate(prompt: prompt)
}
