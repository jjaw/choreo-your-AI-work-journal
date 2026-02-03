const fs = require("fs")
const path = require("path")

const baseScenarios = [
  {
    role: "product designer",
    wins: ["Finalized the onboarding flow", "Polished the empty state illustrations"],
    drains: ["Context switching between design reviews"],
    future_focus: ["Prepare the handoff for engineering"],
    tasks: [
      { task_text: "Finalize onboarding flow", category: "creating" },
      { task_text: "Polish empty state illustrations", category: "creating" },
      { task_text: "Design review with mobile team", category: "collaborating" },
      { task_text: "Send handoff notes to engineering", category: "communicating" },
    ],
  },
  {
    role: "frontend engineer",
    wins: ["Shipped the landing page update", "Fixed the auth redirect bug"],
    drains: ["Back-to-back standups"],
    future_focus: ["Refactor the profile settings module"],
    tasks: [
      { task_text: "Ship landing page update", category: "creating" },
      { task_text: "Fix auth redirect bug", category: "creating" },
      { task_text: "Daily standup meeting", category: "collaborating" },
      { task_text: "Review PR for analytics events", category: "collaborating" },
    ],
  },
  {
    role: "marketing manager",
    wins: ["Drafted the Q2 campaign brief", "Locked the influencer shortlist"],
    drains: ["A long vendor negotiation call"],
    future_focus: ["Get legal approval for ad copy"],
    tasks: [
      { task_text: "Draft Q2 campaign brief", category: "creating" },
      { task_text: "Finalize influencer shortlist", category: "organizing" },
      { task_text: "Vendor negotiation call", category: "collaborating" },
      { task_text: "Email legal about ad copy review", category: "communicating" },
    ],
  },
  {
    role: "operations lead",
    wins: ["Updated the weekly staffing plan", "Cleared the backlog of approvals"],
    drains: ["Chasing missing timesheets"],
    future_focus: ["Automate the approval workflow"],
    tasks: [
      { task_text: "Update weekly staffing plan", category: "organizing" },
      { task_text: "Approve pending time off requests", category: "organizing" },
      { task_text: "Follow up on missing timesheets", category: "communicating" },
      { task_text: "Sync with HR on scheduling gaps", category: "collaborating" },
    ],
  },
  {
    role: "customer success",
    wins: ["Onboarded the new enterprise account", "Resolved two critical tickets"],
    drains: ["Late-night escalation with support"],
    future_focus: ["Draft the quarterly health report"],
    tasks: [
      { task_text: "Onboard new enterprise account", category: "collaborating" },
      { task_text: "Resolve critical support tickets", category: "creating" },
      { task_text: "Escalation call with support", category: "collaborating" },
      { task_text: "Outline quarterly health report", category: "creating" },
    ],
  },
  {
    role: "data analyst",
    wins: ["Built the revenue cohort dashboard", "Validated the churn model inputs"],
    drains: ["Rework due to inconsistent source data"],
    future_focus: ["Share insights with finance"],
    tasks: [
      { task_text: "Build revenue cohort dashboard", category: "creating" },
      { task_text: "Validate churn model inputs", category: "creating" },
      { task_text: "Document data inconsistencies", category: "organizing" },
      { task_text: "Send insights summary to finance", category: "communicating" },
    ],
  },
  {
    role: "project manager",
    wins: ["Aligned the roadmap with stakeholders", "Closed sprint scope"],
    drains: ["Too many ad-hoc status checks"],
    future_focus: ["Prepare sprint kickoff agenda"],
    tasks: [
      { task_text: "Roadmap alignment meeting", category: "collaborating" },
      { task_text: "Close sprint scope", category: "organizing" },
      { task_text: "Respond to status check emails", category: "communicating" },
      { task_text: "Draft sprint kickoff agenda", category: "organizing" },
    ],
  },
  {
    role: "nurse lead",
    wins: ["Completed patient discharge summaries", "Updated medication charts before rounds"],
    drains: ["Extended wound care rounds"],
    future_focus: ["Prepare training notes for new staff"],
    tasks: [
      { task_text: "Complete patient discharge summaries", category: "creating" },
      { task_text: "Update medication charts", category: "organizing" },
      { task_text: "Wound care rounds", category: "creating" },
      { task_text: "Brief new staff on protocol changes", category: "communicating" },
    ],
  },
  {
    role: "research lead",
    wins: ["Synthesized interview insights", "Drafted the methodology section"],
    drains: ["Long IRB compliance review"],
    future_focus: ["Plan the next participant wave"],
    tasks: [
      { task_text: "Synthesize interview insights", category: "creating" },
      { task_text: "Draft methodology section", category: "creating" },
      { task_text: "IRB compliance review meeting", category: "collaborating" },
      { task_text: "Plan next participant wave", category: "organizing" },
    ],
  },
  {
    role: "founder",
    wins: ["Closed a pilot customer", "Updated the investor deck"],
    drains: ["Travel logistics for the demo day"],
    future_focus: ["Finalize the pricing page"],
    tasks: [
      { task_text: "Close pilot customer", category: "collaborating" },
      { task_text: "Update investor deck", category: "creating" },
      { task_text: "Book demo day travel", category: "organizing" },
      { task_text: "Iterate pricing page copy", category: "creating" },
    ],
  },
  {
    role: "HR partner",
    wins: ["Finalized the onboarding checklist", "Completed two performance reviews"],
    drains: ["Backlog of compliance paperwork"],
    future_focus: ["Schedule manager training session"],
    tasks: [
      { task_text: "Finalize onboarding checklist", category: "organizing" },
      { task_text: "Complete performance reviews", category: "collaborating" },
      { task_text: "Process compliance paperwork", category: "organizing" },
      { task_text: "Schedule manager training session", category: "organizing" },
    ],
  },
  {
    role: "sales lead",
    wins: ["Ran two successful product demos", "Closed the renewal with Redwood"],
    drains: ["Chasing late-stage pricing approvals"],
    future_focus: ["Update the pipeline forecast"],
    tasks: [
      { task_text: "Run product demos", category: "collaborating" },
      { task_text: "Close Redwood renewal", category: "collaborating" },
      { task_text: "Request pricing approvals", category: "communicating" },
      { task_text: "Update pipeline forecast", category: "organizing" },
    ],
  },
  {
    role: "operations analyst",
    wins: ["Mapped the supply chain bottlenecks", "Cleaned the vendor list"],
    drains: ["Spreadsheet cleanup took too long"],
    future_focus: ["Automate vendor scoring"],
    tasks: [
      { task_text: "Map supply chain bottlenecks", category: "creating" },
      { task_text: "Clean vendor list", category: "organizing" },
      { task_text: "Audit procurement spreadsheet", category: "organizing" },
      { task_text: "Draft vendor scoring framework", category: "creating" },
    ],
  },
  {
    role: "content strategist",
    wins: ["Outlined the February editorial calendar", "Published the FAQ update"],
    drains: ["Multiple last-minute edits"],
    future_focus: ["Coordinate the webinar copy"],
    tasks: [
      { task_text: "Outline February editorial calendar", category: "organizing" },
      { task_text: "Publish FAQ update", category: "creating" },
      { task_text: "Handle last-minute edits", category: "communicating" },
      { task_text: "Coordinate webinar copy", category: "collaborating" },
    ],
  },
  {
    role: "engineering manager",
    wins: ["Unblocked the infra rollout", "Coached two ICs through review feedback"],
    drains: ["Incident response during lunch"],
    future_focus: ["Plan the next architecture review"],
    tasks: [
      { task_text: "Unblock infra rollout", category: "collaborating" },
      { task_text: "Coach ICs on review feedback", category: "collaborating" },
      { task_text: "Handle incident response", category: "creating" },
      { task_text: "Plan architecture review", category: "organizing" },
    ],
  },
]

