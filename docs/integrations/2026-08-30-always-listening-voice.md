# Always-listening Palladium voice assistant

The ambient voice assistant keeps browser speech recognition active whenever the signed-in user has the assistant enabled and the browser permits microphone access.

## Behaviour

- After preferences load, PalladiumAI automatically attempts to start speech recognition.
- Recognition restarts after normal browser recognition-session endings.
- Turning the assistant off stops recognition immediately.
- Muting suppresses spoken output but does not disable listening.
- Wake-word mode remains the default safety boundary, so ambient speech is ignored unless it contains `Palladium`, `Jarvis`, or `Assistant`.
- Microphone audio and speech transcripts are not persisted by PalladiumAI.
- The microphone control is now a permission/resume control rather than a normal pause toggle; the power control is the explicit way to disable the ambient assistant.

## Browser boundary

Browsers control microphone permission. If a browser requires a one-time user gesture or permission prompt, PalladiumAI does not bypass it. Once permission is available, the assistant automatically keeps its recognition loop active while the app is open.
