alter table if exists public.voice_assistant_preferences
  alter column wake_word_enabled set default false;

-- The product's ambient voice mode is intentionally open/hands-free by default.
-- Existing users can still re-enable wake-word filtering in Voice settings.
update public.voice_assistant_preferences
set wake_word_enabled = false,
    updated_at = now()
where wake_word_enabled is distinct from false;
