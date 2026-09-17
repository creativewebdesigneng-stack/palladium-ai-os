package blackstar.mobile.intelligence

/** Provider-neutral Android boundary for Gemini Nano / ML Kit GenAI adapters. */
interface BlackstarOnDeviceLanguageModel {
    val isAvailable: Boolean
    suspend fun generate(prompt: String): String
}

class BlackstarOnDeviceModelUnavailable : IllegalStateException("On-device language model unavailable")

suspend fun runBlackstarOnDeviceModel(model: BlackstarOnDeviceLanguageModel, prompt: String): String {
    if (!model.isAvailable) throw BlackstarOnDeviceModelUnavailable()
    return model.generate(prompt)
}
