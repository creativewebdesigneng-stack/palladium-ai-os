# Blackstar native Mobile Intelligence adapters

These adapters are native client boundaries for the platform-neutral contract in `src/lib/mobile-intelligence`.

They deliberately do not claim that Apple Foundation Models, App Intents, Gemini Nano, ML Kit GenAI, or Android AppFunctions are available merely because a phone is on iOS or Android. The shipping native applications must detect SDK/OS/device availability and report only capabilities that are actually usable.

The native applications must pair with an authenticated Blackstar account before invoking cloud/Astra work. Sensitive camera/voice context stays on-device unless the user explicitly authorizes transfer. Consequential app actions remain subject to Blackstar approval and audit controls.

The Swift and Kotlin files in this directory establish the capability-reporting boundary. Actual SDK calls are compiled and certified in the respective native application targets, because the Blackstar web build cannot certify Apple or Android device frameworks.
