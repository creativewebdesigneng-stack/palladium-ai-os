package blackstar.mobile.intelligence

/**
 * Blackstar Android AppFunctions boundary.
 *
 * The shipping Android target should bind this contract to the supported Android
 * AppFunctions APIs only when those APIs are actually available. Consequential
 * operations must round-trip through Blackstar approval before execution.
 */
data class BlackstarAppFunctionRequest(
    val requestId: String,
    val action: String,
    val arguments: Map<String, Any?>,
)

sealed interface BlackstarAppFunctionDecision {
    data object ApprovalRequired : BlackstarAppFunctionDecision
    data class Ready(val request: BlackstarAppFunctionRequest) : BlackstarAppFunctionDecision
}

fun gateBlackstarAppFunction(request: BlackstarAppFunctionRequest, approvalGranted: Boolean): BlackstarAppFunctionDecision =
    if (approvalGranted) BlackstarAppFunctionDecision.Ready(request) else BlackstarAppFunctionDecision.ApprovalRequired
