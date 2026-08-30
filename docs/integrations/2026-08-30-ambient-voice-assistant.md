# Ambient voice assistant

PalladiumAI now promotes the existing global AI assistant into an account-level voice companion rather than introducing a separate agent/runtime.

## Behaviour

- The assistant is present throughout the authenticated application and is enabled by default for new preference rows.
- Users can turn the assistant off, mute spoken output, enable/disable spoken notification announcements, require a `Palladium`/`Jarvis` wake word, select any browser-provided voice, and tune speech speed/pitch.
- Speech recognition is continuous while the PalladiumAI web app is open and the browser allows microphone access. Browser security can require a one-time user gesture/permission before listening starts; this cannot be bypassed safely by the application.
- General questions continue through the existing provider-neutral `assistantChat` model gateway.
- Workspace-status questions use authenticated live reads of the existing agent, task, workflow and notification tables. No status is invented by the model.
- New realtime notifications are reused from the existing notification subscription and emitted only inside the current browser context for optional speech.

## Reused systems

- Global AI Assistant
- Model gateway and AI-provider preferences
- Agent/task/workflow records
- Realtime notifications
- Existing authenticated Supabase middleware and owner-scoped RLS
- Voice Studio remains the place for generated/cloned media voices; the ambient assistant uses browser speech synthesis so it remains low-latency and does not require a separate TTS worker for every UI response.

## Persistence

`voice_assistant_preferences` stores only per-user behaviour and browser voice-name preferences. It stores no microphone audio and no speech transcripts.
