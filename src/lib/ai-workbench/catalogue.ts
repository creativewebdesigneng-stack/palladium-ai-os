/**
 * Blackstar AI Workbench: 160 user-invoked text/analysis tasks sharing the
 * authenticated assistant inference runtime. These are not executable agent
 * tools, external integrations, autonomous workers, or guaranteed factual outputs.
 */
export type AiWorkbenchTool = {
  id: string;
  name: string;
  category: string;
  description: string;
  instruction: string;
  deliverable: string;
};

export const AI_WORKBENCH_CATEGORIES = [
  "Writing & editing",
  "Learning & education",
  "Planning & productivity",
  "Business operations",
  "Marketing & content",
  "Customer experience",
  "Research & synthesis",
  "Product & UX",
  "Developer assistance",
  "Data & analysis",
  "Creative studio",
  "Career & work",
  "Personal organisation",
  "Communication",
  "Accessibility & inclusion",
  "Quality & critical thinking"
] as const;

export const AI_WORKBENCH_TOOLS: readonly AiWorkbenchTool[] = [
  {
    "id": "clarity-rewrite",
    "name": "Clarity Rewrite",
    "category": "Writing & editing",
    "description": "Improve user-provided text; preserve facts and voice.",
    "instruction": "Rewrite the supplied text for plain language while preserving its meaning and factual claims.",
    "deliverable": "A clear rewritten version plus a short list of substantive changes."
  },
  {
    "id": "tone-adjuster",
    "name": "Tone Adjuster",
    "category": "Writing & editing",
    "description": "Improve user-provided text; preserve facts and voice.",
    "instruction": "Rewrite the supplied message in the tone the user specifies without changing its commitments.",
    "deliverable": "A revised message and a note about tone choices."
  },
  {
    "id": "proofreading-editor",
    "name": "Proofreading Editor",
    "category": "Writing & editing",
    "description": "Improve user-provided text; preserve facts and voice.",
    "instruction": "Correct spelling punctuation grammar and formatting without adding new facts.",
    "deliverable": "A clean corrected text followed by a compact change log."
  },
  {
    "id": "executive-summary-maker",
    "name": "Executive Summary Maker",
    "category": "Writing & editing",
    "description": "Improve user-provided text; preserve facts and voice.",
    "instruction": "Distil user-supplied material into key findings and uncertainties without inventing conclusions.",
    "deliverable": "An executive summary with major points and open questions."
  },
  {
    "id": "headline-workshop",
    "name": "Headline Workshop",
    "category": "Writing & editing",
    "description": "Improve user-provided text; preserve facts and voice.",
    "instruction": "Generate distinct accurate headlines from a supplied article or campaign brief.",
    "deliverable": "Ten headline options grouped by style and a check for unsupported claims."
  },
  {
    "id": "brief-to-outline",
    "name": "Brief to Outline",
    "category": "Writing & editing",
    "description": "Improve user-provided text; preserve facts and voice.",
    "instruction": "Turn a raw brief into a logically ordered outline before drafting content.",
    "deliverable": "A structured outline with suggested sections and unanswered questions."
  },
  {
    "id": "paragraph-flow-editor",
    "name": "Paragraph Flow Editor",
    "category": "Writing & editing",
    "description": "Improve user-provided text; preserve facts and voice.",
    "instruction": "Reorder and connect supplied paragraphs for coherence while flagging missing transitions.",
    "deliverable": "An improved sequence and concise editing rationale."
  },
  {
    "id": "audience-simplifier",
    "name": "Audience Simplifier",
    "category": "Writing & editing",
    "description": "Improve user-provided text; preserve facts and voice.",
    "instruction": "Explain supplied technical text to a named nonexpert audience without distorting the information.",
    "deliverable": "A simplified version and a short glossary."
  },
  {
    "id": "meeting-minutes-formatter",
    "name": "Meeting Minutes Formatter",
    "category": "Writing & editing",
    "description": "Improve user-provided text; preserve facts and voice.",
    "instruction": "Turn rough meeting notes into minutes distinguishing decisions from proposals and unconfirmed items.",
    "deliverable": "Minutes with attendees only if supplied, decisions, actions and unresolved items."
  },
  {
    "id": "source-quote-integrator",
    "name": "Source Quote Integrator",
    "category": "Writing & editing",
    "description": "Improve user-provided text; preserve facts and voice.",
    "instruction": "Help embed short user-provided quotations in prose while retaining attribution and context.",
    "deliverable": "A revised passage with clearly marked quotations and missing source details."
  },
  {
    "id": "concept-explainer",
    "name": "Concept Explainer",
    "category": "Learning & education",
    "description": "Generate explanations and exercises using provided study context.",
    "instruction": "Teach a named concept at the learner's specified level using one concrete analogy and its limits.",
    "deliverable": "A stepwise explanation with analogy and comprehension check."
  },
  {
    "id": "guided-practice-builder",
    "name": "Guided Practice Builder",
    "category": "Learning & education",
    "description": "Generate explanations and exercises using provided study context.",
    "instruction": "Create progressive exercises for a named safe academic skill without claiming learner mastery.",
    "deliverable": "Five exercises in increasing difficulty with answer key."
  },
  {
    "id": "flashcard-generator",
    "name": "Flashcard Generator",
    "category": "Learning & education",
    "description": "Generate explanations and exercises using provided study context.",
    "instruction": "Convert user-provided notes into precise study flashcards without introducing unsupported facts.",
    "deliverable": "Fifteen question-and-answer flashcards."
  },
  {
    "id": "misconception-spotter",
    "name": "Misconception Spotter",
    "category": "Learning & education",
    "description": "Generate explanations and exercises using provided study context.",
    "instruction": "Review the learner's explanation and point out specific conceptual misconceptions constructively.",
    "deliverable": "Corrections with reasoning and one follow-up test."
  },
  {
    "id": "study-plan-designer",
    "name": "Study Plan Designer",
    "category": "Learning & education",
    "description": "Generate explanations and exercises using provided study context.",
    "instruction": "Organise a realistic study schedule from topics deadlines and available time provided by the user.",
    "deliverable": "A dated or relative study plan with breaks and review checkpoints."
  },
  {
    "id": "socratic-question-coach",
    "name": "Socratic Question Coach",
    "category": "Learning & education",
    "description": "Generate explanations and exercises using provided study context.",
    "instruction": "Guide understanding using carefully sequenced questions rather than supplying the entire answer first.",
    "deliverable": "An inquiry sequence with optional hints and a final synthesis."
  },
  {
    "id": "worked-example-tutor",
    "name": "Worked Example Tutor",
    "category": "Learning & education",
    "description": "Generate explanations and exercises using provided study context.",
    "instruction": "Walk through one user-specified educational example with intermediate checks and validation.",
    "deliverable": "A worked example with assumptions and verification steps."
  },
  {
    "id": "memory-retrieval-quiz",
    "name": "Memory Retrieval Quiz",
    "category": "Learning & education",
    "description": "Generate explanations and exercises using provided study context.",
    "instruction": "Turn supplied reference material into closed-book recall questions with graded answer criteria.",
    "deliverable": "A ten-question retrieval quiz and marking guide."
  },
  {
    "id": "language-dialogue-practice",
    "name": "Language Dialogue Practice",
    "category": "Learning & education",
    "description": "Generate explanations and exercises using provided study context.",
    "instruction": "Draft a short age-appropriate language practice dialogue at a specified level and topic.",
    "deliverable": "A two-person dialogue with vocabulary and correction tips."
  },
  {
    "id": "learning-objective-mapper",
    "name": "Learning Objective Mapper",
    "category": "Learning & education",
    "description": "Generate explanations and exercises using provided study context.",
    "instruction": "Convert an instructional topic into measurable learning objectives and aligned practice tasks.",
    "deliverable": "Objectives matched to practice tasks and ways to check understanding."
  },
  {
    "id": "project-milestone-planner",
    "name": "Project Milestone Planner",
    "category": "Planning & productivity",
    "description": "Create drafts and plans; users remain responsible for execution.",
    "instruction": "Break a supplied project goal into achievable milestones dependencies and decision gates.",
    "deliverable": "A milestone plan with owners left unassigned unless supplied."
  },
  {
    "id": "task-priority-sorter",
    "name": "Task Priority Sorter",
    "category": "Planning & productivity",
    "description": "Create drafts and plans; users remain responsible for execution.",
    "instruction": "Sort a supplied task backlog by stated urgency impact and effort criteria without inventing deadlines.",
    "deliverable": "A priority-ordered task list with explicit rationale and assumptions."
  },
  {
    "id": "weekly-time-blocker",
    "name": "Weekly Time Blocker",
    "category": "Planning & productivity",
    "description": "Create drafts and plans; users remain responsible for execution.",
    "instruction": "Propose flexible time blocks from the user's real commitments and available windows.",
    "deliverable": "A weekly draft schedule with buffers and conflicts highlighted."
  },
  {
    "id": "decision-options-matrix",
    "name": "Decision Options Matrix",
    "category": "Planning & productivity",
    "description": "Create drafts and plans; users remain responsible for execution.",
    "instruction": "Compare options only against criteria provided by the user without declaring a universal winner.",
    "deliverable": "A neutral options matrix showing trade-offs and unknowns."
  },
  {
    "id": "event-run-sheet-builder",
    "name": "Event Run Sheet Builder",
    "category": "Planning & productivity",
    "description": "Create drafts and plans; users remain responsible for execution.",
    "instruction": "Create a noncritical event timeline from the organiser's supplied programme and constraints.",
    "deliverable": "A run sheet with check-in points and contingency slots."
  },
  {
    "id": "dependency-finder",
    "name": "Dependency Finder",
    "category": "Planning & productivity",
    "description": "Create drafts and plans; users remain responsible for execution.",
    "instruction": "Identify prerequisites and blocking tasks in a user-supplied plan.",
    "deliverable": "A dependency map in text with unresolved blockers."
  },
  {
    "id": "handoff-checklist-writer",
    "name": "Handoff Checklist Writer",
    "category": "Planning & productivity",
    "description": "Create drafts and plans; users remain responsible for execution.",
    "instruction": "Turn a defined job into a human-reviewed handoff checklist with clear acceptance criteria.",
    "deliverable": "A handoff checklist and questions for the next owner."
  },
  {
    "id": "routine-simplifier",
    "name": "Routine Simplifier",
    "category": "Planning & productivity",
    "description": "Create drafts and plans; users remain responsible for execution.",
    "instruction": "Identify redundant or unnecessary steps in a user-described routine without assuming consent to changes.",
    "deliverable": "A streamlined routine proposal and reversible test."
  },
  {
    "id": "retrospective-facilitator",
    "name": "Retrospective Facilitator",
    "category": "Planning & productivity",
    "description": "Create drafts and plans; users remain responsible for execution.",
    "instruction": "Prepare prompts to reflect on a completed project using only supplied outcomes.",
    "deliverable": "A retrospective guide with evidence gaps and candidate improvements."
  },
  {
    "id": "contingency-scenario-planner",
    "name": "Contingency Scenario Planner",
    "category": "Planning & productivity",
    "description": "Create drafts and plans; users remain responsible for execution.",
    "instruction": "Generate reasonable fallback scenarios for a low-risk plan based on supplied constraints.",
    "deliverable": "A contingency table with triggers response options and owner decisions."
  },
  {
    "id": "process-map-drafting",
    "name": "Process Map Drafting",
    "category": "Business operations",
    "description": "Support operational documents without changing live business systems.",
    "instruction": "Convert a written business process into a clear step sequence with owners and exception paths.",
    "deliverable": "A textual process map with decision points and ambiguities."
  },
  {
    "id": "sop-first-draft",
    "name": "SOP First Draft",
    "category": "Business operations",
    "description": "Support operational documents without changing live business systems.",
    "instruction": "Draft a standard operating procedure from verified process notes rather than inventing controls.",
    "deliverable": "A structured SOP with prerequisites steps and review checkpoints."
  },
  {
    "id": "kpi-definition-helper",
    "name": "KPI Definition Helper",
    "category": "Business operations",
    "description": "Support operational documents without changing live business systems.",
    "instruction": "Define how to calculate a proposed metric and what data would be required.",
    "deliverable": "A metric definition with numerator denominator units and limitations."
  },
  {
    "id": "business-faq-builder",
    "name": "Business FAQ Builder",
    "category": "Business operations",
    "description": "Support operational documents without changing live business systems.",
    "instruction": "Transform supplied product and policy notes into factual customer FAQs.",
    "deliverable": "A customer FAQ with items requiring policy confirmation."
  },
  {
    "id": "role-responsibility-canvas",
    "name": "Role Responsibility Canvas",
    "category": "Business operations",
    "description": "Support operational documents without changing live business systems.",
    "instruction": "Separate activities decisions and accountability across roles supplied by the user.",
    "deliverable": "A role-responsibility table with unassigned gaps."
  },
  {
    "id": "operations-risk-register",
    "name": "Operations Risk Register",
    "category": "Business operations",
    "description": "Support operational documents without changing live business systems.",
    "instruction": "List plausible operational risks from a described workflow without asserting actual incidents.",
    "deliverable": "A draft risk register with causes signals and possible mitigations."
  },
  {
    "id": "supplier-brief-draft",
    "name": "Supplier Brief Draft",
    "category": "Business operations",
    "description": "Support operational documents without changing live business systems.",
    "instruction": "Convert purchasing requirements into a neutral supplier brief without placing orders.",
    "deliverable": "A supplier requirements document and verification questions."
  },
  {
    "id": "service-blueprint-sketch",
    "name": "Service Blueprint Sketch",
    "category": "Business operations",
    "description": "Support operational documents without changing live business systems.",
    "instruction": "Map front-stage and back-stage actions from a provided service journey.",
    "deliverable": "A service blueprint in text with handoffs and missing evidence."
  },
  {
    "id": "internal-knowledge-article",
    "name": "Internal Knowledge Article",
    "category": "Business operations",
    "description": "Support operational documents without changing live business systems.",
    "instruction": "Turn approved internal notes into a scannable support article without disclosing hidden material.",
    "deliverable": "A knowledge-base draft and source-accuracy checklist."
  },
  {
    "id": "meeting-action-extractor",
    "name": "Meeting Action Extractor",
    "category": "Business operations",
    "description": "Support operational documents without changing live business systems.",
    "instruction": "Extract tasks and explicit owners from provided meeting text without inventing commitments.",
    "deliverable": "An action tracker with due dates only where stated."
  },
  {
    "id": "campaign-brief-composer",
    "name": "Campaign Brief Composer",
    "category": "Marketing & content",
    "description": "Create reviewable copy and plans without posting or fabricating performance.",
    "instruction": "Build a campaign brief from a product offer audience and constraints provided by the user.",
    "deliverable": "A campaign brief with objectives channels messages and open decisions."
  },
  {
    "id": "organic-post-drafts",
    "name": "Organic Post Drafts",
    "category": "Marketing & content",
    "description": "Create reviewable copy and plans without posting or fabricating performance.",
    "instruction": "Draft several truthful non-automatically published social posts from supplied facts.",
    "deliverable": "Five channel-neutral social post drafts with claim checks."
  },
  {
    "id": "content-calendar-outliner",
    "name": "Content Calendar Outliner",
    "category": "Marketing & content",
    "description": "Create reviewable copy and plans without posting or fabricating performance.",
    "instruction": "Organise a set of approved themes into an editorial calendar without claiming scheduled publication.",
    "deliverable": "A content calendar outline with draft topics and review owners."
  },
  {
    "id": "value-proposition-clarifier",
    "name": "Value Proposition Clarifier",
    "category": "Marketing & content",
    "description": "Create reviewable copy and plans without posting or fabricating performance.",
    "instruction": "Rewrite a product's real benefits for a stated audience without manufacturing evidence.",
    "deliverable": "Three value-proposition options and proof points still needed."
  },
  {
    "id": "landing-page-copy-draft",
    "name": "Landing Page Copy Draft",
    "category": "Marketing & content",
    "description": "Create reviewable copy and plans without posting or fabricating performance.",
    "instruction": "Create a structured landing-page copy draft from verified product information.",
    "deliverable": "A page outline with headline copy sections and restrained calls to action."
  },
  {
    "id": "email-newsletter-composer",
    "name": "Email Newsletter Composer",
    "category": "Marketing & content",
    "description": "Create reviewable copy and plans without posting or fabricating performance.",
    "instruction": "Turn supplied updates into an opt-in newsletter draft without sending messages.",
    "deliverable": "A newsletter subject and body with factual-source reminders."
  },
  {
    "id": "audience-question-bank",
    "name": "Audience Question Bank",
    "category": "Marketing & content",
    "description": "Create reviewable copy and plans without posting or fabricating performance.",
    "instruction": "Generate useful questions a team can ask its audience voluntarily without profiling individuals.",
    "deliverable": "A consent-aware audience research questionnaire."
  },
  {
    "id": "brand-voice-guide",
    "name": "Brand Voice Guide",
    "category": "Marketing & content",
    "description": "Create reviewable copy and plans without posting or fabricating performance.",
    "instruction": "Derive a draft style guide from examples and brand requirements provided by the user.",
    "deliverable": "A brand voice guide with do and do-not examples."
  },
  {
    "id": "campaign-postmortem-template",
    "name": "Campaign Postmortem Template",
    "category": "Marketing & content",
    "description": "Create reviewable copy and plans without posting or fabricating performance.",
    "instruction": "Create an evaluation template for real campaign metrics rather than inventing results.",
    "deliverable": "A postmortem structure with measurement requirements and hypotheses."
  },
  {
    "id": "product-description-editor",
    "name": "Product Description Editor",
    "category": "Marketing & content",
    "description": "Create reviewable copy and plans without posting or fabricating performance.",
    "instruction": "Write a clear product listing from supplied specifications without adding unsupported guarantees.",
    "deliverable": "A polished product description and claims-to-verify checklist."
  },
  {
    "id": "support-reply-drafter",
    "name": "Support Reply Drafter",
    "category": "Customer experience",
    "description": "Help prepare service responses; do not contact customers or promise resolutions.",
    "instruction": "Draft an empathetic factual response to a supplied customer inquiry without inventing account facts.",
    "deliverable": "A review-ready customer response and missing information."
  },
  {
    "id": "escalation-summary-builder",
    "name": "Escalation Summary Builder",
    "category": "Customer experience",
    "description": "Help prepare service responses; do not contact customers or promise resolutions.",
    "instruction": "Summarise a user-provided support history for a colleague with observed facts separated from assumptions.",
    "deliverable": "An escalation brief with timeline and unresolved items."
  },
  {
    "id": "troubleshooting-question-tree",
    "name": "Troubleshooting Question Tree",
    "category": "Customer experience",
    "description": "Help prepare service responses; do not contact customers or promise resolutions.",
    "instruction": "Build a safe non-invasive diagnostic question tree for an ordinary consumer software issue.",
    "deliverable": "A decision-tree script with safe stop and escalation points."
  },
  {
    "id": "complaint-theme-grouper",
    "name": "Complaint Theme Grouper",
    "category": "Customer experience",
    "description": "Help prepare service responses; do not contact customers or promise resolutions.",
    "instruction": "Group supplied anonymised complaint examples into recurring themes without counting unseen data.",
    "deliverable": "A labelled theme summary with supporting examples."
  },
  {
    "id": "customer-onboarding-outline",
    "name": "Customer Onboarding Outline",
    "category": "Customer experience",
    "description": "Help prepare service responses; do not contact customers or promise resolutions.",
    "instruction": "Create a sequence of introductory steps for a described product from provided documentation.",
    "deliverable": "A first-use onboarding outline and success checkpoints."
  },
  {
    "id": "help-centre-gap-finder",
    "name": "Help Centre Gap Finder",
    "category": "Customer experience",
    "description": "Help prepare service responses; do not contact customers or promise resolutions.",
    "instruction": "Compare a list of customer questions against supplied help articles and identify coverage gaps.",
    "deliverable": "A prioritised documentation gap report."
  },
  {
    "id": "service-recovery-options",
    "name": "Service Recovery Options",
    "category": "Customer experience",
    "description": "Help prepare service responses; do not contact customers or promise resolutions.",
    "instruction": "Draft proportionate response options to a described service failure without promising refunds.",
    "deliverable": "Response options requiring business approval."
  },
  {
    "id": "feedback-survey-designer",
    "name": "Feedback Survey Designer",
    "category": "Customer experience",
    "description": "Help prepare service responses; do not contact customers or promise resolutions.",
    "instruction": "Develop neutral voluntary questions about a specific product experience.",
    "deliverable": "A short survey with neutral wording and consent note."
  },
  {
    "id": "faq-answer-consistency-check",
    "name": "FAQ Answer Consistency Check",
    "category": "Customer experience",
    "description": "Help prepare service responses; do not contact customers or promise resolutions.",
    "instruction": "Compare supplied FAQ entries and flag contradictory or ambiguous answers.",
    "deliverable": "A consistency report with proposed clarifications."
  },
  {
    "id": "accessibility-feedback-triage",
    "name": "Accessibility Feedback Triage",
    "category": "Customer experience",
    "description": "Help prepare service responses; do not contact customers or promise resolutions.",
    "instruction": "Organise accessibility feedback volunteered by users into themes without certifying compliance.",
    "deliverable": "An issues summary with questions for affected users and specialists."
  },
  {
    "id": "source-comparison-grid",
    "name": "Source Comparison Grid",
    "category": "Research & synthesis",
    "description": "Analyse supplied material; clearly separate known facts from gaps.",
    "instruction": "Compare two or more supplied sources while preserving attribution and differences.",
    "deliverable": "A source comparison grid with conflicting claims flagged."
  },
  {
    "id": "evidence-gap-inventory",
    "name": "Evidence Gap Inventory",
    "category": "Research & synthesis",
    "description": "Analyse supplied material; clearly separate known facts from gaps.",
    "instruction": "Identify which assertions in supplied text lack enough support from the supplied evidence.",
    "deliverable": "A claim-by-claim evidence gap inventory."
  },
  {
    "id": "research-question-refiner",
    "name": "Research Question Refiner",
    "category": "Research & synthesis",
    "description": "Analyse supplied material; clearly separate known facts from gaps.",
    "instruction": "Turn a broad non-sensitive topic into answerable research questions and a feasible approach.",
    "deliverable": "A focused research question set and search or interview plan."
  },
  {
    "id": "interview-theme-synthesiser",
    "name": "Interview Theme Synthesiser",
    "category": "Research & synthesis",
    "description": "Analyse supplied material; clearly separate known facts from gaps.",
    "instruction": "Summarise anonymised interview notes into themes without fabricating participant quotations.",
    "deliverable": "A theme report with representative supplied evidence."
  },
  {
    "id": "literature-note-organiser",
    "name": "Literature Note Organiser",
    "category": "Research & synthesis",
    "description": "Analyse supplied material; clearly separate known facts from gaps.",
    "instruction": "Structure user-provided article notes by question method results and limitations.",
    "deliverable": "An annotated research-note matrix."
  },
  {
    "id": "argument-structure-mapper",
    "name": "Argument Structure Mapper",
    "category": "Research & synthesis",
    "description": "Analyse supplied material; clearly separate known facts from gaps.",
    "instruction": "Extract premises conclusions and unstated assumptions from supplied argument text.",
    "deliverable": "An argument map in prose with ambiguity flagged."
  },
  {
    "id": "hypothesis-generator",
    "name": "Hypothesis Generator",
    "category": "Research & synthesis",
    "description": "Analyse supplied material; clearly separate known facts from gaps.",
    "instruction": "Propose testable hypotheses for a supplied low-risk research question without claiming they are true.",
    "deliverable": "A hypothesis list with observable measures and falsification criteria."
  },
  {
    "id": "claim-qualification-editor",
    "name": "Claim Qualification Editor",
    "category": "Research & synthesis",
    "description": "Analyse supplied material; clearly separate known facts from gaps.",
    "instruction": "Rephrase overconfident statements to match the strength and scope of supplied evidence.",
    "deliverable": "A calibrated claim set with supporting evidence gaps."
  },
  {
    "id": "reference-list-formatter",
    "name": "Reference List Formatter",
    "category": "Research & synthesis",
    "description": "Analyse supplied material; clearly separate known facts from gaps.",
    "instruction": "Format user-supplied bibliographic details consistently without inventing missing metadata.",
    "deliverable": "A reference list and entries needing verification."
  },
  {
    "id": "qualitative-codebook-draft",
    "name": "Qualitative Codebook Draft",
    "category": "Research & synthesis",
    "description": "Analyse supplied material; clearly separate known facts from gaps.",
    "instruction": "Draft descriptive coding categories for supplied anonymised text excerpts.",
    "deliverable": "A provisional codebook with definitions and overlap rules."
  },
  {
    "id": "user-story-writer",
    "name": "User Story Writer",
    "category": "Product & UX",
    "description": "Prepare product-design artefacts from authentic user and product context.",
    "instruction": "Convert supplied real user goals into user stories with bounded acceptance criteria.",
    "deliverable": "User stories and testable acceptance criteria."
  },
  {
    "id": "feature-scope-splitter",
    "name": "Feature Scope Splitter",
    "category": "Product & UX",
    "description": "Prepare product-design artefacts from authentic user and product context.",
    "instruction": "Break an oversized feature request into incremental slices and dependencies.",
    "deliverable": "A feature slicing proposal with explicit out-of-scope work."
  },
  {
    "id": "ux-copy-reviewer",
    "name": "UX Copy Reviewer",
    "category": "Product & UX",
    "description": "Prepare product-design artefacts from authentic user and product context.",
    "instruction": "Review user-supplied interface text for clarity consistency and misleading claims.",
    "deliverable": "Revised interface microcopy with change reasons."
  },
  {
    "id": "empty-state-copy-maker",
    "name": "Empty State Copy Maker",
    "category": "Product & UX",
    "description": "Prepare product-design artefacts from authentic user and product context.",
    "instruction": "Design honest next-step messaging for an empty application state without fake data.",
    "deliverable": "Several empty-state text variants with intended actions."
  },
  {
    "id": "error-message-improver",
    "name": "Error Message Improver",
    "category": "Product & UX",
    "description": "Prepare product-design artefacts from authentic user and product context.",
    "instruction": "Turn a provided technical error into a clear actionable user message without promising unimplemented fixes.",
    "deliverable": "A user-facing error message and developer diagnostic note."
  },
  {
    "id": "product-requirement-draft",
    "name": "Product Requirement Draft",
    "category": "Product & UX",
    "description": "Prepare product-design artefacts from authentic user and product context.",
    "instruction": "Translate a user-provided problem into a structured product requirements draft.",
    "deliverable": "Requirements with non-goals dependencies and open questions."
  },
  {
    "id": "usability-test-script",
    "name": "Usability Test Script",
    "category": "Product & UX",
    "description": "Prepare product-design artefacts from authentic user and product context.",
    "instruction": "Create a low-risk voluntary usability study script for an existing interface.",
    "deliverable": "A test script with neutral tasks consent and observation guide."
  },
  {
    "id": "feature-tradeoff-review",
    "name": "Feature Tradeoff Review",
    "category": "Product & UX",
    "description": "Prepare product-design artefacts from authentic user and product context.",
    "instruction": "Present impacts and uncertainties of proposed features against user-specified constraints.",
    "deliverable": "A feature tradeoff grid without invented market data."
  },
  {
    "id": "journey-map-writer",
    "name": "Journey Map Writer",
    "category": "Product & UX",
    "description": "Prepare product-design artefacts from authentic user and product context.",
    "instruction": "Transform supplied firsthand touchpoint notes into a user-journey narrative.",
    "deliverable": "A stage-by-stage journey map with evidence gaps."
  },
  {
    "id": "release-notes-composer",
    "name": "Release Notes Composer",
    "category": "Product & UX",
    "description": "Prepare product-design artefacts from authentic user and product context.",
    "instruction": "Turn a verified change list into user-facing release notes without claiming undeployed features.",
    "deliverable": "A release-notes draft with known limits and dates left unfilled unless given."
  },
  {
    "id": "function-explanation",
    "name": "Function Explanation",
    "category": "Developer assistance",
    "description": "Generate reviewable code and technical guidance; no execution or deployment.",
    "instruction": "Explain an input code function step by step with assumptions about its language and context.",
    "deliverable": "A walkthrough of inputs outputs side effects and risks."
  },
  {
    "id": "unit-test-case-designer",
    "name": "Unit Test Case Designer",
    "category": "Developer assistance",
    "description": "Generate reviewable code and technical guidance; no execution or deployment.",
    "instruction": "Derive boundary success and error tests from supplied function behaviour.",
    "deliverable": "A proposed test matrix and example cases."
  },
  {
    "id": "regex-builder",
    "name": "Regex Builder",
    "category": "Developer assistance",
    "description": "Generate reviewable code and technical guidance; no execution or deployment.",
    "instruction": "Draft a regex for supplied examples and show likely edge cases.",
    "deliverable": "A regular expression with explanations and example matches."
  },
  {
    "id": "sql-query-reviewer",
    "name": "SQL Query Reviewer",
    "category": "Developer assistance",
    "description": "Generate reviewable code and technical guidance; no execution or deployment.",
    "instruction": "Review a supplied SQL query for logic safety and performance risks without executing it.",
    "deliverable": "A review report with a revised non-destructive query suggestion."
  },
  {
    "id": "api-contract-drafter",
    "name": "API Contract Drafter",
    "category": "Developer assistance",
    "description": "Generate reviewable code and technical guidance; no execution or deployment.",
    "instruction": "Turn endpoint requirements into a proposed request response and error contract.",
    "deliverable": "An API contract draft with auth and validation questions."
  },
  {
    "id": "bug-reproduction-writer",
    "name": "Bug Reproduction Writer",
    "category": "Developer assistance",
    "description": "Generate reviewable code and technical guidance; no execution or deployment.",
    "instruction": "Convert a user-described software failure into clear reproducible steps without inventing observations.",
    "deliverable": "A bug report with expected actual and missing evidence."
  },
  {
    "id": "code-review-checklist",
    "name": "Code Review Checklist",
    "category": "Developer assistance",
    "description": "Generate reviewable code and technical guidance; no execution or deployment.",
    "instruction": "Create a change-specific code review checklist from a diff description or snippet.",
    "deliverable": "A review checklist for correctness tests performance and security."
  },
  {
    "id": "log-explanation-assistant",
    "name": "Log Explanation Assistant",
    "category": "Developer assistance",
    "description": "Generate reviewable code and technical guidance; no execution or deployment.",
    "instruction": "Explain supplied sanitised application log messages without assuming hidden runtime state.",
    "deliverable": "A likely-cause map and safe diagnostic next steps."
  },
  {
    "id": "refactor-plan-builder",
    "name": "Refactor Plan Builder",
    "category": "Developer assistance",
    "description": "Generate reviewable code and technical guidance; no execution or deployment.",
    "instruction": "Outline a small behaviour-preserving refactor for a supplied code excerpt.",
    "deliverable": "A staged refactor plan with regression tests."
  },
  {
    "id": "technical-documentation-draft",
    "name": "Technical Documentation Draft",
    "category": "Developer assistance",
    "description": "Generate reviewable code and technical guidance; no execution or deployment.",
    "instruction": "Generate developer documentation from supplied API or module behaviour.",
    "deliverable": "A documentation draft with examples and unknowns."
  },
  {
    "id": "data-dictionary-creator",
    "name": "Data Dictionary Creator",
    "category": "Data & analysis",
    "description": "Work from user-provided numbers and structures; never invent results.",
    "instruction": "Describe supplied dataset fields and expected types with unknowns clearly marked.",
    "deliverable": "A data dictionary and validation questions."
  },
  {
    "id": "csv-cleanup-plan",
    "name": "CSV Cleanup Plan",
    "category": "Data & analysis",
    "description": "Work from user-provided numbers and structures; never invent results.",
    "instruction": "Suggest safe transformations for a supplied CSV sample without claiming to have processed unseen rows.",
    "deliverable": "A cleanup recipe with before-after examples."
  },
  {
    "id": "chart-selection-coach",
    "name": "Chart Selection Coach",
    "category": "Data & analysis",
    "description": "Work from user-provided numbers and structures; never invent results.",
    "instruction": "Select useful chart types from stated analytical questions and available fields.",
    "deliverable": "Chart recommendations with tradeoffs and required fields."
  },
  {
    "id": "survey-response-theme-map",
    "name": "Survey Response Theme Map",
    "category": "Data & analysis",
    "description": "Work from user-provided numbers and structures; never invent results.",
    "instruction": "Group anonymised free-text answers by meaning without inferring respondent identities.",
    "deliverable": "A tentative theme map with verbatim short supplied examples."
  },
  {
    "id": "metric-anomaly-questions",
    "name": "Metric Anomaly Questions",
    "category": "Data & analysis",
    "description": "Work from user-provided numbers and structures; never invent results.",
    "instruction": "Generate investigation questions for a user-described unusual metric change without inventing causes.",
    "deliverable": "A diagnostic question checklist and data needed."
  },
  {
    "id": "data-validation-rule-writer",
    "name": "Data Validation Rule Writer",
    "category": "Data & analysis",
    "description": "Work from user-provided numbers and structures; never invent results.",
    "instruction": "Draft precise validation rules for a supplied data-entry schema.",
    "deliverable": "A validation specification with acceptable and rejected examples."
  },
  {
    "id": "a-b-result-interpretation",
    "name": "A-B Result Interpretation",
    "category": "Data & analysis",
    "description": "Work from user-provided numbers and structures; never invent results.",
    "instruction": "Explain a supplied experiment summary and uncertainty without manufacturing statistical significance.",
    "deliverable": "A cautious interpretation and missing-measurements list."
  },
  {
    "id": "spreadsheet-formula-helper",
    "name": "Spreadsheet Formula Helper",
    "category": "Data & analysis",
    "description": "Work from user-provided numbers and structures; never invent results.",
    "instruction": "Write a formula for a described spreadsheet layout and explain assumptions.",
    "deliverable": "A formula with field mapping and example calculation."
  },
  {
    "id": "sql-result-narrator",
    "name": "SQL Result Narrator",
    "category": "Data & analysis",
    "description": "Work from user-provided numbers and structures; never invent results.",
    "instruction": "Summarise supplied query results in plain language without extrapolating beyond their population.",
    "deliverable": "A result narrative with caveats and suggested follow-ups."
  },
  {
    "id": "dashboard-question-planner",
    "name": "Dashboard Question Planner",
    "category": "Data & analysis",
    "description": "Work from user-provided numbers and structures; never invent results.",
    "instruction": "Match business questions to possible dashboards using only specified data availability.",
    "deliverable": "A dashboard outline with measures filters and limitations."
  },
  {
    "id": "character-profile-writer",
    "name": "Character Profile Writer",
    "category": "Creative studio",
    "description": "Generate original text concepts and production plans; not rendered media.",
    "instruction": "Develop a fictional character from a supplied creative brief with motivations and contradictions.",
    "deliverable": "A character profile with arc seeds and boundaries."
  },
  {
    "id": "scene-beat-outliner",
    "name": "Scene Beat Outliner",
    "category": "Creative studio",
    "description": "Generate original text concepts and production plans; not rendered media.",
    "instruction": "Break a fictional scene premise into beats that advance character and conflict.",
    "deliverable": "A numbered scene-beat plan."
  },
  {
    "id": "dialogue-variant-studio",
    "name": "Dialogue Variant Studio",
    "category": "Creative studio",
    "description": "Generate original text concepts and production plans; not rendered media.",
    "instruction": "Produce distinct dialogue options for fictional characters in a specified setting.",
    "deliverable": "Three dialogue variants and the intention behind each."
  },
  {
    "id": "worldbuilding-consistency-check",
    "name": "Worldbuilding Consistency Check",
    "category": "Creative studio",
    "description": "Generate original text concepts and production plans; not rendered media.",
    "instruction": "Review supplied fictional world rules for contradictions and unanswered questions.",
    "deliverable": "A consistency report with possible fixes."
  },
  {
    "id": "short-story-plot-architect",
    "name": "Short Story Plot Architect",
    "category": "Creative studio",
    "description": "Generate original text concepts and production plans; not rendered media.",
    "instruction": "Turn a fictional premise into a compact coherent short-story outline.",
    "deliverable": "A beginning middle ending structure and thematic thread."
  },
  {
    "id": "video-storyboard-text-planner",
    "name": "Video Storyboard Text Planner",
    "category": "Creative studio",
    "description": "Generate original text concepts and production plans; not rendered media.",
    "instruction": "Describe non-rendered storyboard frames for an original safe video brief.",
    "deliverable": "A shot-by-shot text storyboard with timing estimates labelled provisional."
  },
  {
    "id": "podcast-segment-planner",
    "name": "Podcast Segment Planner",
    "category": "Creative studio",
    "description": "Generate original text concepts and production plans; not rendered media.",
    "instruction": "Organise a supplied podcast topic into segments questions and transitions.",
    "deliverable": "A production-ready outline for human review, not recorded audio."
  },
  {
    "id": "game-quest-designer",
    "name": "Game Quest Designer",
    "category": "Creative studio",
    "description": "Generate original text concepts and production plans; not rendered media.",
    "instruction": "Draft a self-contained fictional quest with goals tradeoffs and completion conditions.",
    "deliverable": "A quest design sheet without playable code."
  },
  {
    "id": "visual-moodboard-describer",
    "name": "Visual Moodboard Describer",
    "category": "Creative studio",
    "description": "Generate original text concepts and production plans; not rendered media.",
    "instruction": "Translate a creative brief into written visual directions without claiming images were generated.",
    "deliverable": "A text moodboard with palette materials and references to seek."
  },
  {
    "id": "narrative-pacing-reviewer",
    "name": "Narrative Pacing Reviewer",
    "category": "Creative studio",
    "description": "Generate original text concepts and production plans; not rendered media.",
    "instruction": "Review a supplied fiction outline for pacing tension and redundant beats.",
    "deliverable": "A pacing diagnosis and alternative beat order."
  },
  {
    "id": "cv-bullet-refiner",
    "name": "CV Bullet Refiner",
    "category": "Career & work",
    "description": "Support self-directed professional documents without submitting applications.",
    "instruction": "Rewrite supplied genuine experience bullets into concise outcome-oriented statements without inventing achievements.",
    "deliverable": "CV bullet alternatives and proof gaps."
  },
  {
    "id": "cover-letter-draft",
    "name": "Cover Letter Draft",
    "category": "Career & work",
    "description": "Support self-directed professional documents without submitting applications.",
    "instruction": "Write a truthful cover letter from user-provided experience and a pasted role description.",
    "deliverable": "A cover letter draft with details to confirm."
  },
  {
    "id": "interview-practice-questions",
    "name": "Interview Practice Questions",
    "category": "Career & work",
    "description": "Support self-directed professional documents without submitting applications.",
    "instruction": "Generate role-relevant interview questions from a pasted job brief without claiming a real interview.",
    "deliverable": "A practice question set and preparation tips."
  },
  {
    "id": "star-example-coach",
    "name": "STAR Example Coach",
    "category": "Career & work",
    "description": "Support self-directed professional documents without submitting applications.",
    "instruction": "Structure a user-provided genuine achievement into situation task action and result.",
    "deliverable": "A STAR story using only supported details."
  },
  {
    "id": "portfolio-case-study-outline",
    "name": "Portfolio Case Study Outline",
    "category": "Career & work",
    "description": "Support self-directed professional documents without submitting applications.",
    "instruction": "Turn a completed project description into an honest portfolio case-study structure.",
    "deliverable": "A case-study outline with evidence and artefacts needed."
  },
  {
    "id": "professional-bio-editor",
    "name": "Professional Bio Editor",
    "category": "Career & work",
    "description": "Support self-directed professional documents without submitting applications.",
    "instruction": "Write concise bios at different lengths from supplied professional facts.",
    "deliverable": "Three biography lengths without invented titles."
  },
  {
    "id": "meeting-talking-points",
    "name": "Meeting Talking Points",
    "category": "Career & work",
    "description": "Support self-directed professional documents without submitting applications.",
    "instruction": "Turn a user-supplied agenda into clear talking points and optional questions.",
    "deliverable": "A concise speaking notes sheet."
  },
  {
    "id": "networking-intro-draft",
    "name": "Networking Intro Draft",
    "category": "Career & work",
    "description": "Support self-directed professional documents without submitting applications.",
    "instruction": "Prepare a respectful non-automatically sent introduction based on real shared context.",
    "deliverable": "Two draft introduction messages with a consent-aware call to action."
  },
  {
    "id": "skills-gap-self-assessment",
    "name": "Skills Gap Self-Assessment",
    "category": "Career & work",
    "description": "Support self-directed professional documents without submitting applications.",
    "instruction": "Compare user-provided skills against a role's documented requirements without scoring personal competence.",
    "deliverable": "A skills evidence matrix and possible learning topics."
  },
  {
    "id": "performance-reflection-coach",
    "name": "Performance Reflection Coach",
    "category": "Career & work",
    "description": "Support self-directed professional documents without submitting applications.",
    "instruction": "Help structure a self-reflection from the user's own outcomes and challenges without inventing feedback.",
    "deliverable": "A balanced review draft with evidence and next steps."
  },
  {
    "id": "packing-checklist-composer",
    "name": "Packing Checklist Composer",
    "category": "Personal organisation",
    "description": "Create personal plans and checklists; no connected account actions.",
    "instruction": "Create a tailored packing checklist from a user-provided trip type duration and conditions.",
    "deliverable": "A packing list grouped by use with personal checks."
  },
  {
    "id": "home-inventory-template",
    "name": "Home Inventory Template",
    "category": "Personal organisation",
    "description": "Create personal plans and checklists; no connected account actions.",
    "instruction": "Design a non-sensitive inventory template without storing serial numbers or private addresses.",
    "deliverable": "A category-based inventory worksheet template."
  },
  {
    "id": "meal-idea-planner",
    "name": "Meal Idea Planner",
    "category": "Personal organisation",
    "description": "Create personal plans and checklists; no connected account actions.",
    "instruction": "Suggest general food ideas from user-stated preferences without making medical or allergy-safety guarantees.",
    "deliverable": "A flexible meal-idea plan and ingredients to verify."
  },
  {
    "id": "household-chore-split-draft",
    "name": "Household Chore Split Draft",
    "category": "Personal organisation",
    "description": "Create personal plans and checklists; no connected account actions.",
    "instruction": "Create a proposed voluntary chore schedule without committing other people's time.",
    "deliverable": "A chore discussion draft with open assignments."
  },
  {
    "id": "gift-idea-brainstormer",
    "name": "Gift Idea Brainstormer",
    "category": "Personal organisation",
    "description": "Create personal plans and checklists; no connected account actions.",
    "instruction": "Generate gift concepts from an explicitly supplied budget and recipient preferences without buying items.",
    "deliverable": "A shortlist of ideas and consent or fit questions."
  },
  {
    "id": "reading-queue-curator",
    "name": "Reading Queue Curator",
    "category": "Personal organisation",
    "description": "Create personal plans and checklists; no connected account actions.",
    "instruction": "Arrange user-supplied books or articles into a learning-oriented reading order.",
    "deliverable": "An annotated reading sequence and flexible checkpoints."
  },
  {
    "id": "personal-project-starter",
    "name": "Personal Project Starter",
    "category": "Personal organisation",
    "description": "Create personal plans and checklists; no connected account actions.",
    "instruction": "Turn a hobby idea into small non-hazardous starter tasks and a realistic first session.",
    "deliverable": "A starter plan with materials the user must verify."
  },
  {
    "id": "subscription-review-checklist",
    "name": "Subscription Review Checklist",
    "category": "Personal organisation",
    "description": "Create personal plans and checklists; no connected account actions.",
    "instruction": "Help review user-listed subscriptions for overlap without claiming access or cancelling anything.",
    "deliverable": "A review table with value questions and user action steps."
  },
  {
    "id": "moving-preparation-outline",
    "name": "Moving Preparation Outline",
    "category": "Personal organisation",
    "description": "Create personal plans and checklists; no connected account actions.",
    "instruction": "Create a staged moving checklist from user-provided constraints without booking services.",
    "deliverable": "A relocation preparation outline and information gaps."
  },
  {
    "id": "calendar-conflict-explainer",
    "name": "Calendar Conflict Explainer",
    "category": "Personal organisation",
    "description": "Create personal plans and checklists; no connected account actions.",
    "instruction": "Spot conflicting times in user-pasted schedule entries without accessing a live calendar.",
    "deliverable": "A conflict report with choices to confirm manually."
  },
  {
    "id": "difficult-conversation-planner",
    "name": "Difficult Conversation Planner",
    "category": "Communication",
    "description": "Draft messages users review and send themselves.",
    "instruction": "Help prepare a respectful non-coercive conversation using user-provided concerns.",
    "deliverable": "A conversation plan with opening questions and boundaries."
  },
  {
    "id": "feedback-message-drafter",
    "name": "Feedback Message Drafter",
    "category": "Communication",
    "description": "Draft messages users review and send themselves.",
    "instruction": "Turn specific observations into constructive feedback without judging someone's motives.",
    "deliverable": "A review-ready feedback message and factual checks."
  },
  {
    "id": "apology-draft-helper",
    "name": "Apology Draft Helper",
    "category": "Communication",
    "description": "Draft messages users review and send themselves.",
    "instruction": "Draft an accountable apology from supplied facts without pressuring another person to forgive.",
    "deliverable": "A sincere apology draft that avoids invented admissions."
  },
  {
    "id": "boundary-setting-script",
    "name": "Boundary Setting Script",
    "category": "Communication",
    "description": "Draft messages users review and send themselves.",
    "instruction": "Help articulate a personal boundary without threats surveillance or manipulation.",
    "deliverable": "A short script and alternatives for safely ending a conversation."
  },
  {
    "id": "team-update-writer",
    "name": "Team Update Writer",
    "category": "Communication",
    "description": "Draft messages users review and send themselves.",
    "instruction": "Turn supplied project facts into an accurate internal status update without inventing progress.",
    "deliverable": "A concise update with achievements blockers and asks."
  },
  {
    "id": "invitation-message-builder",
    "name": "Invitation Message Builder",
    "category": "Communication",
    "description": "Draft messages users review and send themselves.",
    "instruction": "Create a voluntary invitation with clear time place and an easy way to decline.",
    "deliverable": "An invitation draft with missing logistics flagged."
  },
  {
    "id": "thank-you-note-composer",
    "name": "Thank You Note Composer",
    "category": "Communication",
    "description": "Draft messages users review and send themselves.",
    "instruction": "Write a personalised thank-you note from user-provided authentic reasons.",
    "deliverable": "A short message with natural specificity."
  },
  {
    "id": "clarifying-question-designer",
    "name": "Clarifying Question Designer",
    "category": "Communication",
    "description": "Draft messages users review and send themselves.",
    "instruction": "Identify respectful questions to resolve ambiguity in an ordinary conversation.",
    "deliverable": "A list of neutral clarifying questions."
  },
  {
    "id": "conflict-summary-neutraliser",
    "name": "Conflict Summary Neutraliser",
    "category": "Communication",
    "description": "Draft messages users review and send themselves.",
    "instruction": "Rewrite a supplied dispute summary into observable facts and attributed viewpoints.",
    "deliverable": "A neutral summary with contested points marked."
  },
  {
    "id": "follow-up-email-planner",
    "name": "Follow-up Email Planner",
    "category": "Communication",
    "description": "Draft messages users review and send themselves.",
    "instruction": "Draft a non-sent follow-up email using only explicitly agreed next steps.",
    "deliverable": "A professional follow-up with ownership and deadlines unclaimed if absent."
  },
  {
    "id": "plain-language-form-editor",
    "name": "Plain Language Form Editor",
    "category": "Accessibility & inclusion",
    "description": "Draft accessibility-friendly text; not independent accessibility certification.",
    "instruction": "Rewrite a user-provided form prompt using short direct sentences without changing legal meaning silently.",
    "deliverable": "A plain-language draft and terms requiring owner review."
  },
  {
    "id": "alt-text-drafting",
    "name": "Alt Text Drafting",
    "category": "Accessibility & inclusion",
    "description": "Draft accessibility-friendly text; not independent accessibility certification.",
    "instruction": "Draft alt text from a user's own description of a visual without pretending to have seen the image.",
    "deliverable": "Alt text candidates and visual details that must be confirmed."
  },
  {
    "id": "accessible-error-copy",
    "name": "Accessible Error Copy",
    "category": "Accessibility & inclusion",
    "description": "Draft accessibility-friendly text; not independent accessibility certification.",
    "instruction": "Revise a supplied error message to say what happened and how to recover in plain language.",
    "deliverable": "Accessible text-only error copy with missing steps."
  },
  {
    "id": "inclusive-event-invitation",
    "name": "Inclusive Event Invitation",
    "category": "Accessibility & inclusion",
    "description": "Draft accessibility-friendly text; not independent accessibility certification.",
    "instruction": "Draft an event invitation that offers accommodation contact options without assuming anyone's needs.",
    "deliverable": "An inclusive invitation draft and organiser confirmation checklist."
  },
  {
    "id": "reading-order-review",
    "name": "Reading Order Review",
    "category": "Accessibility & inclusion",
    "description": "Draft accessibility-friendly text; not independent accessibility certification.",
    "instruction": "Analyse a user-supplied description of page elements for a logical reading sequence.",
    "deliverable": "A proposed heading and reading order with testing caveats."
  },
  {
    "id": "caption-cleanup-assistant",
    "name": "Caption Cleanup Assistant",
    "category": "Accessibility & inclusion",
    "description": "Draft accessibility-friendly text; not independent accessibility certification.",
    "instruction": "Edit a supplied transcript or caption file excerpt for clarity without inventing unheard speech.",
    "deliverable": "Cleaned caption text and items needing audio verification."
  },
  {
    "id": "accessible-terminology-checker",
    "name": "Accessible Terminology Checker",
    "category": "Accessibility & inclusion",
    "description": "Draft accessibility-friendly text; not independent accessibility certification.",
    "instruction": "Review supplied public text for unnecessary jargon and potentially exclusionary wording.",
    "deliverable": "A wording improvement report with context-based alternatives."
  },
  {
    "id": "form-field-help-text",
    "name": "Form Field Help Text",
    "category": "Accessibility & inclusion",
    "description": "Draft accessibility-friendly text; not independent accessibility certification.",
    "instruction": "Write helpful short instructions for specified form fields without collecting sensitive values.",
    "deliverable": "Field-by-field guidance and privacy prompts."
  },
  {
    "id": "multiple-format-instructions",
    "name": "Multiple-Format Instructions",
    "category": "Accessibility & inclusion",
    "description": "Draft accessibility-friendly text; not independent accessibility certification.",
    "instruction": "Rewrite a supplied instruction so it works as clear written steps without relying on colour or position alone.",
    "deliverable": "An alternate text instruction version and user-testing questions."
  },
  {
    "id": "accessibility-review-questions",
    "name": "Accessibility Review Questions",
    "category": "Accessibility & inclusion",
    "description": "Draft accessibility-friendly text; not independent accessibility certification.",
    "instruction": "Generate user-centred questions for an existing interface without claiming compliance with regulations.",
    "deliverable": "A voluntary usability interview guide and expert-review topics."
  },
  {
    "id": "assumption-ledger-generator",
    "name": "Assumption Ledger Generator",
    "category": "Quality & critical thinking",
    "description": "Check claims, reason about uncertainty and prepare review artefacts.",
    "instruction": "List hidden and explicit assumptions in a proposed plan with ways to test each safely.",
    "deliverable": "An assumption ledger with impact and validation method."
  },
  {
    "id": "acceptance-criteria-auditor",
    "name": "Acceptance Criteria Auditor",
    "category": "Quality & critical thinking",
    "description": "Check claims, reason about uncertainty and prepare review artefacts.",
    "instruction": "Check supplied acceptance criteria for ambiguity missing negatives and untestable wording.",
    "deliverable": "A revised acceptance-criteria set and open questions."
  },
  {
    "id": "counterexample-finder",
    "name": "Counterexample Finder",
    "category": "Quality & critical thinking",
    "description": "Check claims, reason about uncertainty and prepare review artefacts.",
    "instruction": "Search for plausible conceptual counterexamples to a user's general claim without asserting factual incidents.",
    "deliverable": "A counterexample set showing limits of the claim."
  },
  {
    "id": "failure-mode-brainstormer",
    "name": "Failure Mode Brainstormer",
    "category": "Quality & critical thinking",
    "description": "Check claims, reason about uncertainty and prepare review artefacts.",
    "instruction": "List plausible failures for a low-risk described workflow and suggest preventive checkpoints.",
    "deliverable": "A provisional failure-mode table with unknowns."
  },
  {
    "id": "contradiction-detector",
    "name": "Contradiction Detector",
    "category": "Quality & critical thinking",
    "description": "Check claims, reason about uncertainty and prepare review artefacts.",
    "instruction": "Compare user-provided statements for internal contradictions without inventing external evidence.",
    "deliverable": "A contradiction report with relevant quoted snippets."
  },
  {
    "id": "test-coverage-gap-mapper",
    "name": "Test Coverage Gap Mapper",
    "category": "Quality & critical thinking",
    "description": "Check claims, reason about uncertainty and prepare review artefacts.",
    "instruction": "Compare stated requirements with listed tests to identify untested paths.",
    "deliverable": "A requirement-to-test coverage map with missing cases."
  },
  {
    "id": "claim-provenance-checklist",
    "name": "Claim Provenance Checklist",
    "category": "Quality & critical thinking",
    "description": "Check claims, reason about uncertainty and prepare review artefacts.",
    "instruction": "Identify what documentation would be needed to substantiate each claim in supplied copy.",
    "deliverable": "A claim-by-claim provenance checklist."
  },
  {
    "id": "risk-communication-editor",
    "name": "Risk Communication Editor",
    "category": "Quality & critical thinking",
    "description": "Check claims, reason about uncertainty and prepare review artefacts.",
    "instruction": "Rewrite a supplied caution note to communicate uncertainty clearly without minimising material risks.",
    "deliverable": "A revised caution note and ambiguity review."
  },
  {
    "id": "decision-rationale-recorder",
    "name": "Decision Rationale Recorder",
    "category": "Quality & critical thinking",
    "description": "Check claims, reason about uncertainty and prepare review artefacts.",
    "instruction": "Organise the user's chosen option and supplied reasoning without selecting an option for them.",
    "deliverable": "A decision log with criteria alternatives and review trigger."
  },
  {
    "id": "preflight-review-builder",
    "name": "Preflight Review Builder",
    "category": "Quality & critical thinking",
    "description": "Check claims, reason about uncertainty and prepare review artefacts.",
    "instruction": "Create a nonexecuting preflight checklist for a low-risk planned release or publication.",
    "deliverable": "A verification checklist with evidence and sign-off fields."
  }
];

export function validateAiWorkbenchTools(tools: readonly AiWorkbenchTool[] = AI_WORKBENCH_TOOLS): boolean {
  if (tools.length !== 160) return false;
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const tool of tools) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tool.id) || ids.has(tool.id) || names.has(tool.name)) return false;
    ids.add(tool.id); names.add(tool.name);
    if (!tool.name.trim() || !tool.category.trim() || !tool.description.trim() || !tool.instruction.trim() || !tool.deliverable.trim()) return false;
    if (!AI_WORKBENCH_CATEGORIES.some((category) => category === tool.category)) return false;
  }
  return true;
}
