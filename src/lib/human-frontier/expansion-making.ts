import type { HumanTool } from './registry';
/** 25 hands-on making and learning workflows, all non-executable by agents. */
export const FRONTIER_MAKING_25: readonly HumanTool[] = [
  {
    "id": "cardboard-joint-trial",
    "name": "Cardboard Joint Trial",
    "category": "Making & learning",
    "purpose": "Compare two safe ways of joining paperboard through a real hands-on prototype.",
    "humanAction": "Make and bend a small cardboard joint using safe craft supplies.",
    "fields": [
      {
        "label": "Two joint styles and intended use",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "How each joint moved or separated",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "Joint I would prototype again",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "I used safe simple craft materials.",
      "I tried both joint styles myself.",
      "I did not claim structural strength from a small trial."
    ],
    "output": "A firsthand cardboard joint trial practice record"
  },
  {
    "id": "folded-paper-wayfinder",
    "name": "Folded Paper Wayfinder",
    "category": "Making & learning",
    "purpose": "See whether a folded paper instruction survives actual handling and still makes sense.",
    "humanAction": "Fold an ordinary paper guide and ask a willing person to navigate its pages.",
    "fields": [
      {
        "label": "Guide and folding layout",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "Where the reader searched or lost the sequence",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "Fold or heading to alter",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "I tested a real paper version.",
      "The reader opted into the trial.",
      "I did not use this for safety-critical directions."
    ],
    "output": "A firsthand folded paper wayfinder practice record"
  },
  {
    "id": "colour-under-daylight",
    "name": "Colour Under Daylight",
    "category": "Making & learning",
    "purpose": "Compare actual material or paint sample appearance in ordinary daylight.",
    "humanAction": "Look at safe samples in permitted natural light without staring into bright light.",
    "fields": [
      {
        "label": "Samples and intended setting",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "Colours I observed at the chosen time",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "Sample I want to compare again",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "I inspected actual samples.",
      "I noted time and lighting.",
      "I avoided treating subjective appearance as a calibrated measurement."
    ],
    "output": "A firsthand colour under daylight practice record"
  },
  {
    "id": "handwritten-form-trial",
    "name": "Handwritten Form Trial",
    "category": "Making & learning",
    "purpose": "Discover whether a noncritical paper form gives enough room for real handwriting.",
    "humanAction": "Fill in a blank practice form using invented test data only.",
    "fields": [
      {
        "label": "Form version and harmless test entry",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "Boxes or prompts that felt cramped",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "Layout change to test next",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "I used fictional practice data.",
      "I filled the form by hand.",
      "I did not submit or alter an official form."
    ],
    "output": "A firsthand handwritten form trial practice record"
  },
  {
    "id": "safe-knot-memory",
    "name": "Safe Knot Memory Practice",
    "category": "Making & learning",
    "purpose": "See whether you can remember a harmless decorative knot after a live demonstration.",
    "humanAction": "Tie and untie a decorative knot with soft string away from people, animals and loads.",
    "fields": [
      {
        "label": "Decorative knot and demonstration",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "Steps I recalled without looking",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "What I would practise next",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "I used soft string only.",
      "I tied and untied it myself.",
      "I did not use it for climbing, restraint or load bearing."
    ],
    "output": "A firsthand safe knot memory practice practice record"
  },
  {
    "id": "button-press-feedback",
    "name": "Button Press Feedback Trial",
    "category": "Making & learning",
    "purpose": "Test the physical feedback of a harmless prototype button instead of relying on a screen design.",
    "humanAction": "Press a safe unpowered mock button and observe its mechanical feel.",
    "fields": [
      {
        "label": "Mock button and expected response",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "What I felt or heard on pressing",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "Physical feedback change to try",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "I used a safe unpowered mock-up.",
      "I tried it myself.",
      "I did not infer electrical reliability or accessibility compliance."
    ],
    "output": "A firsthand button press feedback trial practice record"
  },
  {
    "id": "marker-visibility-trial",
    "name": "Marker Visibility Trial",
    "category": "Making & learning",
    "purpose": "Learn whether a temporary removable marker is noticeable during a real ordinary task.",
    "humanAction": "Place a removable noncritical marker on an item you own and attempt to find it.",
    "fields": [
      {
        "label": "Item and safe marker type",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "Where I noticed or missed it",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "Placement I would change",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "I used a removable harmless marker.",
      "I tested it in ordinary conditions.",
      "I did not alter safety or official markings."
    ],
    "output": "A firsthand marker visibility trial practice record"
  },
  {
    "id": "prototype-one-hand",
    "name": "One-Hand Prototype Trial",
    "category": "Making & learning",
    "purpose": "Observe whether a safe household prototype can be operated with one hand without assuming anyone else's needs.",
    "humanAction": "Attempt a low-risk one-handed operation on a harmless prototype while keeping the other hand free.",
    "fields": [
      {
        "label": "Prototype and intended action",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "What I could actually operate",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "Feature I would redesign",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "I chose a safe stable prototype.",
      "I stopped if the task required force.",
      "I did not claim to represent people with disabilities."
    ],
    "output": "A firsthand one-hand prototype trial practice record"
  },
  {
    "id": "paper-template-alignment",
    "name": "Paper Template Alignment",
    "category": "Making & learning",
    "purpose": "Check how a hand-cut paper template lines up against a safe object.",
    "humanAction": "Place a paper template against an unpowered nonhazardous object and note fit.",
    "fields": [
      {
        "label": "Template and reference object",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "Edges or holes that did not align",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "Template change to trial",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "I used a harmless object.",
      "I checked alignment physically.",
      "I did not infer manufacturing tolerances or structural safety."
    ],
    "output": "A firsthand paper template alignment practice record"
  },
  {
    "id": "instruction-order-swap",
    "name": "Instruction Order Swap",
    "category": "Making & learning",
    "purpose": "Discover if reversing two harmless preparation steps makes a task simpler in practice.",
    "humanAction": "Perform two low-risk versions of a short task yourself and note differences.",
    "fields": [
      {
        "label": "Task and two sequences",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "What happened during both attempts",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "Sequence I prefer to test further",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "I used a reversible safe task.",
      "I tried both sequences.",
      "I did not claim a universal result from one trial."
    ],
    "output": "A firsthand instruction order swap practice record"
  },
  {
    "id": "model-scale-handcheck",
    "name": "Model Scale Handcheck",
    "category": "Making & learning",
    "purpose": "Feel whether a small physical model conveys the intended proportions when held.",
    "humanAction": "Handle an unpowered harmless scale mock-up in a safe area.",
    "fields": [
      {
        "label": "Mock-up and intended real object",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "Which proportions felt misleading",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "Scale or shape adjustment to make",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "I held an actual safe mock-up.",
      "I compared proportions rather than inferred engineering safety.",
      "I recorded my own judgment."
    ],
    "output": "A firsthand model scale handcheck practice record"
  },
  {
    "id": "container-pour-test",
    "name": "Container Pour Test",
    "category": "Making & learning",
    "purpose": "Find whether an empty or water-only vessel pours cleanly in a low-risk trial.",
    "humanAction": "Pour a small amount of ordinary water into a safe sink or receptacle.",
    "fields": [
      {
        "label": "Vessel and test amount",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "Where water went during the actual pour",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "Spout or grip adjustment",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "I used clean water and a safe area.",
      "I performed the pour myself.",
      "I cleaned up any spills promptly."
    ],
    "output": "A firsthand container pour test practice record"
  },
  {
    "id": "handmade-hinge-check",
    "name": "Handmade Hinge Check",
    "category": "Making & learning",
    "purpose": "Observe the motion of a harmless paper or cardboard hinge through a short manual cycle.",
    "humanAction": "Open and close a simple craft hinge a few times without loading it.",
    "fields": [
      {
        "label": "Hinge concept and material",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "How its motion changed",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "Next geometry change",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "I used safe lightweight craft material.",
      "I moved the hinge by hand.",
      "I did not claim long-term durability."
    ],
    "output": "A firsthand handmade hinge check practice record"
  },
  {
    "id": "tool-free-assembly-pass",
    "name": "Tool-Free Assembly Pass",
    "category": "Making & learning",
    "purpose": "Check whether a safe mock-up can be assembled without tools by a real person.",
    "humanAction": "Assemble an unpowered nonhazardous prototype using only its intended hand-fit parts.",
    "fields": [
      {
        "label": "Parts and intended assembly",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "Where pieces failed to align",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "Connector I would redesign",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "I used only safe mock parts.",
      "I tested the fit physically.",
      "I did not force or damage components."
    ],
    "output": "A firsthand tool-free assembly pass practice record"
  },
  {
    "id": "texture-identification-test",
    "name": "Texture Identification Test",
    "category": "Making & learning",
    "purpose": "See whether two harmless textured samples can be differentiated through touch in a safe experiment.",
    "humanAction": "Handle two clean safe samples while looking away and record your own observations.",
    "fields": [
      {
        "label": "Samples and proposed contrast",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "What I actually distinguished",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "Texture change worth trying",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "I used clean safe materials.",
      "I stopped if either sample felt uncomfortable.",
      "I did not claim a clinical sensory assessment."
    ],
    "output": "A firsthand texture identification test practice record"
  },
  {
    "id": "low-stakes-sign-prototype",
    "name": "Temporary Sign Prototype",
    "category": "Making & learning",
    "purpose": "Test a removable informal label before adopting it in a permitted shared space.",
    "humanAction": "Place a nonofficial temporary sign where authorised and ask a willing person what they notice.",
    "fields": [
      {
        "label": "Sign and approved location",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "What reader noticed before prompting",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "Change in size or position",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "I got permission for placement.",
      "I observed real reader feedback.",
      "I removed the prototype after the trial."
    ],
    "output": "A firsthand temporary sign prototype practice record"
  },
  {
    "id": "handle-width-mock",
    "name": "Handle Width Mock-Up",
    "category": "Making & learning",
    "purpose": "Learn which handle width feels practical using a safe nonfunctional prototype.",
    "humanAction": "Hold two lightweight foam or cardboard mock handles during a stationary trial.",
    "fields": [
      {
        "label": "Two handle dimensions",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "How each felt during holding",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "Width I would test next",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "I used light harmless mock-ups.",
      "I compared them directly.",
      "I did not infer load-bearing suitability."
    ],
    "output": "A firsthand handle width mock-up practice record"
  },
  {
    "id": "card-sort-structure",
    "name": "Physical Card Sort Structure",
    "category": "Making & learning",
    "purpose": "Discover how a willing person groups tangible information cards without imposing an AI taxonomy.",
    "humanAction": "Give a participant non-sensitive topic cards and invite them to arrange them freely.",
    "fields": [
      {
        "label": "Card set and navigation goal",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "Groups they actually created",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "Structure I would retest",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "The participant opted in.",
      "I used non-sensitive labels.",
      "I did not invent an interpretation of their reasoning."
    ],
    "output": "A firsthand physical card sort structure practice record"
  },
  {
    "id": "silent-gesture-rehearsal",
    "name": "Silent Gesture Rehearsal",
    "category": "Making & learning",
    "purpose": "Test whether a voluntary noncritical hand signal is understood in a safe practice setting.",
    "humanAction": "Agree on a simple gesture with a willing partner and rehearse it once.",
    "fields": [
      {
        "label": "Gesture and intended everyday message",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "What the partner actually understood",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "Change both people accepted",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "The partner chose to participate.",
      "I checked actual understanding.",
      "I did not use this for emergency communication."
    ],
    "output": "A firsthand silent gesture rehearsal practice record"
  },
  {
    "id": "material-edge-comfort",
    "name": "Material Edge Comfort",
    "category": "Making & learning",
    "purpose": "Find which safe softened edge feels pleasant while handling a harmless object.",
    "humanAction": "Handle pre-smoothed sample edges and note personal comfort.",
    "fields": [
      {
        "label": "Object and edge shapes",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "Which edge felt awkward",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "Profile to prototype next",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "I used only nonsharp smooth samples.",
      "I avoided cutting or sanding during the trial.",
      "I did not claim industrial safety approval."
    ],
    "output": "A firsthand material edge comfort practice record"
  },
  {
    "id": "prototype-storage-fit",
    "name": "Prototype Storage Fit",
    "category": "Making & learning",
    "purpose": "Check whether a harmless mock object actually fits a chosen storage space.",
    "humanAction": "Place a lightweight cardboard mock-up inside an authorised empty storage area.",
    "fields": [
      {
        "label": "Mock-up and storage space",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "Actual clearance or orientation issue",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "Size adjustment to try",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "I used an empty permitted storage space.",
      "I tested physical fit without force.",
      "I did not move restricted or heavy items."
    ],
    "output": "A firsthand prototype storage fit practice record"
  },
  {
    "id": "manual-timing-observation",
    "name": "Manual Timing Observation",
    "category": "Making & learning",
    "purpose": "Compare the felt effort of two short harmless task methods through your own trials.",
    "humanAction": "Perform both versions of a safe ordinary task and note where effort went.",
    "fields": [
      {
        "label": "Two task methods",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "Steps that felt longer or more awkward",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "Method I would practise next",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "I attempted both methods myself.",
      "I used no hidden automated completion.",
      "I did not claim statistically reliable timing."
    ],
    "output": "A firsthand manual timing observation practice record"
  },
  {
    "id": "paper-prototype-annotation",
    "name": "Paper Prototype Annotation Walk",
    "category": "Making & learning",
    "purpose": "Find which parts of a hand-drawn interface are confusing through real pointing and conversation.",
    "humanAction": "Ask a willing person to point to where they would begin on a paper sketch.",
    "fields": [
      {
        "label": "Sketch and target action",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "First place the person actually pointed",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "Element I would redraw",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "The participant opted in.",
      "I observed before explaining.",
      "I avoided collecting private task data."
    ],
    "output": "A firsthand paper prototype annotation walk practice record"
  },
  {
    "id": "safe-surface-slide",
    "name": "Safe Surface Slide Trial",
    "category": "Making & learning",
    "purpose": "Compare how two soft lightweight objects move over a permitted tabletop.",
    "humanAction": "Gently slide harmless samples on an empty stable surface and observe their motion.",
    "fields": [
      {
        "label": "Samples and tabletop",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "What happened on each slide",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "Surface or shape adjustment",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "I used light nonbreakable samples.",
      "I kept the area clear of hazards.",
      "I did not infer vehicle or industrial friction safety."
    ],
    "output": "A firsthand safe surface slide trial practice record"
  },
  {
    "id": "manual-practice-retell",
    "name": "Manual Practice Retell",
    "category": "Making & learning",
    "purpose": "Identify which step of a newly learned harmless task you can genuinely recall unaided.",
    "humanAction": "After one safe practice attempt, narrate the sequence in your own words without consulting notes.",
    "fields": [
      {
        "label": "Task practised",
        "hint": "Describe your real material, mock-up or learning situation."
      },
      {
        "label": "Steps I recalled or forgot",
        "hint": "Record the actual attempt or learner response."
      },
      {
        "label": "Step to repeat next session",
        "hint": "Name one safe, testable next revision."
      }
    ],
    "checks": [
      "I completed one real safe practice.",
      "I retold it in my own words.",
      "I did not misrepresent recall as professional proficiency."
    ],
    "output": "A firsthand manual practice retell practice record"
  }
];
