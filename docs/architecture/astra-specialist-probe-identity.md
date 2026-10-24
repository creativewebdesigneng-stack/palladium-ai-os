# Astra specialist-model diagnostic repair

When certification uses a task-specific model, the generic failure probe must inspect the same exact candidate identifier. It previously checked the base model and could misreport model-not-found or chat-route-not-found.

The runner now supplies its attempted model to the bounded existing probe. Existing default callers retain their original behavior, and URL, credential, redirect and 20-second time limits are unchanged. Isolated tests check missing and present specialist cases; they do not constitute live inference or certification.
