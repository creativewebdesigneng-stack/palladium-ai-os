import type { HumanTool } from './registry';
/** 25 additional manual everyday-life workflows. */
export const FRONTIER_EVERYDAY_25: readonly HumanTool[] = [
  {
    "id": "carry-load-rehearsal",
    "name": "Carry Load Rehearsal",
    "category": "Everyday life",
    "purpose": "Find a comfortable way to carry ordinary shopping without trusting a weight estimate alone.",
    "humanAction": "Carry a light, safe sample load for a short distance and note how it actually feels.",
    "fields": [
      {
        "label": "Items and carry setup",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "What happened during the short carry",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "Change to bag or trip plan",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I selected a safe light load.",
      "I carried it myself without strain.",
      "I stopped or adjusted when needed."
    ],
    "output": "A firsthand carry load rehearsal worksheet"
  },
  {
    "id": "rain-entry-trial",
    "name": "Rain Entry Trial",
    "category": "Everyday life",
    "purpose": "Discover where wet umbrellas or shoes create inconvenience at an entrance.",
    "humanAction": "Observe a permitted entrance in wet conditions without creating a slip hazard.",
    "fields": [
      {
        "label": "Entry setting and weather",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "Actual water or storage issue",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "Small safe change to trial",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I observed without creating a hazard.",
      "I noted where water actually collected.",
      "I chose a reversible adjustment."
    ],
    "output": "A firsthand rain entry trial worksheet"
  },
  {
    "id": "shelf-reach-audit",
    "name": "Shelf Reach Audit",
    "category": "Everyday life",
    "purpose": "Check whether a frequently used everyday item can be accessed without awkward reaching.",
    "humanAction": "Retrieve a safe object from a shelf without climbing or stretching beyond comfort.",
    "fields": [
      {
        "label": "Item and normal storage location",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "What was awkward about retrieval",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "Lower or easier placement to try",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I chose an ordinary light item.",
      "I retrieved it without climbing.",
      "I stopped if the reach was uncomfortable."
    ],
    "output": "A firsthand shelf reach audit worksheet"
  },
  {
    "id": "grocery-carry-path",
    "name": "Grocery Carry Path",
    "category": "Everyday life",
    "purpose": "Identify obstacles between a shopping bag's drop-off point and its storage spot.",
    "humanAction": "Walk an ordinary permitted route carrying an empty bag.",
    "fields": [
      {
        "label": "Where the bag starts and ends",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "Obstacles I encountered firsthand",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "One change to the route or storage",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I walked a safe permitted path.",
      "I used an empty or light bag.",
      "I noted real rather than imagined obstacles."
    ],
    "output": "A firsthand grocery carry path worksheet"
  },
  {
    "id": "doorway-handling-check",
    "name": "Doorway Handling Check",
    "category": "Everyday life",
    "purpose": "Assess an ordinary doorway when passing with a non-hazardous everyday object.",
    "humanAction": "Move a light object through a permitted doorway without altering its hardware.",
    "fields": [
      {
        "label": "Door and harmless object",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "What caught or required repositioning",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "Safer arrangement for next attempt",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I had permission to use the doorway.",
      "I chose a light easy-to-control object.",
      "I did not obstruct an exit or force the door."
    ],
    "output": "A firsthand doorway handling check worksheet"
  },
  {
    "id": "seat-and-shade-choice",
    "name": "Seat and Shade Choice",
    "category": "Everyday life",
    "purpose": "Compare how two permitted outdoor sitting spots actually feel at a chosen time.",
    "humanAction": "Sit briefly in safe conditions and make a personal comfort observation.",
    "fields": [
      {
        "label": "Location and time without private details",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "What I noticed at each spot",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "Which spot I would choose and why",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I selected publicly permitted spots.",
      "I compared them firsthand.",
      "I avoided unsafe weather or prolonged exposure."
    ],
    "output": "A firsthand seat and shade choice worksheet"
  },
  {
    "id": "queue-path-observation",
    "name": "Queue Path Observation",
    "category": "Everyday life",
    "purpose": "Discover where a normal queue causes confusion without tracking people.",
    "humanAction": "Observe signage and your own movement through a permitted public queue.",
    "fields": [
      {
        "label": "Queue purpose and entry point",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "Where I hesitated or changed direction",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "Clarity improvement to suggest",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I followed ordinary queue rules.",
      "I recorded my own experience, not identifiable strangers.",
      "I did not interrupt service to perform the check."
    ],
    "output": "A firsthand queue path observation worksheet"
  },
  {
    "id": "basket-handle-fit",
    "name": "Basket Handle Fit",
    "category": "Everyday life",
    "purpose": "Learn whether a shopping basket design feels usable during a short ordinary errand.",
    "humanAction": "Lift and hold an empty or light permitted basket yourself.",
    "fields": [
      {
        "label": "Basket and intended use",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "Grip or balance I actually experienced",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "Alternative handle or carrying choice",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I used an empty or light basket.",
      "I respected store rules.",
      "I stopped if handling became uncomfortable."
    ],
    "output": "A firsthand basket handle fit worksheet"
  },
  {
    "id": "daily-reset-marker",
    "name": "Daily Reset Marker",
    "category": "Everyday life",
    "purpose": "Choose a physical end-of-day cue that makes an everyday shared space ready for tomorrow.",
    "humanAction": "Perform a small harmless reset in a place you are allowed to use.",
    "fields": [
      {
        "label": "Space and reset cue",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "What I actually put back or prepared",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "What I will try tomorrow",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I chose a noncritical task.",
      "I performed the reset myself.",
      "I did not claim another person agreed to maintain it."
    ],
    "output": "A firsthand daily reset marker worksheet"
  },
  {
    "id": "wardrobe-weather-test",
    "name": "Wardrobe Weather Test",
    "category": "Everyday life",
    "purpose": "Check how an ordinary outfit works during a short, safe outing instead of trusting appearance alone.",
    "humanAction": "Wear suitable clothes briefly in safe conditions and assess your own comfort.",
    "fields": [
      {
        "label": "Outfit and expected conditions",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "What felt comfortable or inconvenient",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "What I would change next outing",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I checked weather and my own comfort.",
      "I tried the outfit in normal conditions.",
      "I stopped if exposure became uncomfortable."
    ],
    "output": "A firsthand wardrobe weather test worksheet"
  },
  {
    "id": "bag-pocket-retrieval",
    "name": "Bag Pocket Retrieval",
    "category": "Everyday life",
    "purpose": "Find out whether an everyday bag lets you retrieve a harmless item without unpacking everything.",
    "humanAction": "Place and retrieve a nonvaluable everyday item during a safe stationary trial.",
    "fields": [
      {
        "label": "Bag and harmless item",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "Where retrieval became awkward",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "Pocket layout or item placement to change",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I used a harmless nonvaluable item.",
      "I performed the retrieval myself.",
      "I did not record valuables or access codes."
    ],
    "output": "A firsthand bag pocket retrieval worksheet"
  },
  {
    "id": "household-sound-spot",
    "name": "Household Sound Spot",
    "category": "Everyday life",
    "purpose": "Locate a personally distracting everyday noise through direct observation rather than microphone surveillance.",
    "humanAction": "Listen briefly in a permitted space without recording anyone.",
    "fields": [
      {
        "label": "Room and ordinary activity",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "When and where I noticed the sound",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "Nonintrusive change I might request",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I listened only where permitted.",
      "I did not record conversations.",
      "I differentiated personal discomfort from a measured noise level."
    ],
    "output": "A firsthand household sound spot worksheet"
  },
  {
    "id": "light-placement-trial",
    "name": "Light Placement Trial",
    "category": "Everyday life",
    "purpose": "Check whether moving a safe portable lamp improves an everyday reading or craft task.",
    "humanAction": "Try an already safe portable light without handling wiring or fixtures.",
    "fields": [
      {
        "label": "Task and existing lamp",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "What changed in glare or visibility",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "Position I would use next time",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I did not modify electrical hardware.",
      "I tried a stable safe placement.",
      "I used my own visual experience without claiming compliance."
    ],
    "output": "A firsthand light placement trial worksheet"
  },
  {
    "id": "laundry-symbol-lookup-check",
    "name": "Laundry Symbol Check",
    "category": "Everyday life",
    "purpose": "Connect a real garment's care symbols with a user-chosen safe care plan.",
    "humanAction": "Read the actual care label on a garment you own and choose how to care for it.",
    "fields": [
      {
        "label": "Garment and symbols I can read",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "Anything unclear on its real label",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "Care approach I will take or seek advice on",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I inspected my own garment label.",
      "I did not guess an unreadable symbol.",
      "I chose not to test risky care on valuable items."
    ],
    "output": "A firsthand laundry symbol check worksheet"
  },
  {
    "id": "micro-rest-location",
    "name": "Micro-Rest Location",
    "category": "Everyday life",
    "purpose": "Identify a suitable voluntary rest spot during an ordinary activity based on your own surroundings.",
    "humanAction": "Pause briefly at a safe and permitted location and note practical comfort.",
    "fields": [
      {
        "label": "Activity and possible rest point",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "What I observed about seating and access",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "Rest point I choose or reject",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I used an available permitted spot.",
      "I kept entrances and paths clear.",
      "I based the choice on my own experience."
    ],
    "output": "A firsthand micro-rest location worksheet"
  },
  {
    "id": "label-legibility-shelf",
    "name": "Label Legibility Shelf",
    "category": "Everyday life",
    "purpose": "Check whether your own storage labels are readable in the place they are actually used.",
    "humanAction": "Look at an ordinary non-sensitive label from a normal standing position.",
    "fields": [
      {
        "label": "Stored item and current label",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "What I could or could not read",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "Label wording or location to improve",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I tested the label in actual use.",
      "I avoided putting private information on display.",
      "I rewrote only labels I am allowed to change."
    ],
    "output": "A firsthand label legibility shelf worksheet"
  },
  {
    "id": "morning-object-sequence",
    "name": "Morning Object Sequence",
    "category": "Everyday life",
    "purpose": "Notice which physical items slow down your own ordinary morning task.",
    "humanAction": "Perform a short noncritical routine and log which harmless objects you reached for.",
    "fields": [
      {
        "label": "Routine and items involved",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "Where I searched or repeated a step",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "Placement adjustment I choose",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I followed my own normal routine.",
      "I noted real reach and search points.",
      "I chose one reversible change."
    ],
    "output": "A firsthand morning object sequence worksheet"
  },
  {
    "id": "shared-fridge-zone",
    "name": "Shared Fridge Zone Check",
    "category": "Everyday life",
    "purpose": "See which ordinary shared-fridge items are difficult to find without exposing anyone's personal food information.",
    "humanAction": "Inspect a shared fridge only with permission and discuss a voluntary storage zone.",
    "fields": [
      {
        "label": "Area I may inspect",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "What searching difficulty I actually observed",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "Storage change others agreed to consider",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I obtained permission to inspect.",
      "I avoided touching or listing someone else's private items.",
      "I did not invent a shared storage agreement."
    ],
    "output": "A firsthand shared fridge zone check worksheet"
  },
  {
    "id": "public-bench-use",
    "name": "Public Bench Use Note",
    "category": "Everyday life",
    "purpose": "Document a personal experience of ordinary seating without rating it for everyone.",
    "humanAction": "Use an available public bench briefly and note how it supports your chosen task.",
    "fields": [
      {
        "label": "Bench and purpose in general terms",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "What I noticed while seated",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "Feature I would seek next time",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I used the bench as intended.",
      "I respected others' use of the space.",
      "I described only my experience."
    ],
    "output": "A firsthand public bench use note worksheet"
  },
  {
    "id": "cupboard-visibility-pass",
    "name": "Cupboard Visibility Pass",
    "category": "Everyday life",
    "purpose": "Find hidden or awkwardly placed everyday items through a safe firsthand check.",
    "humanAction": "Open a cupboard you are allowed to use and visually inspect its contents without heavy lifting.",
    "fields": [
      {
        "label": "Cupboard and one intended item",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "What was visible or hard to find",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "One safer placement to test",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I inspected only an authorised cupboard.",
      "I did not move heavy or hazardous objects.",
      "I chose a small reversible arrangement."
    ],
    "output": "A firsthand cupboard visibility pass worksheet"
  },
  {
    "id": "reusable-container-lid",
    "name": "Reusable Container Lid Trial",
    "category": "Everyday life",
    "purpose": "Discover if an ordinary container lid is convenient for your intended storage task.",
    "humanAction": "Open and close an empty clean food-safe container without forcing it.",
    "fields": [
      {
        "label": "Container and intended use",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "What happened during closing and opening",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "Container or storage adjustment I choose",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I used an empty safe container.",
      "I tested the lid myself.",
      "I did not infer leakproof or food safety from this trial."
    ],
    "output": "A firsthand reusable container lid trial worksheet"
  },
  {
    "id": "errand-combination-walk",
    "name": "Errand Combination Walk",
    "category": "Everyday life",
    "purpose": "Discover whether two harmless errands can be combined comfortably on an actual trip.",
    "humanAction": "Perform or rehearse a safe ordinary route between two errands instead of relying solely on estimated travel times.",
    "fields": [
      {
        "label": "Errands and general route",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "Actual pauses or obstacles",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "Whether I would combine them again",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I selected a safe accessible route.",
      "I observed my real travel sequence.",
      "I made no assumptions about another person's availability."
    ],
    "output": "A firsthand errand combination walk worksheet"
  },
  {
    "id": "workspace-clutter-sweep",
    "name": "Workspace Clutter Sweep",
    "category": "Everyday life",
    "purpose": "Identify one physical obstruction that interrupts your own desk task.",
    "humanAction": "Perform a short ordinary task and move only items you own or may rearrange.",
    "fields": [
      {
        "label": "Task and current desk arrangement",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "Obstruction I directly encountered",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "Single reversible adjustment",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I worked in a permitted space.",
      "I moved only authorised items.",
      "I kept cables and electrical equipment safe."
    ],
    "output": "A firsthand workspace clutter sweep worksheet"
  },
  {
    "id": "reusable-bag-fold",
    "name": "Reusable Bag Fold Trial",
    "category": "Everyday life",
    "purpose": "Check how a bag actually folds and fits its intended storage pocket.",
    "humanAction": "Fold an empty reusable bag yourself and measure its practical convenience by use.",
    "fields": [
      {
        "label": "Bag and storage spot",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "What made folding or retrieval tricky",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "Fold or placement I prefer",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I used a clean empty bag.",
      "I tried the fold personally.",
      "I did not claim durability without longer testing."
    ],
    "output": "A firsthand reusable bag fold trial worksheet"
  },
  {
    "id": "household-object-visibility",
    "name": "Household Object Visibility Check",
    "category": "Everyday life",
    "purpose": "Find out whether an often-needed harmless object can be located from its intended use point.",
    "humanAction": "Look for a non-sensitive household item without moving anyone else's belongings.",
    "fields": [
      {
        "label": "Item and place it is needed",
        "hint": "Describe this without private addresses, names or access details."
      },
      {
        "label": "Where I looked and what I actually saw",
        "hint": "Record your firsthand observation, not a prediction."
      },
      {
        "label": "New visible location I can choose",
        "hint": "Choose one next step within your control."
      }
    ],
    "checks": [
      "I searched a space I may use.",
      "I respected other people's belongings.",
      "I recorded my own finding rather than an invented search result."
    ],
    "output": "A firsthand household object visibility check worksheet"
  }
];
