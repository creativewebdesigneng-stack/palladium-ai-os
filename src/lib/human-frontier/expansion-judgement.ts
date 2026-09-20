import type { HumanTool } from './registry';
/** 25 human-owned judgment and safety checkpoints; never approvals for agent execution. */
export const FRONTIER_JUDGEMENT_25: readonly HumanTool[] = [
  {
    "id": "permission-before-publish",
    "name": "Permission Before Publish",
    "category": "Judgement & safety",
    "purpose": "Create a genuine checkpoint before publishing information about another person.",
    "humanAction": "Ask the relevant person directly whether the specific material may be shared.",
    "fields": [
      {
        "label": "Material and intended audience without private data",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "Permission actually given or withheld",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "What I will omit, publish or defer",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I identified whose information is involved.",
      "I sought specific permission.",
      "I did not infer consent from silence."
    ],
    "output": "A human-owned permission before publish decision note"
  },
  {
    "id": "undo-path-rehearsal",
    "name": "Undo Path Rehearsal",
    "category": "Judgement & safety",
    "purpose": "Check whether a proposed noncritical physical change can truly be undone before making it.",
    "humanAction": "Rehearse restoring a harmless reversible change in an authorised space.",
    "fields": [
      {
        "label": "Proposed change and baseline",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "What happened during a safe reversal trial",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "Restoration step I can actually perform",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I chose a low-risk reversible trial.",
      "I tested the reset myself.",
      "I did not assume irreversible actions have an undo."
    ],
    "output": "A human-owned undo path rehearsal decision note"
  },
  {
    "id": "unknown-information-stop",
    "name": "Unknown Information Stop",
    "category": "Judgement & safety",
    "purpose": "Notice a decision that depends on an unresolved fact rather than allowing AI to fill the gap.",
    "humanAction": "Personally identify the missing evidence and pause the nonurgent choice.",
    "fields": [
      {
        "label": "Proposed decision",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "Fact I cannot yet verify",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "Source or person I can consult appropriately",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I marked unknowns clearly.",
      "I refrained from inventing evidence.",
      "I deferred any unsafe action until verified."
    ],
    "output": "A human-owned unknown information stop decision note"
  },
  {
    "id": "authority-boundary-card",
    "name": "Authority Boundary Card",
    "category": "Judgement & safety",
    "purpose": "Check whether you have the authority to make an important change affecting a shared resource.",
    "humanAction": "Ask the actual owner or responsible person about the proposed change.",
    "fields": [
      {
        "label": "Resource and action under consideration",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "What authority was actually confirmed",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "Action I may take or must defer",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I identified the relevant decision maker.",
      "I sought permission through an appropriate channel.",
      "I did not treat access as authority."
    ],
    "output": "A human-owned authority boundary card decision note"
  },
  {
    "id": "conflict-cooling-choice",
    "name": "Conflict Cooling Choice",
    "category": "Judgement & safety",
    "purpose": "Choose a voluntary pause before responding to a heated but non-emergency disagreement.",
    "humanAction": "Step away safely and decide when or whether to resume direct communication.",
    "fields": [
      {
        "label": "Situation described without blame",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "How I communicated the pause, if safe",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "Response I choose after the pause",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I did not use withdrawal to threaten or coerce.",
      "I preserved emergency and safety communication.",
      "I chose whether to reengage myself."
    ],
    "output": "A human-owned conflict cooling choice decision note"
  },
  {
    "id": "source-context-keeper",
    "name": "Source Context Keeper",
    "category": "Judgement & safety",
    "purpose": "Avoid presenting a cropped or isolated claim as the full record.",
    "humanAction": "Inspect the available surrounding context in an appropriate primary source yourself.",
    "fields": [
      {
        "label": "Claim and source title",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "Context I personally reviewed",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "What the excerpt omits or leaves uncertain",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I distinguished primary and secondhand sources.",
      "I checked accessible surrounding context.",
      "I did not claim completeness without reviewing it."
    ],
    "output": "A human-owned source context keeper decision note"
  },
  {
    "id": "two-person-signoff-dialogue",
    "name": "Two-Person Signoff Dialogue",
    "category": "Judgement & safety",
    "purpose": "Clarify what a voluntary co-signoff means without treating two ticks as legal authorization.",
    "humanAction": "Discuss a low-stakes shared choice directly with its other participant.",
    "fields": [
      {
        "label": "Noncritical shared action",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "Each person's independently stated choice",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "What both consented to or left open",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I invited an unpressured response.",
      "I confirmed both responses directly.",
      "I did not claim legal or regulated approval."
    ],
    "output": "A human-owned two-person signoff dialogue decision note"
  },
  {
    "id": "restricted-space-pause",
    "name": "Restricted Space Pause",
    "category": "Judgement & safety",
    "purpose": "Recognise when an ordinary-looking door or workspace is not yours to enter.",
    "humanAction": "Check access permission with an appropriate responsible person before entering.",
    "fields": [
      {
        "label": "Space and reason to enter without access details",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "Permission I actually obtained or could not obtain",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "My choice to enter or stay outside",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I used an authorised permission channel.",
      "I did not record or share access codes.",
      "I stayed out when permission was unclear."
    ],
    "output": "A human-owned restricted space pause decision note"
  },
  {
    "id": "sensitive-note-minimiser",
    "name": "Sensitive Note Minimiser",
    "category": "Judgement & safety",
    "purpose": "Decide whether an observation can be recorded without someone else's identifying details.",
    "humanAction": "Review a draft note and remove unnecessary personal information before sharing.",
    "fields": [
      {
        "label": "Purpose of the note",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "Details genuinely necessary for that purpose",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "Details I will omit or keep private",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I minimised unnecessary identifiers.",
      "I sought consent where appropriate.",
      "I did not upload sensitive third-party data."
    ],
    "output": "A human-owned sensitive note minimiser decision note"
  },
  {
    "id": "promise-capacity-check",
    "name": "Promise Capacity Check",
    "category": "Judgement & safety",
    "purpose": "Prevent an unintentional commitment by checking what you can actually do.",
    "humanAction": "Review your real time, resources and obligations before offering help to a person.",
    "fields": [
      {
        "label": "Commitment being considered",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "Capacity and limits I personally checked",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "What I can truthfully promise or decline",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I checked my own availability.",
      "I avoided promising another person's time.",
      "I stated limitations clearly."
    ],
    "output": "A human-owned promise capacity check decision note"
  },
  {
    "id": "opt-out-path-trial",
    "name": "Opt-out Path Trial",
    "category": "Judgement & safety",
    "purpose": "Check that a voluntary activity has a workable way to decline or leave.",
    "humanAction": "Personally rehearse a safe noncritical opt-out route with the organiser's agreement.",
    "fields": [
      {
        "label": "Voluntary activity and opt-out option",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "What I encountered while trying to exit",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "Opt-out wording or logistics to improve",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I tested a permitted noncritical process.",
      "I respected others' right to leave.",
      "I did not treat this as a legal compliance assessment."
    ],
    "output": "A human-owned opt-out path trial decision note"
  },
  {
    "id": "confidential-conversation-place",
    "name": "Confidential Conversation Place",
    "category": "Judgement & safety",
    "purpose": "Check whether a proposed space is appropriate for an ordinary private discussion.",
    "humanAction": "Inspect a permitted location and ask the other person whether they are comfortable talking there.",
    "fields": [
      {
        "label": "Topic in broad non-sensitive terms",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "What I noticed about audibility and access",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "Place both people chose or reason to defer",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I asked before discussing private matters.",
      "I avoided recording anyone.",
      "I did not guarantee legal or technical confidentiality."
    ],
    "output": "A human-owned confidential conversation place decision note"
  },
  {
    "id": "rumour-forwarding-pause",
    "name": "Rumour Forwarding Pause",
    "category": "Judgement & safety",
    "purpose": "Stop a compelling unverified claim from becoming a shared fact.",
    "humanAction": "Check what you actually know and choose not to forward until evidence is adequate.",
    "fields": [
      {
        "label": "Claim without identifying targets",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "Firsthand evidence and uncertainties",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "Whether I will share, correct or withhold",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I did not repeat the rumour as fact.",
      "I checked source and context where possible.",
      "I protected affected people's privacy."
    ],
    "output": "A human-owned rumour forwarding pause decision note"
  },
  {
    "id": "budget-approval-voice",
    "name": "Budget Approval Voice",
    "category": "Judgement & safety",
    "purpose": "Make a small personal spending decision without giving a digital tool authority to commit funds.",
    "humanAction": "Review the actual price and budget and choose independently before paying.",
    "fields": [
      {
        "label": "Nonessential purchase and real price",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "What I personally checked about affordability",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "Purchase, defer or decline decision",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I checked the actual total price.",
      "I considered my own available budget.",
      "I did not treat the worksheet as payment authorization."
    ],
    "output": "A human-owned budget approval voice decision note"
  },
  {
    "id": "physical-safety-escalation",
    "name": "Physical Safety Escalation Note",
    "category": "Judgement & safety",
    "purpose": "Record when a real-world hazard requires a responsible person rather than an improvised fix.",
    "humanAction": "Step away from an unsafe area and report the issue through an appropriate channel.",
    "fields": [
      {
        "label": "Hazard in general terms without access details",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "What I observed from a safe distance",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "Whom I notified or plan to notify",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I avoided direct contact with the hazard.",
      "I used appropriate emergency help if urgently needed.",
      "I did not attempt an unqualified repair."
    ],
    "output": "A human-owned physical safety escalation note decision note"
  },
  {
    "id": "false-certainty-check",
    "name": "False Certainty Check",
    "category": "Judgement & safety",
    "purpose": "Spot where an impressive-looking result gives stronger assurance than the underlying evidence.",
    "humanAction": "Review the evidence and write a bounded statement in your own words.",
    "fields": [
      {
        "label": "Confident claim under review",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "What direct evidence actually supports",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "More accurate statement with remaining limits",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I identified the claim's real source.",
      "I listed uncertainty rather than fabricating precision.",
      "I avoided publishing unsupported certainty."
    ],
    "output": "A human-owned false certainty check decision note"
  },
  {
    "id": "shared-cost-consent",
    "name": "Shared Cost Consent",
    "category": "Judgement & safety",
    "purpose": "Prevent a shared bill from becoming an assumed financial obligation.",
    "humanAction": "Ask each person directly what costs they actually agree to cover before ordering.",
    "fields": [
      {
        "label": "Shared expense and approximate total",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "Individual voluntary commitments actually made",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "What I will pay or not purchase",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I clarified costs before commitment.",
      "I accepted that someone may decline.",
      "I did not spend or commit another person's money."
    ],
    "output": "A human-owned shared cost consent decision note"
  },
  {
    "id": "one-way-door-question",
    "name": "One-Way Door Question",
    "category": "Judgement & safety",
    "purpose": "Notice whether a proposed ordinary choice has consequences that are hard to reverse.",
    "humanAction": "Identify the irreversible part and ask a relevant person or expert before proceeding where needed.",
    "fields": [
      {
        "label": "Choice and potential irreversible effect",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "What I personally checked about alternatives",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "Decision to act, adjust or wait",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I checked a reversible alternative.",
      "I identified whose consent matters.",
      "I made the final choice rather than assigning it to AI."
    ],
    "output": "A human-owned one-way door question decision note"
  },
  {
    "id": "identity-request-verify",
    "name": "Identity Request Verify",
    "category": "Judgement & safety",
    "purpose": "Distinguish an asserted authority or identity from an independently verified one.",
    "humanAction": "Use an appropriate trusted route you locate yourself before responding to an unusual request.",
    "fields": [
      {
        "label": "Request type without contact details",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "Verification route I independently found",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "What I will withhold or do next",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I shared no passwords or verification codes.",
      "I avoided untrusted links or caller-provided contacts.",
      "I deferred until I could check independently."
    ],
    "output": "A human-owned identity request verify decision note"
  },
  {
    "id": "community-impact-ask",
    "name": "Community Impact Ask",
    "category": "Judgement & safety",
    "purpose": "Check with people affected by a small shared-space change before treating convenience as collective benefit.",
    "humanAction": "Invite genuine feedback from willing affected people about the specific change.",
    "fields": [
      {
        "label": "Proposed change and affected space",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "Feedback and concerns freely voiced",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "What I will alter, defer or request permission for",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I invited participation without pressure.",
      "I did not invent a consensus.",
      "I confirmed the scope of my authority."
    ],
    "output": "A human-owned community impact ask decision note"
  },
  {
    "id": "device-permission-inventory",
    "name": "Device Permission Inventory",
    "category": "Judgement & safety",
    "purpose": "Review whether a personal device permission is necessary for an ordinary app feature.",
    "humanAction": "Inspect settings on your own device and choose what access to allow.",
    "fields": [
      {
        "label": "Feature and permission requested without credentials",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "What I actually found in my device settings",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "Permission I choose to retain or remove",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I reviewed only a device I may control.",
      "I avoided exposing private device data.",
      "I made the permission decision myself."
    ],
    "output": "A human-owned device permission inventory decision note"
  },
  {
    "id": "public-post-self-review",
    "name": "Public Post Self-Review",
    "category": "Judgement & safety",
    "purpose": "Examine how your own public message could reveal more than you intended.",
    "humanAction": "Read your draft yourself before sending and remove sensitive details.",
    "fields": [
      {
        "label": "Purpose and intended audience",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "Potential identifying detail I noticed",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "Final wording or decision not to post",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I reviewed the exact text I plan to share.",
      "I checked whether other people are mentioned.",
      "I chose personally whether to publish."
    ],
    "output": "A human-owned public post self-review decision note"
  },
  {
    "id": "commitment-collision-check",
    "name": "Commitment Collision Check",
    "category": "Judgement & safety",
    "purpose": "Catch incompatible real-world commitments before giving someone a definite answer.",
    "humanAction": "Review your own actual obligations and negotiate any changes directly.",
    "fields": [
      {
        "label": "Two commitments in potential conflict",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "What I confirmed about times and responsibilities",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "Which commitment I will renegotiate or keep",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I checked actual dates and responsibilities.",
      "I did not invent another person's agreement.",
      "I contacted affected people if a change is needed."
    ],
    "output": "A human-owned commitment collision check decision note"
  },
  {
    "id": "expert-handoff-threshold",
    "name": "Expert Handoff Threshold",
    "category": "Judgement & safety",
    "purpose": "Identify the point where a task needs trained human advice instead of a confident automated answer.",
    "humanAction": "Stop a nonurgent task when it exceeds your training and contact an appropriate qualified professional.",
    "fields": [
      {
        "label": "Task and my relevant experience",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "Warning signs or limits I personally identified",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "Type of professional help I will seek",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I stopped before an unsafe step.",
      "I did not claim competence I lack.",
      "I sought suitable expertise where necessary."
    ],
    "output": "A human-owned expert handoff threshold decision note"
  },
  {
    "id": "consequence-owning-note",
    "name": "Consequence Owning Note",
    "category": "Judgement & safety",
    "purpose": "Keep a personal record of a decision and its foreseeable effects without having AI claim responsibility.",
    "humanAction": "Choose and record what you will do and how you will respond if it affects others.",
    "fields": [
      {
        "label": "Decision I am personally making",
        "hint": "Describe the situation without secrets or unnecessary identifying details."
      },
      {
        "label": "People or resources that may be affected",
        "hint": "Describe direct verification and any unknowns."
      },
      {
        "label": "Follow-up responsibility I will take",
        "hint": "Record only your own decision, with human permission where needed."
      }
    ],
    "checks": [
      "I considered other people's boundaries.",
      "I distinguished intentions from actual results.",
      "I retained ownership of my final choice."
    ],
    "output": "A human-owned consequence owning note decision note"
  }
];