const fillers = [
  "It felt like a steady day overall.",
  "The morning was a blur but the afternoon clicked.",
  "I was juggling a few things at once.",
  "I had to switch gears more than I wanted to.",
  "It was productive but a bit draining.",
]

const openers = [
  "So, quick recap of my day.",
  "Alright, here's how today went.",
  "Okay, let me think this through.",
  "Short version of today.",
  "If I zoom out on the day.",
]

const middles = [
  "I kept bouncing between tasks.",
  "There were a few interruptions.",
  "I had to pause and circle back a couple times.",
  "Some things took longer than expected.",
  "I tried to keep momentum where I could.",
]

const humanTouches = [
  "Honestly, that took more energy than I expected.",
  "It was satisfying but also a little exhausting.",
  "I felt like I was in the weeds for a bit.",
  "I wish I had a longer uninterrupted block.",
  "Overall it felt solid, just busy.",
]

const closers = [
  "Tomorrow I want to start fresh on that focus item.",
  "I need to make sure I follow through first thing tomorrow.",
  "That’s the main thing I want to tackle next.",
  "I’m hoping to carve out time for that tomorrow.",
  "That’s the big item for the next session.",
]

const makeTranscript = (scenario, variant) => {
  const filler = fillers[variant % fillers.length]
  const opener = openers[variant % openers.length]
  const middle = middles[(variant + 2) % middles.length]
  const humanTouch = humanTouches[(variant + 3) % humanTouches.length]
  const closer = closers[variant % closers.length]
  const wins = scenario.wins.join(" and ")
  const drains = scenario.drains.join(" and ")
  const focus = scenario.future_focus.join(" and ")
  const taskMentions = scenario.tasks
    .map((task) => task.task_text)
    .slice(0, 3)
    .join(", ")
  const extraTask = scenario.tasks[scenario.tasks.length - 1]?.task_text ?? ""

  return [
    `${opener} Today as a ${scenario.role}, ${filler.toLowerCase()}`,
    `Big wins were ${wins.toLowerCase()}, which was great.`,
    `I also spent time on ${taskMentions.toLowerCase()}. ${middle.toLowerCase()}`,
    `One more thing I handled was ${extraTask.toLowerCase()}.`,
    `The main drain was ${drains.toLowerCase()}. ${humanTouch.toLowerCase()}`,
    `Next up, I need to ${focus.toLowerCase()}. ${closer}`,
  ].join(" ")
}

const dataset = []
let index = 1

baseScenarios.forEach((scenario) => {
  for (let variant = 0; variant < 2; variant += 1) {
    const id = `sample_${String(index).padStart(2, "0")}`
    dataset.push({
      id,
      role: scenario.role,
      transcript: makeTranscript(scenario, variant),
      ground_truth: {
        wins: scenario.wins,
        drains: scenario.drains,
        future_focus: scenario.future_focus,
        tasks: scenario.tasks,
      },
    })
    index += 1
  }
})

const output = {
  version: "v1",
  created_at: new Date().toISOString(),
  samples: dataset,
}

const outputPath = path.join(__dirname, "..", "dataset", "eval_dataset.json")
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
console.log(`Wrote ${dataset.length} samples to ${outputPath}`)
