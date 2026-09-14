import { describe, expect, it } from 'vitest';
import { matchesHealthEmergencySignal } from './health-ai.functions';

describe('Health emergency preflight', () => {
  it.each([
    'I cannot breathe',
    'I have severe chest pain',
    'there is severe bleeding',
    'I think this is a stroke',
    'they are unconscious',
    'I took an overdose',
    'this looks like anaphylaxis',
    'the seizure is happening now',
    'I want to kill myself',
  ])('escalates deterministic emergency language: %s', (input) => {
    expect(matchesHealthEmergencySignal(input)).toBe(true);
  });

  it.each([
    'How can I improve my 5k time?',
    'Can you help me build a three day strength plan?',
    'What are healthy sleep habits?',
    'I want to understand my protein intake',
    'I had a seizure many years ago and want help preparing questions for my doctor',
  ])('does not block ordinary health and fitness coaching: %s', (input) => {
    expect(matchesHealthEmergencySignal(input)).toBe(false);
  });
});
