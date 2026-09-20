import type { HumanTool } from './registry';
/** 25 more voluntary, person-to-person Human Frontier workflows. */
export const FRONTIER_PEOPLE_25: readonly HumanTool[] = [
  {
    "id": "event-photo-permission",
    "name": "Event Photo Permission Point",
    "category": "People & community",
    "purpose": "Provide guests a meaningful choice about appearing in event photos.",
    "humanAction": "Ask each willing participant before photographing or publishing their likeness.",
    "fields": [
      {
        "label": "Event and proposed photo use",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "Preferences people actually expressed",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "What I will photograph or leave out",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "I asked before photographing.",
      "I accepted refusal without pressure.",
      "I did not treat attendance as consent."
    ],
    "output": "A consent-aware event photo permission point note"
  },
  {
    "id": "volunteer-first-arrival",
    "name": "Volunteer First-Arrival Trial",
    "category": "People & community",
    "purpose": "Understand whether a new volunteer can find an appropriate welcome point.",
    "humanAction": "Invite a willing newcomer to describe their real first arrival without staging a fake experience.",
    "fields": [
      {
        "label": "Volunteer role and arrival setting",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "Which welcome steps were clear or missing",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "Change agreed with organisers",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "I invited feedback voluntarily.",
      "I protected identities and contact information.",
      "I described actual arrival, not a simulated journey."
    ],
    "output": "A consent-aware volunteer first-arrival trial note"
  },
  {
    "id": "group-game-rules",
    "name": "Group Game Rule Trial",
    "category": "People & community",
    "purpose": "Resolve ambiguous low-stakes game instructions through genuine play.",
    "humanAction": "Ask willing players to try one safe round and discuss confusion firsthand.",
    "fields": [
      {
        "label": "Game and rule being tested",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "What players actually did or disputed",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "Wording the group accepted",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "Players chose to participate.",
      "I observed a real trial round.",
      "I recorded the group's actual rule agreement."
    ],
    "output": "A consent-aware group game rule trial note"
  },
  {
    "id": "shared-garden-care-pact",
    "name": "Shared Garden Care Pact",
    "category": "People & community",
    "purpose": "Agree who can care for a community planter without assigning unseen responsibilities.",
    "humanAction": "Meet willing caretakers and discuss permitted watering or tidying duties.",
    "fields": [
      {
        "label": "Planter and permitted activities",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "What each person can safely offer",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "Voluntary care arrangement and gaps",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "I checked permission for the growing area.",
      "I asked rather than assigned shifts.",
      "I recorded only accepted tasks."
    ],
    "output": "A consent-aware shared garden care pact note"
  },
  {
    "id": "meeting-agenda-reality",
    "name": "Meeting Agenda Reality Check",
    "category": "People & community",
    "purpose": "Find which planned discussion topics matter to people who actually attend.",
    "humanAction": "Ask participants for additions before a small voluntary meeting.",
    "fields": [
      {
        "label": "Proposed agenda",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "Topics and concerns participants volunteered",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "Final agenda or explicitly deferred topic",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "I invited input before the meeting.",
      "I left personal concerns confidential.",
      "I made no claim of unanimous agreement."
    ],
    "output": "A consent-aware meeting agenda reality check note"
  },
  {
    "id": "event-rest-corner",
    "name": "Event Rest Corner Choice",
    "category": "People & community",
    "purpose": "Help participants choose whether a low-stimulation space would be useful at a small event.",
    "humanAction": "Ask attendees and inspect a suitable permitted area without presuming anyone's needs.",
    "fields": [
      {
        "label": "Event and possible break area",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "Feedback freely offered about the space",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "What organisers agreed to provide",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "I asked without requesting health disclosures.",
      "I inspected a safe accessible option.",
      "I confirmed the host's actual commitments."
    ],
    "output": "A consent-aware event rest corner choice note"
  },
  {
    "id": "community-notice-read",
    "name": "Community Notice Read-Aloud",
    "category": "People & community",
    "purpose": "See how a public community notice is interpreted by willing readers.",
    "humanAction": "Invite someone to read an ordinary noncritical notice and explain it in their own words.",
    "fields": [
      {
        "label": "Public notice and intended information",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "Reader's firsthand interpretation",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "Clarification to suggest to the organiser",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "The reader freely took part.",
      "I avoided emergency and legal notices.",
      "I recorded only feedback offered with permission."
    ],
    "output": "A consent-aware community notice read-aloud note"
  },
  {
    "id": "meeting-voice-choice",
    "name": "Meeting Voice Choice",
    "category": "People & community",
    "purpose": "Enable a meeting participant to choose speaking, writing or passing without forced contribution.",
    "humanAction": "Ask people which participation methods they want for a small noncritical meeting.",
    "fields": [
      {
        "label": "Meeting and contribution options",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "Choices people actually made",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "Format the group agreed to try",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "I offered more than one participation path.",
      "I allowed people to pass.",
      "I did not equate silence with support."
    ],
    "output": "A consent-aware meeting voice choice note"
  },
  {
    "id": "visitor-wayfinding-chat",
    "name": "Visitor Wayfinding Chat",
    "category": "People & community",
    "purpose": "Learn how an actual first-time visitor understands a public arrival instruction.",
    "humanAction": "Ask a willing visitor about their real experience in a permitted public venue.",
    "fields": [
      {
        "label": "Venue and usual arrival instruction",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "What the visitor actually looked for",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "Direction to simplify with staff permission",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "I obtained voluntary feedback.",
      "I avoided exposing visitor identity.",
      "I changed no official sign without authority."
    ],
    "output": "A consent-aware visitor wayfinding chat note"
  },
  {
    "id": "shared-space-temperature",
    "name": "Shared Temperature Conversation",
    "category": "People & community",
    "purpose": "Discuss differing comfort in a shared room without assuming one setting suits all.",
    "humanAction": "Ask people using the space about preferences and discuss safe adjustments with the responsible person.",
    "fields": [
      {
        "label": "Shared room and current concern",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "Comfort preferences people chose to share",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "Adjustments authorised or unresolved",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "I invited differing opinions.",
      "I avoided health assumptions about anyone.",
      "I did not alter restricted building controls."
    ],
    "output": "A consent-aware shared temperature conversation note"
  },
  {
    "id": "group-credit-conversation",
    "name": "Group Credit Conversation",
    "category": "People & community",
    "purpose": "Agree how voluntary collaborators would like their actual contributions acknowledged.",
    "humanAction": "Ask contributors how their work may be named or kept anonymous.",
    "fields": [
      {
        "label": "Shared output and actual contributions",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "Credit or anonymity preferences voiced",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "Acknowledgement each contributor authorised",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "I asked every contributor concerned.",
      "I distinguished contribution from ownership rights.",
      "I did not publish names without permission."
    ],
    "output": "A consent-aware group credit conversation note"
  },
  {
    "id": "shared-library-shelf",
    "name": "Shared Library Shelf Agreement",
    "category": "People & community",
    "purpose": "Create a voluntary method for contributing and returning ordinary shared books.",
    "humanAction": "Inspect an authorised shared shelf and discuss simple rules with its users.",
    "fields": [
      {
        "label": "Shelf and books offered",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "Borrowing friction noticed by participants",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "Rules people actually accepted",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "I had permission to use the shelf.",
      "I clarified ownership and borrowing boundaries.",
      "I did not claim books had been returned without checking."
    ],
    "output": "A consent-aware shared library shelf agreement note"
  },
  {
    "id": "gathering-exit-choice",
    "name": "Gathering Exit Choice",
    "category": "People & community",
    "purpose": "Make it comfortable for people to leave a voluntary social gathering without explanation.",
    "humanAction": "Discuss with organisers how participants can step away freely.",
    "fields": [
      {
        "label": "Gathering and ordinary exit options",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "Concerns or requests actually voiced",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "Exit wording organisers agreed to use",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "I offered an option to leave.",
      "I avoided asking for private reasons.",
      "I preserved access to normal exits."
    ],
    "output": "A consent-aware gathering exit choice note"
  },
  {
    "id": "neighbour-notice-timing",
    "name": "Neighbour Notice Timing",
    "category": "People & community",
    "purpose": "Ask when a nonurgent shared notice is useful rather than sending it automatically at intrusive times.",
    "humanAction": "Discuss preferred notice timing with willing neighbours without collecting private schedules.",
    "fields": [
      {
        "label": "Notice topic and intended audience",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "Timing feedback freely provided",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "Agreed delivery method or unresolved preferences",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "I asked rather than inferred availability.",
      "I recorded no personal schedules.",
      "I used only authorised communication channels."
    ],
    "output": "A consent-aware neighbour notice timing note"
  },
  {
    "id": "workspace-interruption-pact",
    "name": "Workspace Interruption Pact",
    "category": "People & community",
    "purpose": "Agree how coworkers signal that a nonurgent interruption is welcome or should wait.",
    "humanAction": "Speak with the people sharing a workspace about voluntary cues.",
    "fields": [
      {
        "label": "Shared task and interruption type",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "Cues or concerns people proposed",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "Boundary everyone involved accepted",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "I invited each person's input.",
      "I kept urgent communication exceptions clear.",
      "I did not impose a unilateral rule."
    ],
    "output": "A consent-aware workspace interruption pact note"
  },
  {
    "id": "volunteer-task-exit",
    "name": "Volunteer Task Exit Option",
    "category": "People & community",
    "purpose": "Allow someone to step back from an optional group task without being treated as unreliable.",
    "humanAction": "Discuss what a voluntary task handoff would look like before assigning it.",
    "fields": [
      {
        "label": "Optional task and current commitments",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "Limits or stop conditions freely shared",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "Agreed fallback if someone withdraws",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "I made it safe to decline.",
      "I asked before promising backup help.",
      "I recorded the actual handoff plan."
    ],
    "output": "A consent-aware volunteer task exit option note"
  },
  {
    "id": "event-seating-dialogue",
    "name": "Event Seating Dialogue",
    "category": "People & community",
    "purpose": "Offer participants an actual choice of appropriate seating arrangements.",
    "humanAction": "Invite preferences without asking people to justify accessibility or comfort needs.",
    "fields": [
      {
        "label": "Event and available seating",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "Preferences people volunteered",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "Seating changes the organiser can provide",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "I asked without requiring disclosure.",
      "I did not promise seating that was unavailable.",
      "I confirmed only the participant's chosen option."
    ],
    "output": "A consent-aware event seating dialogue note"
  },
  {
    "id": "small-group-rotation",
    "name": "Small Group Role Rotation",
    "category": "People & community",
    "purpose": "Work out whether participants want to rotate optional roles in a community activity.",
    "humanAction": "Ask the group directly before trying a low-risk role rotation.",
    "fields": [
      {
        "label": "Activity and optional roles",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "Who volunteered for which role",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "Rotation actually accepted or deferred",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "I allowed people to decline a role.",
      "I did not assign others without consent.",
      "I checked how the new arrangement worked."
    ],
    "output": "A consent-aware small group role rotation note"
  },
  {
    "id": "community-clearup-boundary",
    "name": "Community Clear-up Boundary",
    "category": "People & community",
    "purpose": "Agree a safe voluntary scope for a small neighbourhood tidy-up.",
    "humanAction": "Discuss permitted low-risk tasks and avoid hazardous or unknown waste.",
    "fields": [
      {
        "label": "Permitted area and safe activities",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "Tasks volunteers actually offered",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "Boundaries and organiser-approved plan",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "I checked permission and local guidance.",
      "I excluded sharps and hazardous material.",
      "I did not claim volunteers had joined without asking."
    ],
    "output": "A consent-aware community clear-up boundary note"
  },
  {
    "id": "shared-table-cleanup",
    "name": "Shared Table Clean-up Pact",
    "category": "People & community",
    "purpose": "Decide how a shared noncritical table gets reset after an activity.",
    "humanAction": "Observe the table after use and discuss a voluntary reset with participants.",
    "fields": [
      {
        "label": "Table and ordinary activity",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "What remained after real use",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "Reset steps accepted by the group",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "I inspected only authorised space.",
      "I asked others before assigning duties.",
      "I preserved food and hygiene rules."
    ],
    "output": "A consent-aware shared table clean-up pact note"
  },
  {
    "id": "welcome-name-preference",
    "name": "Welcome Name Preference",
    "category": "People & community",
    "purpose": "Learn how someone would like to be addressed without guessing or publishing their identity.",
    "humanAction": "Ask a willing participant privately how they prefer to be greeted in a voluntary group.",
    "fields": [
      {
        "label": "Group and greeting situation",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "Form of address volunteered",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "Where that preference may be used",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "I asked rather than guessed.",
      "I allowed someone not to answer.",
      "I did not publish their preference without permission."
    ],
    "output": "A consent-aware welcome name preference note"
  },
  {
    "id": "shared-project-stop-signal",
    "name": "Shared Project Stop Signal",
    "category": "People & community",
    "purpose": "Give collaborators an agreed low-stakes way to pause a shared activity.",
    "humanAction": "Invite the participants to choose a phrase and rehearse it during a safe practice task.",
    "fields": [
      {
        "label": "Project and safe practice task",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "Stop phrase people actually chose",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "What happened when it was rehearsed",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "Everyone could opt out of rehearsal.",
      "I respected the pause immediately.",
      "I did not treat this as professional safety certification."
    ],
    "output": "A consent-aware shared project stop signal note"
  },
  {
    "id": "community-translation-check",
    "name": "Community Phrase Confirmation",
    "category": "People & community",
    "purpose": "Help people verify an ordinary greeting across languages through a willing speaker.",
    "humanAction": "Ask a willing speaker how they personally understand a low-stakes phrase.",
    "fields": [
      {
        "label": "Greeting and context",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "Speaker's own interpretation",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "Alternative wording both accepted",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "The speaker volunteered.",
      "I recorded attribution only with permission.",
      "I did not use this as legal or medical translation."
    ],
    "output": "A consent-aware community phrase confirmation note"
  },
  {
    "id": "local-club-guest-feedback",
    "name": "Local Club Guest Feedback",
    "category": "People & community",
    "purpose": "Find what a first-time guest actually experienced at a voluntary club activity.",
    "humanAction": "Invite optional feedback from someone who attended and obtain organiser permission for changes.",
    "fields": [
      {
        "label": "Club activity and guest arrival",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "Specific welcome moments guest chose to share",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "One realistic organiser-approved improvement",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "I asked without soliciting private details.",
      "I listened to the real guest.",
      "I attributed no feedback without permission."
    ],
    "output": "A consent-aware local club guest feedback note"
  },
  {
    "id": "community-pause-circle",
    "name": "Community Pause Circle",
    "category": "People & community",
    "purpose": "Allow a group to pause a nonurgent shared plan when people have genuine concerns.",
    "humanAction": "Invite affected people to voice a concern or choose not to speak before any action.",
    "fields": [
      {
        "label": "Shared nonurgent proposal",
        "hint": "Describe the shared activity without identifying participants."
      },
      {
        "label": "Concerns and dissent voluntarily offered",
        "hint": "Record only the feedback or agreement people chose to share."
      },
      {
        "label": "What was paused or truly agreed",
        "hint": "State what is confirmed and leave other matters unresolved."
      }
    ],
    "checks": [
      "I gave people permission to pass.",
      "I documented disagreement fairly.",
      "I did not claim a collective decision without confirmation."
    ],
    "output": "A consent-aware community pause circle note"
  }
];
