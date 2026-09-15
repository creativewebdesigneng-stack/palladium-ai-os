import { describe, expect, it } from 'vitest';
import { matchesHealthEmergencySignal } from './health-ai.functions';

describe('Health Coach emergency preflight', () => {
  it.each([
    'I cannot breathe',
    'severe chest pain',
    'severe bleeding',
    'signs of stroke',
    'they are unconscious',
    'I took an overdose',
    'this is anaphylaxis',
    'the seizure is happening now',
    'I want to kill myself',
  ])('escalates deterministic emergency language: %s', (text) => {
    expect(matchesHealthEmergencySignal(text)).toBe(true);
  });

  it.each([
    'build a 5k training plan',
    'help me eat more protein',
    'I slept badly last night',
    'I had a seizure years ago and want appointment questions',
    'what does resting heart rate mean?',
  ])('does not block ordinary health coaching: %s', (text) => {
    expect(matchesHealthEmergencySignal(text)).toBe(false);
  });
});
