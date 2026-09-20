/**
 * Human Frontier is deliberately separate from the agent-executable Tools Framework.
 * None of these entries are agent capabilities, external integrations or attestations
 * that a human actually performed an action. Responses remain user-authored.
 */
import { HUMAN_FRONTIER_ADDITIONS } from './additions';

export type HumanField = { label: string; hint: string };
export type HumanTool = {
  id: string;
  name: string;
  category: 'Everyday life' | 'People & community' | 'Making & learning' | 'Judgement & safety';
  purpose: string;
  humanAction: string;
  fields: readonly [HumanField, HumanField, HumanField];
  checks: readonly [string, string, string];
  output: string;
};

export const HUMAN_FRONTIER_TOOLS: readonly HumanTool[] = [
  {
    id: 'reality-gap-walk', name: 'Reality Gap Walk', category: 'Everyday life',
    purpose: 'Compare what a map, listing or digital description says with what you actually encounter.',
    humanAction: 'Visit a safe, accessible location yourself and notice what a remote system cannot perceive.',
    fields: [{ label: 'Place or claim to check', hint: 'What online description will you compare?' }, { label: 'What you directly observed', hint: 'Record your own observations, not an AI summary.' }, { label: 'What needs to change', hint: 'Which real-world discrepancy matters to you?' }],
    checks: ['I chose a safe way to observe the place.', 'I compared the claim with my own observations.', 'I separated firsthand evidence from assumptions.'],
    output: 'A self-reported reality-gap field note',
  },
  {
    id: 'quiet-signal-lab', name: 'Quiet Signal Lab', category: 'Everyday life',
    purpose: 'Find which demands on your attention matter when automated notifications are absent.',
    humanAction: 'Personally spend a self-chosen period away from nonessential alerts and reflect on it.',
    fields: [{ label: 'Boundary for the experiment', hint: 'When and which nonessential notifications?' }, { label: 'What I noticed without prompts', hint: 'What drew your attention instead?' }, { label: 'Attention boundary I choose', hint: 'Describe the adjustment you want to make.' }],
    checks: ['I kept any essential communication available.', 'I completed my chosen observation period.', 'I selected the next boundary myself.'],
    output: 'A user-chosen attention boundary',
  },
  {
    id: 'consent-script-studio', name: 'Consent Script Studio', category: 'People & community',
    purpose: 'Practise asking clearly, receiving a genuine answer and respecting a refusal.',
    humanAction: 'Speak the request yourself and allow the other person to choose freely.',
    fields: [{ label: 'Request in my own words', hint: 'Write one respectful, specific question.' }, { label: 'How I will make no easy', hint: 'What will I say to ensure refusal is acceptable?' }, { label: 'My response to either answer', hint: 'What will you do without pressuring the person?' }],
    checks: ['I made space for an unpressured response.', 'I avoided treating silence as permission.', 'I respected the other person’s actual response.'],
    output: 'A personal consent and response plan',
  },
  {
    id: 'repair-first-passport', name: 'Repair First Passport', category: 'Making & learning',
    purpose: 'Decide whether to repair, reuse or retire an everyday object using firsthand inspection.',
    humanAction: 'Inspect the object directly; leave electricity, gas and other hazards to qualified professionals.',
    fields: [{ label: 'Object and observed fault', hint: 'Only describe what you can safely inspect.' }, { label: 'Safe repair or reuse option', hint: 'Include whether an expert is needed.' }, { label: 'My next physical step', hint: 'What will you do with the object?' }],
    checks: ['I checked for hazards and stopped if unsure.', 'I inspected only what is safe to touch.', 'I chose repair, reuse or retirement based on the real item.'],
    output: 'A user-authored object care passport',
  },
  {
    id: 'accessibility-co-walk', name: 'Accessibility Co-Walk', category: 'People & community',
    purpose: 'Improve a shared space through invited feedback from the people who actually use it.',
    humanAction: 'Invite willing participants and observe the route together without pretending to speak for anyone else.',
    fields: [{ label: 'Route and invited perspective', hint: 'Describe the place without identifying participants.' }, { label: 'Obstacle or useful feature observed', hint: 'What did someone voluntarily highlight?' }, { label: 'Change to propose', hint: 'Who could consider this improvement?' }],
    checks: ['I asked for participation without pressure.', 'I observed the space rather than simulating another person’s experience.', 'I checked how to share feedback with permission.'],
    output: 'An accessibility co-observation note',
  },
  {
    id: 'trust-handshake', name: 'Trust Handshake Canvas', category: 'People & community',
    purpose: 'Agree explicit expectations before collaborating, sharing a resource or exchanging help.',
    humanAction: 'Have a genuine two-way conversation; agreement cannot be fabricated by software.',
    fields: [{ label: 'What I can genuinely offer', hint: 'State only what is within your control.' }, { label: 'Boundary or condition to discuss', hint: 'What must both sides understand?' }, { label: 'Agreement or unresolved point', hint: 'Do not imply that someone agreed unless they did.' }],
    checks: ['I gave the other person room to disagree.', 'I clarified commitments without making promises on their behalf.', 'I left unresolved matters explicitly unresolved.'],
    output: 'A self-reported collaboration agreement note',
  },
  {
    id: 'decision-circle', name: 'Decision Circle', category: 'Judgement & safety',
    purpose: 'Record how people reached a real joint decision, including uncertainty and dissent.',
    humanAction: 'Invite the affected people to deliberate; no automated vote or implied consent.',
    fields: [{ label: 'Decision and people affected', hint: 'Describe roles rather than private identities.' }, { label: 'Concerns or disagreement heard', hint: 'Record disagreement fairly and only with permission.' }, { label: 'Actual outcome and open questions', hint: 'Who decided what? What remains undecided?' }],
    checks: ['Affected people had an opportunity to speak.', 'I did not portray lack of response as agreement.', 'I recorded actual decisions separately from proposed ones.'],
    output: 'A human-authored deliberation record',
  },
  {
    id: 'sensory-proof', name: 'Sensory Proof Log', category: 'Everyday life',
    purpose: 'Compare your own safe sensory experience with promotional or algorithmic descriptions.',
    humanAction: 'Personally experience a safe, familiar item; never taste or handle an unknown substance.',
    fields: [{ label: 'Item and advertised description', hint: 'For example, a food you already know is safe for you.' }, { label: 'My own sensory observations', hint: 'What did you personally notice?' }, { label: 'Which description fits my experience', hint: 'A subjective note, not a universal quality claim.' }],
    checks: ['I chose something safe for me to examine.', 'I made my own observations.', 'I distinguished personal preference from an objective fact.'],
    output: 'A personal sensory comparison',
  },
  {
    id: 'mentor-handoff', name: 'Mentor Handoff', category: 'Making & learning',
    purpose: 'Transfer a real-world skill through demonstration, practice and feedback.',
    humanAction: 'Practise with a willing mentor or learner instead of treating a video as proof of competence.',
    fields: [{ label: 'Skill and safe practice setting', hint: 'Pick a bounded, low-risk task.' }, { label: 'What was demonstrated and attempted', hint: 'What actually happened during practice?' }, { label: 'Feedback and next attempt', hint: 'Capture feedback in your own words.' }],
    checks: ['A real person demonstrated or observed the task.', 'I attempted the task safely myself.', 'I identified something to change next time.'],
    output: 'A firsthand skill-transfer record',
  },
  {
    id: 'assumption-field-test', name: 'Assumption Field Test', category: 'Making & learning',
    purpose: 'Replace a speculative plan with one small, consent-based real-world test.',
    humanAction: 'Carry out an appropriately safe test and report results instead of inventing outcomes.',
    fields: [{ label: 'My assumption', hint: 'What belief are you testing?' }, { label: 'Small safe test and actual result', hint: 'Who or what did you observe with permission?' }, { label: 'What I now believe', hint: 'What changed, and what remains unknown?' }],
    checks: ['I chose a safe, reversible test.', 'I gathered real observations with consent where needed.', 'I reported the result even if it contradicted my assumption.'],
    output: 'A firsthand assumption-test note',
  },
  {
    id: 'resource-swap', name: 'Neighbour Resource Swap', category: 'People & community',
    purpose: 'Help people exchange spare resources without an AI negotiating or agreeing on their behalf.',
    humanAction: 'Personally check the item or help offered and arrange mutual terms directly.',
    fields: [{ label: 'What I can offer or need', hint: 'Avoid publishing a home address or contact details.' }, { label: 'Condition and practical limits', hint: 'What did you inspect or confirm yourself?' }, { label: 'Mutually agreed next step', hint: 'Leave blank if terms are not yet agreed.' }],
    checks: ['I checked the resource and any safety concerns.', 'I discussed the terms directly with a willing person.', 'I confirmed the next step instead of assuming acceptance.'],
    output: 'A private resource-exchange preparation note',
  },
  {
    id: 'movement-choice-map', name: 'Movement Choice Map', category: 'Everyday life',
    purpose: 'Notice how ordinary, comfortable movement affects your own readiness for a task.',
    humanAction: 'Choose and perform a personally comfortable activity; software cannot move your body for you.',
    fields: [{ label: 'Optional comfortable activity', hint: 'For example, standing up or a short walk, if appropriate for you.' }, { label: 'What I noticed afterward', hint: 'Describe your own experience without medical conclusions.' }, { label: 'What I choose next', hint: 'Stop or adapt if the activity feels uncomfortable.' }],
    checks: ['I selected an activity appropriate for me.', 'I stopped if I experienced discomfort.', 'I made the next choice myself.'],
    output: 'A personal movement-and-readiness note',
  },
  {
    id: 'claim-receipt', name: 'Claim Receipt', category: 'Judgement & safety',
    purpose: 'Keep firsthand observations, secondhand claims and unknowns visibly separate.',
    humanAction: 'Independently check an appropriate primary source or the real object before endorsing a claim.',
    fields: [{ label: 'Claim and where I encountered it', hint: 'What exactly is being claimed?' }, { label: 'What I checked directly', hint: 'Describe the actual source, observation or limits of access.' }, { label: 'What is still unverified', hint: 'Do not fill gaps with assumptions.' }],
    checks: ['I identified what evidence would actually support the claim.', 'I marked secondhand information as secondhand.', 'I did not call the claim verified without adequate evidence.'],
    output: 'A transparent evidence-and-unknowns receipt',
  },
  {
    id: 'relationship-repair', name: 'Relationship Repair Practice', category: 'People & community',
    purpose: 'Prepare an accountable conversation without generating a synthetic apology or forcing reconciliation.',
    humanAction: 'Listen, acknowledge your own actions and honour the other person’s choice not to engage.',
    fields: [{ label: 'My responsibility in my own words', hint: 'Describe your own behaviour, not a verdict on someone else.' }, { label: 'What I will ask, and how I will listen', hint: 'Allow a no or no response.' }, { label: 'Repair step I can personally take', hint: 'Avoid requiring the other person to forgive you.' }],
    checks: ['I did not pressure someone into a conversation.', 'I listened without claiming agreement or forgiveness.', 'I chose an action within my own control.'],
    output: 'A personal accountability and repair plan',
  },
  {
    id: 'place-memory', name: 'Place Memory Atlas', category: 'Everyday life',
    purpose: 'Preserve the meaning of an everyday place through personal observation rather than generic map data.',
    humanAction: 'Visit or remember a place and choose what you want to share from your own experience.',
    fields: [{ label: 'Place described without a precise private address', hint: 'A public landmark or general area is enough.' }, { label: 'A lived memory or observation', hint: 'What makes this place meaningful to you?' }, { label: 'One change worth remembering', hint: 'What changed, or what would you preserve?' }],
    checks: ['I used my own experience rather than a generated story.', 'I avoided exposing someone else’s private location.', 'I decided which details are appropriate to share.'],
    output: 'A personal place-memory entry',
  },
  {
    id: 'touch-prototype', name: 'Touch Prototype Trial', category: 'Making & learning',
    purpose: 'Test how a physical prototype feels and works before trusting a rendering or AI evaluation.',
    humanAction: 'Handle a safe prototype yourself or invite someone to try it with consent.',
    fields: [{ label: 'Prototype and test task', hint: 'Choose a simple, safe real-world action.' }, { label: 'Actual handling feedback', hint: 'Where did the physical object help or frustrate the task?' }, { label: 'One change for the next version', hint: 'What will you modify based on observation?' }],
    checks: ['The prototype was safe to handle.', 'A real person attempted the intended task.', 'I based the proposed change on what happened.'],
    output: 'A firsthand physical prototype trial record',
  },
  {
    id: 'values-tradeoff', name: 'Values Trade-off Table', category: 'Judgement & safety',
    purpose: 'Make an important personal choice without asking an AI to decide what matters most to you.',
    humanAction: 'Name the trade-off and make or defer your own decision.',
    fields: [{ label: 'Choice and genuine alternatives', hint: 'Include the option of waiting if it exists.' }, { label: 'Values or people I need to consider', hint: 'What matters to you, without a machine-assigned score?' }, { label: 'My choice or reason to defer', hint: 'Only you can commit to this decision.' }],
    checks: ['I considered at least one credible alternative.', 'I identified a trade-off I am willing or unwilling to make.', 'I made or deferred the decision myself.'],
    output: 'A user-owned values trade-off worksheet',
  },
  {
    id: 'offline-fallback', name: 'Offline Fallback Drill', category: 'Judgement & safety',
    purpose: 'Make sure an essential ordinary task can continue when an app, network or AI service fails.',
    humanAction: 'Physically locate the offline option and rehearse an appropriate low-risk fallback.',
    fields: [{ label: 'Task that depends on connectivity', hint: 'For example, opening a noncritical document.' }, { label: 'Offline resource I actually located', hint: 'Do not record passwords, access codes or sensitive contacts.' }, { label: 'What happened in my safe rehearsal', hint: 'Describe actual results and remaining gaps.' }],
    checks: ['I selected a safe, noncritical rehearsal.', 'I found and tried a real offline alternative.', 'I recorded gaps without claiming emergency readiness.'],
    output: 'A self-tested offline continuity note',
  },
  {
    id: 'ethical-stop', name: 'Ethical Stop Board', category: 'Judgement & safety',
    purpose: 'Create a human veto point when a technically possible action could harm people or violate boundaries.',
    humanAction: 'Personally review the impact, listen to affected people where appropriate and decide whether to stop.',
    fields: [{ label: 'Proposed action', hint: 'What would happen if it went ahead?' }, { label: 'Who might be affected and how', hint: 'Include uncertainty and whether consent is needed.' }, { label: 'My decision and stop condition', hint: 'Record the choice without treating it as automated authorization.' }],
    checks: ['I considered foreseeable effects on other people.', 'I identified where consent or expert review is needed.', 'I personally chose whether to proceed, change course or stop.'],
    output: 'A human-owned stop-or-proceed reflection',
  },
  {
    id: 'friction-safari', name: 'Everyday Friction Safari', category: 'Making & learning',
    purpose: 'Discover small real-world obstacles through direct observation before designing a digital fix.',
    humanAction: 'Attempt an ordinary task and notice one concrete difficulty for yourself.',
    fields: [{ label: 'Everyday task I attempted', hint: 'What were you trying to do in the real world?' }, { label: 'Where the friction actually occurred', hint: 'Describe a specific moment rather than guessing a cause.' }, { label: 'Low-risk improvement I could try', hint: 'Choose one change and how you will observe it.' }],
    checks: ['I attempted the task rather than imagining it.', 'I noted the moment and conditions of the obstacle.', 'I chose one feasible improvement to try.'],
    output: 'An observation-led friction discovery note',
  },
  ...HUMAN_FRONTIER_ADDITIONS,
] as const;

export function validateHumanFrontierTools(tools: readonly HumanTool[] = HUMAN_FRONTIER_TOOLS) {
  const ids = new Set<string>();
  for (const tool of tools) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tool.id) || ids.has(tool.id)) return false;
    ids.add(tool.id);
    if (!tool.name.trim() || !tool.purpose.trim() || !tool.humanAction.trim() || !tool.output.trim()) return false;
    if (tool.fields.length !== 3 || tool.checks.length !== 3) return false;
    if (tool.fields.some((field) => !field.label.trim() || !field.hint.trim()) || tool.checks.some((check) => !check.trim())) return false;
  }
  return tools.length === 60;
}
