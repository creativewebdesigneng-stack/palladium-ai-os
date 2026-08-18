import { describe, expect, it } from 'vitest';
import { generatedDocumentTitle, isDocumentTask } from '../document-output';
import { readFile } from 'node:fs/promises';

describe('Mission Control generated documents', () => {
  it('classifies meal and diet plans as downloadable documents', () => {
    expect(isDocumentTask('Build me a weekly meal plan')).toBe(true);
    expect(isDocumentTask('Create a weekly diet plan for me')).toBe(true);
    expect(isDocumentTask({ request: 'What should I eat this week?', category: 'food' })).toBe(false);
    expect(isDocumentTask({ request: 'Make a nutrition meal plan', category: 'food' })).toBe(true);
  });

  it('classifies common work deliverables without treating ordinary chat as a document', () => {
    expect(isDocumentTask('Prepare a project status report')).toBe(true);
    expect(isDocumentTask('Create a launch checklist')).toBe(true);
    expect(isDocumentTask('Draft a proposal for the customer')).toBe(true);
    expect(isDocumentTask('What is the biggest planet?')).toBe(false);
    expect(isDocumentTask('Find me an office chair under £250')).toBe(false);
  });

  it('gives generated plans a useful fallback title', () => {
    expect(generatedDocumentTitle({ request: 'Build me a weekly meal plan' })).toBe('Weekly Meal Plan');
    expect(generatedDocumentTitle({ request: 'Create a diet plan' })).toBe('Weekly Diet Plan');
    expect(generatedDocumentTitle({ title: 'My Custom Plan', request: 'meal plan' })).toBe('My Custom Plan');
  });

  it('renders completed document tasks through the document card instead of the inline rich output', async () => {
    const source = await readFile(new URL('../../../components/mission/TaskBoard.jsx', import.meta.url), 'utf8');
    expect(source).toContain("import GeneratedDocumentCard from './GeneratedDocumentCard'");
    expect(source).toContain('documentContent ? (');
    expect(source).toContain('<GeneratedDocumentCard');
  });

  it('keeps toast notifications bounded instead of displaying entire AI documents', async () => {
    const source = await readFile(new URL('../../../components/ui/use-toast.jsx', import.meta.url), 'utf8');
    expect(source).toContain('MAX_TOAST_DESCRIPTION = 240');
    expect(source).toContain('TOAST_REMOVE_DELAY = 8000');
  });
});
