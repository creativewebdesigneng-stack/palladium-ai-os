# Always-listening Palladium voice assistant

The ambient voice assistant is designed to keep recognition active whenever the signed-in user has the assistant enabled and the browser permits microphone access.

## Behaviour

- After preferences load, the client automatically attempts to start speech recognition when the assistant is enabled.
- Recognition restarts after normal browser recognition-session endings.
- Turning the assistant off stops recognition immediately.
- Muting only suppresses spoken output; it does not disable listening.
- Wake-word mode remains the default safety boundary, so ambient speech is ignored unless it contains `Palladium`, `Jarvis`, or `Assistant`.
- Microphone audio and transcripts are not persisted by PalladiumAI.

## Browser boundary

Browsers control microphone permission. If a browser requires a one-time user gesture or permission prompt, PalladiumAI cannot bypass it. Once permission is available, the assistant automatically resumes its continuous listening loop while the app is open.
