import { useEffect, useRef } from 'react';
import { publishAssistantActivity } from '@/lib/voice/assistant-activity';

/**
 * Bridges the existing hands-free assistant state into the small public
 * lifecycle event bus used by Assistant Pulse. It does not persist prompts,
 * transcripts, audio or memory and it creates no new transport/runtime.
 */
export default function AssistantLifecycleBridge({ enabled, listening, pending, listeningMode, micError }) {
  const propsRef = useRef({ enabled, listening, pending, listeningMode, micError });
  propsRef.current = { enabled, listening, pending, listeningMode, micError };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let previous = '';
    const publish = () => {
      const current = propsRef.current;
      let state = 'idle';
      let detail = 'PalladiumAI assistant is ready.';
      if (!current.enabled) {
        state = 'off';
        detail = 'Voice assistant is disabled.';
      } else if (window.speechSynthesis?.speaking) {
        state = 'speaking';
        detail = 'Speaking the assistant response.';
      } else if (current.pending) {
        state = 'thinking';
        detail = 'Reasoning through your request.';
      } else if (current.micError && !current.listening) {
        state = 'error';
        detail = String(current.micError).slice(0, 180);
      } else if (current.listening) {
        state = 'listening';
        detail = current.listeningMode === 'cloud'
          ? 'Listening through the cloud speech fallback.'
          : current.listeningMode === 'browser'
            ? 'Listening through browser speech with cloud fallback ready.'
            : 'Listening for your next request.';
      }
      const signature = `${state}:${detail}`;
      if (signature !== previous) {
        previous = signature;
        publishAssistantActivity({ state, source: current.listeningMode === 'cloud' ? 'cloud' : 'browser', detail });
      }
    };
    publish();
    const timer = window.setInterval(publish, 180);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
