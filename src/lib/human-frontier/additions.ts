/** Forty additional human-led worksheets. No agent execution or independent verification. */
import type { HumanTool } from './registry';

export const HUMAN_FRONTIER_ADDITIONS: readonly HumanTool[] = [
  {
    "id": "household-handover",
    "name": "Household Handover Map",
    "category": "Everyday life",
    "purpose": "Agree a real handoff of a recurring task with housemates.",
    "humanAction": "Discuss responsibility directly with the people who share the task.",
    "fields": [
      {
        "label": "Task to hand over",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "What each person actually agreed",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Next handoff and open questions",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I asked affected people.",
      "I inspected the actual task.",
      "I recorded only confirmed commitments."
    ],
    "output": "A user-authored household handover map record"
  },
  {
    "id": "route-comfort-trial",
    "name": "Route Comfort Trial",
    "category": "Everyday life",
    "purpose": "Learn whether an everyday journey fits your own needs.",
    "humanAction": "Travel a safe, familiar route and notice its real barriers.",
    "fields": [
      {
        "label": "Route and purpose",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "What I encountered firsthand",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Adjustment for my next journey",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I selected safe conditions.",
      "I travelled the route myself.",
      "I marked unknowns instead of promising access."
    ],
    "output": "A user-authored route comfort trial record"
  },
  {
    "id": "packaging-access-trial",
    "name": "Packaging Access Trial",
    "category": "Making & learning",
    "purpose": "Find physical packaging that is difficult to open or reuse.",
    "humanAction": "Try handling a safe everyday package yourself.",
    "fields": [
      {
        "label": "Package and task",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "Where opening or reuse became difficult",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Change I would test",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I chose safe packaging.",
      "I attempted the task.",
      "I observed rather than simulated usability."
    ],
    "output": "A user-authored packaging access trial record"
  },
  {
    "id": "shared-meal-agreement",
    "name": "Shared Meal Agreement",
    "category": "People & community",
    "purpose": "Plan a shared meal around preferences volunteered by real guests.",
    "humanAction": "Ask willing guests what they would enjoy without inferring health needs.",
    "fields": [
      {
        "label": "Meal and guests in general terms",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "Preferences people freely shared",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "What I can prepare or arrange",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I invited preferences without pressure.",
      "I checked preparation limits.",
      "I made no allergy-safety guarantees."
    ],
    "output": "A user-authored shared meal agreement record"
  },
  {
    "id": "service-touchpoint-notes",
    "name": "Service Touchpoint Notes",
    "category": "Everyday life",
    "purpose": "Describe a real service experience without inventing a review.",
    "humanAction": "Use the service firsthand and note specific points of friction.",
    "fields": [
      {
        "label": "Service and purpose",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "What actually occurred",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Constructive feedback I choose to give",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I used the service myself.",
      "I protected staff privacy.",
      "I distinguished observations from interpretations."
    ],
    "output": "A user-authored service touchpoint notes record"
  },
  {
    "id": "paper-retrieval-drill",
    "name": "Paper Retrieval Drill",
    "category": "Judgement & safety",
    "purpose": "Locate a non-sensitive paper fallback for a digital reference.",
    "humanAction": "Physically find and rehearse retrieving an ordinary paper reference.",
    "fields": [
      {
        "label": "Reference without passwords",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "What I located and tested",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Missing paper fallback",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I chose a non-sensitive example.",
      "I found the actual reference.",
      "I did not disrupt essential services."
    ],
    "output": "A user-authored paper retrieval drill record"
  },
  {
    "id": "quiet-hours-pact",
    "name": "Quiet Hours Pact",
    "category": "People & community",
    "purpose": "Arrange voluntary quiet hours with people sharing a space.",
    "humanAction": "Discuss different schedules and confirm each person's agreement.",
    "fields": [
      {
        "label": "Shared space and proposed hours",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "Concerns or exceptions people voiced",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Terms actually agreed",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I invited all affected people.",
      "I accepted disagreement.",
      "I recorded no implied consent."
    ],
    "output": "A user-authored quiet hours pact record"
  },
  {
    "id": "object-story-interview",
    "name": "Object Story Interview",
    "category": "People & community",
    "purpose": "Preserve an owner's lived story of a meaningful physical object.",
    "humanAction": "Ask its owner for permission to tell and record their account.",
    "fields": [
      {
        "label": "Object without private identifiers",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "What the owner chose to share",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "What I may preserve or repeat",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "The owner volunteered.",
      "I confirmed sharing permission.",
      "I left unknowns as unknowns."
    ],
    "output": "A user-authored object story interview record"
  },
  {
    "id": "waste-point-check",
    "name": "Waste Point Check",
    "category": "Everyday life",
    "purpose": "Observe why a real disposal station is confusing.",
    "humanAction": "Inspect its bins and signage without handling hazardous waste.",
    "fields": [
      {
        "label": "Sorting location and intended item",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "Labels and facilities actually present",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Question for local authorities",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I visited safely.",
      "I checked the actual local signs.",
      "I did not guess hazardous disposal rules."
    ],
    "output": "A user-authored waste point check record"
  },
  {
    "id": "room-use-walkthrough",
    "name": "Room Use Walkthrough",
    "category": "Everyday life",
    "purpose": "Discover how an actual room supports an everyday activity.",
    "humanAction": "Spend time using it and identify one reversible improvement.",
    "fields": [
      {
        "label": "Room and activity",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "Real light noise or movement obstacles",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Reversible layout trial",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I observed normal use.",
      "I left wiring and safety equipment untouched.",
      "I chose a low-risk change."
    ],
    "output": "A user-authored room use walkthrough record"
  },
  {
    "id": "boundary-voice-rehearsal",
    "name": "Boundary Voice Rehearsal",
    "category": "People & community",
    "purpose": "Practise personally expressing a limit without AI speaking for you.",
    "humanAction": "Say your own boundary aloud in a safe setting.",
    "fields": [
      {
        "label": "Boundary in my own words",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "How it sounded when rehearsed",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "My response to pressure",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I said it myself.",
      "I did not coerce a listener.",
      "I chose a response I control."
    ],
    "output": "A user-authored boundary voice rehearsal record"
  },
  {
    "id": "fair-turn-session",
    "name": "Fair Turn Session",
    "category": "People & community",
    "purpose": "Give people a genuine opportunity to contribute to a group activity.",
    "humanAction": "Offer willing participants turns and permit them to pass.",
    "fields": [
      {
        "label": "Activity and invitation",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "How turns or passes actually occurred",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Change the group accepted",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I offered participation freely.",
      "I accepted passes.",
      "I confirmed decisions with the group."
    ],
    "output": "A user-authored fair turn session record"
  },
  {
    "id": "mutual-skill-barter",
    "name": "Mutual Skill Barter",
    "category": "People & community",
    "purpose": "Arrange an optional exchange of practical help.",
    "humanAction": "Discuss each person's available skills and limits directly.",
    "fields": [
      {
        "label": "Help I can offer",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "Help requested and safety limits",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Mutually accepted exchange or unresolved offer",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I asked instead of assigning work.",
      "I considered necessary qualifications.",
      "I recorded only voluntary commitments."
    ],
    "output": "A user-authored mutual skill barter record"
  },
  {
    "id": "welcome-arrival-check",
    "name": "Welcome Arrival Check",
    "category": "People & community",
    "purpose": "Improve the actual arrival experience at a small event.",
    "humanAction": "Walk the arrival route yourself and ask attendees for optional feedback.",
    "fields": [
      {
        "label": "Event and general arrival point",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "Signs or obstacles I noticed",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Welcome change within my control",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I walked the route safely.",
      "I welcomed optional feedback.",
      "I kept private guest details out."
    ],
    "output": "A user-authored welcome arrival check record"
  },
  {
    "id": "meaning-confirmation-loop",
    "name": "Meaning Confirmation Loop",
    "category": "People & community",
    "purpose": "Check that two people understand a low-stakes instruction similarly.",
    "humanAction": "Ask a willing partner to repeat an everyday message in their own words.",
    "fields": [
      {
        "label": "Ordinary message to clarify",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "What each person actually understood",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Clarification both accepted",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "Both people volunteered.",
      "I checked meaning directly.",
      "I did not treat this as professional interpreting."
    ],
    "output": "A user-authored meaning confirmation loop record"
  },
  {
    "id": "complaint-listening-card",
    "name": "Complaint Listening Card",
    "category": "People & community",
    "purpose": "Receive a genuine concern without manufacturing a resolution.",
    "humanAction": "Listen directly and confirm what the person wants you to understand.",
    "fields": [
      {
        "label": "Concern shared with permission",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "What I heard and clarified",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Next step within my authority",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I allowed the person to speak.",
      "I checked rather than assumed understanding.",
      "I promised only what I can do."
    ],
    "output": "A user-authored complaint listening card record"
  },
  {
    "id": "firsthand-secondhand-map",
    "name": "Firsthand / Secondhand Map",
    "category": "Judgement & safety",
    "purpose": "Separate personal recollection from statements heard from others.",
    "humanAction": "Review what you personally witnessed without treating hearsay as direct evidence.",
    "fields": [
      {
        "label": "Event described neutrally",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "My direct observations",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Secondhand reports and unknowns",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I distinguished senses from inferences.",
      "I labelled secondhand information.",
      "I did not claim certified testimony."
    ],
    "output": "A user-authored firsthand / secondhand map record"
  },
  {
    "id": "gift-fit-conversation",
    "name": "Gift Fit Conversation",
    "category": "People & community",
    "purpose": "Choose a welcome gift rather than rely on a generated preference profile.",
    "humanAction": "Ask a recipient what they would genuinely appreciate, including no gift.",
    "fields": [
      {
        "label": "Gift idea and context",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "Preference directly volunteered",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Gift or no-gift choice I make",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I asked without pressure.",
      "I accepted a no.",
      "I chose the gift myself."
    ],
    "output": "A user-authored gift fit conversation record"
  },
  {
    "id": "story-sharing-boundary",
    "name": "Story Sharing Boundary",
    "category": "People & community",
    "purpose": "Let a storyteller choose which family or community details are shareable.",
    "humanAction": "Ask the person before recording or passing on their story.",
    "fields": [
      {
        "label": "Broad story topic",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "Details offered and restrictions",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Scope of permission to preserve or share",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "The storyteller opted in.",
      "I confirmed recording permission.",
      "I honoured withheld details."
    ],
    "output": "A user-authored story sharing boundary record"
  },
  {
    "id": "companion-checkin-choice",
    "name": "Companion Check-in Choice",
    "category": "People & community",
    "purpose": "Agree an optional personal check-in without surveillance.",
    "humanAction": "Ask a willing person whether and how to check in with one another.",
    "fields": [
      {
        "label": "Purpose of check-in",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "Voluntary contact preference without numbers",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "How either person can end the arrangement",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "Both people opted in.",
      "I agreed on boundaries.",
      "I did not promise continuous monitoring."
    ],
    "output": "A user-authored companion check-in choice record"
  },
  {
    "id": "hand-tool-fit-trial",
    "name": "Hand Tool Fit Trial",
    "category": "Making & learning",
    "purpose": "Test whether a safe manual tool suits your grip and simple task.",
    "humanAction": "Handle a non-sharp, non-powered beginner tool and stop if uncomfortable.",
    "fields": [
      {
        "label": "Tool and low-risk task",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "What happened in my hands",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Alternative I might try",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I chose safe equipment.",
      "I attempted the task myself.",
      "I stopped if handling felt unsafe."
    ],
    "output": "A user-authored hand tool fit trial record"
  },
  {
    "id": "material-touch-library",
    "name": "Material Touch Library",
    "category": "Making & learning",
    "purpose": "Compare real material samples beyond their digital appearance.",
    "humanAction": "Touch safe samples and directly note flexibility or texture.",
    "fields": [
      {
        "label": "Samples and intended use",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "Handling observations",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Sample to explore further",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I checked samples were safe.",
      "I handled real samples.",
      "I did not invent strength certifications."
    ],
    "output": "A user-authored material touch library record"
  },
  {
    "id": "repairability-conversation",
    "name": "Repairability Conversation",
    "category": "Making & learning",
    "purpose": "Discover actual maintenance limits from a willing owner or expert.",
    "humanAction": "Ask someone with firsthand experience about a safe maintenance question.",
    "fields": [
      {
        "label": "Object and question",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "What was explained or demonstrated",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "What I will leave to an expert",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I asked a willing person.",
      "I left hazardous devices unopened.",
      "I distinguished claims from firsthand evidence."
    ],
    "output": "A user-authored repairability conversation record"
  },
  {
    "id": "fit-and-comfort-test",
    "name": "Fit and Comfort Test",
    "category": "Making & learning",
    "purpose": "Check an ordinary wearable during a real comfortable activity.",
    "humanAction": "Try the item yourself and decide whether its fit works for you.",
    "fields": [
      {
        "label": "Item and intended use",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "My physical comfort observations",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Adjustment or return choice",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I tried it briefly and safely.",
      "I stopped if uncomfortable.",
      "I made no medical conclusions."
    ],
    "output": "A user-authored fit and comfort test record"
  },
  {
    "id": "instruction-clarity-run",
    "name": "Instruction Clarity Run",
    "category": "Making & learning",
    "purpose": "Test whether someone can follow simple written instructions.",
    "humanAction": "Invite a willing person to attempt a low-risk task from actual directions.",
    "fields": [
      {
        "label": "Task and instruction version",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "Where the reader hesitated",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Wording to test next",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "The reader consented.",
      "I observed the attempt.",
      "I did not treat one trial as certification."
    ],
    "output": "A user-authored instruction clarity run record"
  },
  {
    "id": "teachback-practice",
    "name": "Teachback Practice",
    "category": "Making & learning",
    "purpose": "Check whether a real learner understood a practical explanation.",
    "humanAction": "Demonstrate a simple skill and ask someone to explain it back.",
    "fields": [
      {
        "label": "Skill and goal",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "What the learner actually said",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Explanation I would improve",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "The learner volunteered.",
      "I heard their own words.",
      "I did not assert professional competence."
    ],
    "output": "A user-authored teachback practice record"
  },
  {
    "id": "shared-tool-return",
    "name": "Shared Tool Return Trail",
    "category": "Everyday life",
    "purpose": "Coordinate a real return of a borrowed everyday item.",
    "humanAction": "Check its condition and agree handback with the owner.",
    "fields": [
      {
        "label": "Borrowed item and agreed condition",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "What I inspected",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Confirmed return or next step",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I asked the owner.",
      "I disclosed any observed damage.",
      "I marked returned only if it happened."
    ],
    "output": "A user-authored shared tool return trail record"
  },
  {
    "id": "micro-plot-observation",
    "name": "Micro-Plot Observation",
    "category": "Making & learning",
    "purpose": "Observe changes in a permitted container plant or small garden.",
    "humanAction": "Look at a safe growing space and record what is actually present.",
    "fields": [
      {
        "label": "Growing space and plant",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "Leaves soil or moisture I observed",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Small non-hazardous next step",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I had permission to observe.",
      "I avoided unknown chemicals.",
      "I recorded observation rather than prediction."
    ],
    "output": "A user-authored micro-plot observation record"
  },
  {
    "id": "recipe-hands-on-adjustment",
    "name": "Recipe Hands-on Adjustment",
    "category": "Making & learning",
    "purpose": "Improve an ordinary familiar recipe using your own actual experience.",
    "humanAction": "Prepare safe familiar ingredients and personally choose one change.",
    "fields": [
      {
        "label": "Dish and preparation choice",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "What happened during cooking and tasting",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "One change for next time",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I used suitable safe ingredients.",
      "I followed ordinary food safety.",
      "I described preference rather than allergy safety."
    ],
    "output": "A user-authored recipe hands-on adjustment record"
  },
  {
    "id": "craft-passing-trial",
    "name": "Craft Passing Trial",
    "category": "Making & learning",
    "purpose": "See how a handmade object behaves with an invited first-time user.",
    "humanAction": "Offer a safe craft prototype and observe a willing person's attempt.",
    "fields": [
      {
        "label": "Object and intended use",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "What tester actually did",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "One prototype adjustment",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "The tester agreed.",
      "The prototype was safe to handle.",
      "I used actual feedback, not simulation."
    ],
    "output": "A user-authored craft passing trial record"
  },
  {
    "id": "everyday-exit-walk",
    "name": "Everyday Exit Walk",
    "category": "Judgement & safety",
    "purpose": "Notice unclear signs on an ordinary permitted exit route.",
    "humanAction": "Walk the route in normal conditions without touching alarms or blocking doors.",
    "fields": [
      {
        "label": "Space and ordinary route",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "Actual signs and obstacles",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Concern for responsible staff",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I used the space as permitted.",
      "I left emergency equipment untouched.",
      "I did not claim fire-safety certification."
    ],
    "output": "A user-authored everyday exit walk record"
  },
  {
    "id": "stop-work-phrase",
    "name": "Stop-Work Phrase Rehearsal",
    "category": "Judgement & safety",
    "purpose": "Prepare words to pause an unsafe or uncertain ordinary activity.",
    "humanAction": "Say a clear stop phrase yourself before any high-risk task arises.",
    "fields": [
      {
        "label": "Low-risk example and stop trigger",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "Phrase I rehearsed aloud",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Person I would ask for help",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I rehearsed safely.",
      "I identified a stop trigger.",
      "I did not claim workplace safety certification."
    ],
    "output": "A user-authored stop-work phrase rehearsal record"
  },
  {
    "id": "missing-phone-practice",
    "name": "Missing Phone Practice",
    "category": "Judgement & safety",
    "purpose": "Try an ordinary fallback for a day-to-day task if a phone is absent.",
    "humanAction": "Safely rehearse a noncritical activity without using your phone.",
    "fields": [
      {
        "label": "Task normally on phone",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "Offline method I tried",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Remaining gap without secrets",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I selected a noncritical task.",
      "I actually tried the fallback.",
      "I did not record codes or passwords."
    ],
    "output": "A user-authored missing phone practice record"
  },
  {
    "id": "shared-space-listening",
    "name": "Shared Space Listening Map",
    "category": "People & community",
    "purpose": "Hear competing needs for a shared space without letting AI settle the issue.",
    "humanAction": "Invite affected people to explain needs and decide whether to try a change.",
    "fields": [
      {
        "label": "Space concern",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "Different needs voluntarily voiced",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Proposed or agreed change",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I invited without pressure.",
      "I reported perspectives fairly.",
      "I did not invent agreement."
    ],
    "output": "A user-authored shared space listening map record"
  },
  {
    "id": "suspicious-request-pause",
    "name": "Suspicious Request Pause",
    "category": "Judgement & safety",
    "purpose": "Pause an unexpected request for private data, money or access.",
    "humanAction": "Personally verify via an independently known trusted contact channel.",
    "fields": [
      {
        "label": "Unexpected request without secrets",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "Independent verification I attempted",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "My response or reason to defer",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I kept credentials private.",
      "I did not use contact details from the suspicious request.",
      "I checked independently before acting."
    ],
    "output": "A user-authored suspicious request pause record"
  },
  {
    "id": "personal-evidence-boundary",
    "name": "Personal Evidence Boundary",
    "category": "Judgement & safety",
    "purpose": "Choose what personal notes to preserve or share proportionately.",
    "humanAction": "Review your own information and set a privacy-conscious sharing limit.",
    "fields": [
      {
        "label": "Topic without private identifiers",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "Firsthand facts I can responsibly note",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Who may receive which details",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I used information I may appropriately possess.",
      "I avoided third-party private details.",
      "I did not claim legal validation."
    ],
    "output": "A user-authored personal evidence boundary record"
  },
  {
    "id": "sign-understanding-test",
    "name": "Sign Understanding Test",
    "category": "Making & learning",
    "purpose": "Test whether a reader understands a noncritical sign without prompting.",
    "humanAction": "Ask a willing person to read an everyday sign before you explain it.",
    "fields": [
      {
        "label": "Sign and intended message",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "Reader's own interpretation",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Wording or layout to change",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "The reader consented.",
      "I avoided safety-critical signs.",
      "I observed the actual reading."
    ],
    "output": "A user-authored sign understanding test record"
  },
  {
    "id": "privacy-sharing-decision",
    "name": "Privacy Sharing Decision",
    "category": "Judgement & safety",
    "purpose": "Choose how much personal information a real interaction requires.",
    "humanAction": "Pause before sharing and decide what the recipient genuinely needs.",
    "fields": [
      {
        "label": "Sharing situation without private content",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "Purpose of requested information",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Disclosure limit I choose",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I considered whether disclosure is necessary.",
      "I entered no secrets here.",
      "I set my own boundary."
    ],
    "output": "A user-authored privacy sharing decision record"
  },
  {
    "id": "backup-buddy-handoff",
    "name": "Backup Buddy Handoff",
    "category": "People & community",
    "purpose": "Agree a voluntary backup for an ordinary shared responsibility.",
    "humanAction": "Ask someone whether they can and want to cover a noncritical task.",
    "fields": [
      {
        "label": "Task and possible interruption",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "What the backup person actually agreed",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "Handoff and return conditions",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I accepted a no.",
      "I confirmed task limits.",
      "I did not assume permanent availability."
    ],
    "output": "A user-authored backup buddy handoff record"
  },
  {
    "id": "irreversible-choice-pause",
    "name": "Irreversible Choice Pause",
    "category": "Judgement & safety",
    "purpose": "Create a human checkpoint before an action that is difficult to undo.",
    "humanAction": "Personally review alternatives, consequences and affected people before committing.",
    "fields": [
      {
        "label": "Action and irreversible consequence",
        "hint": "Describe this in your own words, without unnecessary private details."
      },
      {
        "label": "People affected and alternatives",
        "hint": "Record what actually happened; leave unknowns as unknowns."
      },
      {
        "label": "My decision or reason to wait",
        "hint": "Write your own decision or next practical step."
      }
    ],
    "checks": [
      "I checked reversibility.",
      "I considered others and advice needs.",
      "I chose or deferred the action myself."
    ],
    "output": "A user-authored irreversible choice pause record"
  }
];
