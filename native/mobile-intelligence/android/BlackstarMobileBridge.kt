package blackstar.mobile.intelligence

/**
 * Native Android adapter boundary for Blackstar Mobile Intelligence.
 * Gemini Nano / ML Kit GenAI and AppFunctions availability must be capability-detected at runtime.
 */
data class BlackstarMobileCapabilityReport(
    val platform: String = "android",
    val osVersion: String,
    val nativeIntelligenceAvailable: Boolean,
    val nativeProvider: String?,
    val capabilities: List<String>,
    val appActionsAvailable: Boolean,
)

object BlackstarMobileBridge {
    fun report(
        osVersion: String,
        nativeIntelligenceAvailable: Boolean,
        capabilities: List<String>,
        appActionsAvailable: Boolean,
    ) = BlackstarMobileCapabilityReport(
        osVersion = osVersion,
        nativeIntelligenceAvailable = nativeIntelligenceAvailable,
        nativeProvider = if (nativeIntelligenceAvailable) "gemini-nano" else null,
        capabilities = capabilities.distinct().sorted(),
        appActionsAvailable = appActionsAvailable,
    )
}
