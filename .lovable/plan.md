# Voice assistant audit — why speaking does nothing

Read-only audit of the current checkout plus live runtime checks. No code was changed.

## Commit question first

`43fa08b1ea1c58d52042bbc79e6c935e1bc2672a` ("fix: make voice assistant open hands-free") **is present** in this project's history — it is five commits behind the current HEAD (`e11a6ae`), so the preview build contains it. Whether the *published* app serves it cannot be verified from the bundle (no commit SHA is embedded); published frontends only update when Publish → Update is clicked, so if the user is testing the published URL and never re-published after 43fa08b, they are testing an older bundle.

## Confirmed defect (verified against the live database)

The assistant's preference server functions read and write a table that **does not exist**:

- `src/lib/voice/voice-assistant.functions.ts` queries `public.voice_assistant_preferences` in both `getVoiceAssistantPreferences` and `saveVoiceAssistantPreferences`.
- A live schema query returns no table matching `%voice%` in `public`. `information_schema` has no such relation.

Consequences visible to the user right now:

1. On every page load `getVoiceAssistantPreferences` rejects. `GlobalAIAssistant` logs `[voice-assistant] preferences` to the console and falls back to defaults, so it does still try to listen — but this is a guaranteed console error and a guaranteed 500 on each load.
2. The Power (on/off) and Mute buttons, the voice picker, rate and pitch **never persist** — `saveVoiceAssistantPreferences` always fails; only local state changes, silently reverting on reload.

This is the one hard, reproducible backend failure. It is not by itself the reason speech is inaudible/ignored, so the likely root causes below matter too.

## Ranked likely root causes for "speaking does nothing"

### 1. The Lovable editor preview runs the app in an iframe without microphone permission
If the user is speaking while looking at the in-editor preview pane, the page is a cross-origin iframe. `getUserMedia` and `SpeechRecognition` both require the embedding iframe to carry `allow="microphone"`, which the editor preview does not grant. The result is exactly the reported symptom: `NotAllowedError` / `not-allowed`, no prompt, nothing happens. The app cannot fix this from inside; it must be tested in a normal browser tab on the preview or published URL. First thing to confirm with the user.

### 2. Auto-start with no user gesture, so the permission prompt never appears
`src/components/palladium/GlobalAIAssistant.jsx` lines 275-299 call `navigator.mediaDevices.getUserMedia` and then `recognition.start()` from a mount effect. Chrome and Edge increasingly suppress microphone prompts that are requested without user activation, and Web Speech `start()` before permission is granted fires `onerror` with `not-allowed` / `service-not-allowed`. In that path the code sets `shouldListenRef.current = false` (line 215/287) and stops permanently — one silent failure at load kills hands-free listening for the whole session with no retry and no visible signal.

### 3. All failures are invisible
Every `start()` is wrapped in `try {} catch {}` with an empty handler (lines 117, 249, 267, 295). `micError` is only rendered inside the assistant panel, which is closed by default; the floating button shows only an amber dot. So a blocked microphone, an unsupported browser, or a `network` error from Chrome's speech service all present identically as "I speak and nothing happens".

### 4. Listening can never resume after the assistant talks
`speak()` (lines 121-141) sets `speechActiveRef.current = true` and stops recognition. Resumption depends entirely on `utterance.onend` / `onerror` firing. `resumeRecognition` (line 116) and `onend` (line 229) both bail while `speechActiveRef` is true, and there is no timeout fallback. If speech synthesis drops the utterance — no voices loaded yet (this environment reported `speechSynthesis.getVoices().length === 0`), a Chrome `cancel()`-then-`speak()` race, or an autoplay-blocked synthesiser — the flag stays true forever and the microphone never restarts. Symptom: the very first utterance may work, then the assistant goes permanently deaf.

### 5. Chrome's silence/timeout cycle plus restart races
With `continuous = true`, Chrome ends a session after a few seconds of silence (`no-speech`) and after network hiccups (`network`). The handler restarts after 350-500 ms, but if a restart lands while a session is still active, `start()` throws `InvalidStateError` into the empty catch and no further timer is scheduled by that path, so listening can stop for good after an unlucky race.

### 6. Environment/browser support
`window.SpeechRecognition || window.webkitSpeechRecognition` exists in Chrome/Edge, but not Firefox and not in embedded/Chromium builds lacking Google's speech service. There is no in-app fallback (no press-to-talk button) when it is missing, only a message hidden inside a closed panel.

## What I could not verify

No authenticated browser session is available in this environment (`signed_out`, and minting one needs your approval), and the assistant only mounts inside the authenticated shell (`src/routes/_shell/_app.tsx` → `AppShell.jsx`). So I could not capture the live console for a signed-in page. If you want that, approve a session mint or paste the browser console output from `/dashboard` with the assistant panel open.

## Suggested fix batch (not implemented — for approval)

1. Create the missing `public.voice_assistant_preferences` table with owner-scoped RLS and grants, so preferences load and persist.
2. Make failures visible and recoverable: surface the microphone state on the floating button itself, and show a one-tap "Enable microphone" affordance that calls `getUserMedia` + `start()` from a real click (satisfying browser gesture requirements) instead of only auto-starting.
3. Harden the lifecycle: watchdog timer that clears `speechActiveRef` if synthesis never reports completion, guarded restart that always reschedules on `InvalidStateError`, and bounded retry with backoff for `network` errors.
4. Detect iframe embedding and, when the microphone is not permitted by the frame, tell the user to open the app in its own tab.
5. Regression tests for the guard/watchdog logic and a schema test for the new table.

## Technical notes

- Files inspected: `src/components/palladium/GlobalAIAssistant.jsx`, `src/components/palladium/AppShell.jsx`, `src/lib/voice/voice-assistant.functions.ts`, `src/react-router-dom.d.ts` (the `react-router-dom` alias resolves correctly via `vite.config.ts`, so no import-time crash).
- Runtime checks: no `Permissions-Policy` header blocks the microphone on either the published or local origin; the assistant is mounted exactly once; `speechSynthesis` reported zero voices in a headless Chromium context.
