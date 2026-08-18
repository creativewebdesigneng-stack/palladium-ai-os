const DOCUMENT_REQUEST_PATTERNS = [
  /\b(?:meal|diet|nutrition)\s+plan\b/i,
  /\bweekly\s+(?:meal|diet|menu|schedule|plan)\b/i,
  /\b(?:create|build|make|write|draft|generate|prepare)\b.{0,45}\b(?:report|document|proposal|brief|plan|schedule|checklist|workbook|work\s*pack|guide|itinerary)\b/i,
  /\b(?:report|proposal|brief|checklist|workbook|work\s*pack)\b/i,
];

export function isDocumentTask(taskOrRequest) {
  const request = typeof taskOrRequest === 'string'
    ? taskOrRequest
    : String(taskOrRequest?.request || taskOrRequest?.title || '');
  const category = typeof taskOrRequest === 'object' ? String(taskOrRequest?.category || '').toLowerCase() : '';
  if (category === 'food' && /\b(?:meal|diet|nutrition|menu)\b/i.test(request)) return true;
  return DOCUMENT_REQUEST_PATTERNS.some((pattern) => pattern.test(request));
}

export function generatedDocumentTitle(task) {
  const existing = String(task?.title || '').trim();
  if (existing) return existing;
  const request = String(task?.request || '').trim();
  if (/\bmeal\s+plan\b/i.test(request)) return 'Weekly Meal Plan';
  if (/\bdiet\s+plan\b/i.test(request)) return 'Weekly Diet Plan';
  if (/\breport\b/i.test(request)) return 'Generated Report';
  if (/\bchecklist\b/i.test(request)) return 'Generated Checklist';
  if (/\bschedule\b/i.test(request)) return 'Generated Schedule';
  return 'Generated Document';
}
