#if canImport(AppIntents)
import AppIntents

/// Minimal Blackstar App Intent boundary. The shipping iOS target should register
/// concrete, allowlisted Blackstar actions and send consequential work through
/// Blackstar approval before any external side effect.
@available(iOS 16.0, *)
struct AskBlackstarIntent: AppIntent {
    static var title: LocalizedStringResource = "Ask Blackstar"
    static var description = IntentDescription("Send a request to Blackstar using the authenticated mobile bridge.")

    @Parameter(title: "Request") var request: String

    func perform() async throws -> some IntentResult & ProvidesDialog {
        // Network/device execution is intentionally supplied by the authenticated app target.
        // This boundary must not execute an unapproved side effect by itself.
        return .result(dialog: "Open Blackstar to complete this request securely.")
    }
}
#endif
