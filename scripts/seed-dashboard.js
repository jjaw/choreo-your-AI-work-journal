const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") })
const { createClient } = require("@supabase/supabase-js")

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const userId = process.argv[2] || process.env.SEED_USER_ID

if (!supabaseUrl || !supabaseKey || !userId) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, or SEED_USER_ID")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const shuffle = (list) => {
  const items = [...list]
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

const pickRandom = (list, count) => shuffle(list).slice(0, count)

const randomCount = (min, max, length) => {
  const upper = clamp(max, min, length)
  const lower = clamp(min, 1, upper)
  return lower + Math.floor(Math.random() * (upper - lower + 1))
}

const reflections = [
  {
    recorded_at: "2026-02-01T18:30:00Z",
    summary: {
      wins: [
        "Closed the onboarding checklist",
        "Drafted the project brief",
        "Aligned stakeholders on milestones",
      ],
      drains: ["Context switching between planning and approvals", "Waiting on approvals"],
      future_focus: ["Share the brief with the team", "Prep kickoff agenda"],
      emotional_tone: "focused",
      energy_level: "medium",
      emotion_confidence: "high",
    },
    tasks: [
      { task_text: "Close onboarding checklist", category: "organizing" },
      { task_text: "Draft project brief", category: "creating" },
      { task_text: "Approval sync with ops", category: "collaborating" },
      { task_text: "Message team about next steps", category: "communicating" },
      { task_text: "Align stakeholders on milestones", category: "collaborating" },
    ],
  },
  {
    recorded_at: "2026-02-02T19:10:00Z",
    summary: {
      wins: ["Shipped the landing page update", "Fixed the auth redirect bug", "Deployed hotfix"],
      drains: ["Back-to-back standups", "Context switching between incidents"],
      future_focus: ["Refactor the profile settings flow", "Clean up auth edge cases"],
      emotional_tone: "relieved",
      energy_level: "low",
      emotion_confidence: "medium",
    },
    tasks: [
      { task_text: "Ship landing page update", category: "creating" },
      { task_text: "Fix auth redirect bug", category: "creating" },
      { task_text: "Daily standup meeting", category: "collaborating" },
      { task_text: "Respond to bug triage thread", category: "communicating" },
      { task_text: "Deploy hotfix", category: "creating" },
    ],
  },
  {
    recorded_at: "2026-02-03T20:05:00Z",
    summary: {
      wins: ["Finalized the onboarding flow", "Polished empty state visuals", "Locked icon set"],
      drains: ["Long design review cycles", "Feedback arriving late"],
      future_focus: ["Prepare handoff to engineering", "Create interaction specs"],
      emotional_tone: "proud",
      energy_level: "medium",
      emotion_confidence: "high",
    },
    tasks: [
      { task_text: "Finalize onboarding flow", category: "creating" },
      { task_text: "Polish empty state visuals", category: "creating" },
      { task_text: "Design review with mobile team", category: "collaborating" },
      { task_text: "Send handoff notes to engineering", category: "communicating" },
      { task_text: "Lock icon set", category: "creating" },
    ],
  },
  {
    recorded_at: "2026-02-04T18:45:00Z",
    summary: {
      wins: ["Ran two successful product demos", "Closed the renewal with Redwood", "Expanded upsell scope"],
      drains: ["Chasing late-stage pricing approvals", "Long procurement loop"],
      future_focus: ["Update the pipeline forecast", "Draft renewal recap"],
      emotional_tone: "energized",
      energy_level: "high",
      emotion_confidence: "medium",
    },
    tasks: [
      { task_text: "Run product demos", category: "collaborating" },
      { task_text: "Close Redwood renewal", category: "collaborating" },
      { task_text: "Request pricing approvals", category: "communicating" },
      { task_text: "Update pipeline forecast", category: "organizing" },
      { task_text: "Expand upsell scope", category: "collaborating" },
    ],
  },
  {
    recorded_at: "2026-02-05T21:00:00Z",
    summary: {
      wins: ["Built the revenue cohort dashboard", "Validated churn model inputs", "Cleaned data anomalies"],
      drains: ["Rework due to inconsistent source data", "Late data refresh"],
      future_focus: ["Share insights with finance", "Automate cohort refresh"],
      emotional_tone: "steady",
      energy_level: "medium",
      emotion_confidence: "high",
    },
    tasks: [
      { task_text: "Build revenue cohort dashboard", category: "creating" },
      { task_text: "Validate churn model inputs", category: "creating" },
      { task_text: "Document data inconsistencies", category: "organizing" },
      { task_text: "Send insights summary to finance", category: "communicating" },
      { task_text: "Clean data anomalies", category: "organizing" },
    ],
  },
  {
    recorded_at: "2026-02-06T18:20:00Z",
    summary: {
      wins: ["Resolved a critical support escalation", "Updated the runbook", "Closed follow-up ticket"],
      drains: ["Customer call ran long", "Urgent escalations piling up"],
      future_focus: ["Draft escalation playbook update", "Schedule support retro"],
      emotional_tone: "focused",
      energy_level: "medium",
      emotion_confidence: "medium",
    },
    tasks: [
      { task_text: "Resolve critical support escalation", category: "collaborating" },
      { task_text: "Update incident runbook", category: "organizing" },
      { task_text: "Follow up with customer", category: "communicating" },
      { task_text: "Draft escalation playbook update", category: "creating" },
      { task_text: "Close follow-up ticket", category: "organizing" },
    ],
  },
  {
    recorded_at: "2026-02-07T19:40:00Z",
    summary: {
      wins: ["Finished the Q2 roadmap deck", "Aligned priorities with leadership", "Confirmed staffing plan"],
      drains: ["Too many late-day context switches", "Last-minute edits"],
      future_focus: ["Plan next sprint kickoff", "Share roadmap notes"],
      emotional_tone: "accomplished",
      energy_level: "medium",
      emotion_confidence: "high",
    },
    tasks: [
      { task_text: "Finish Q2 roadmap deck", category: "creating" },
      { task_text: "Leadership alignment meeting", category: "collaborating" },
      { task_text: "Reply to follow-up questions", category: "communicating" },
      { task_text: "Plan next sprint kickoff", category: "organizing" },
      { task_text: "Confirm staffing plan", category: "organizing" },
    ],
  },
  {
    recorded_at: "2026-02-08T20:15:00Z",
    summary: {
      wins: ["Polished the launch checklist", "Queued the announcement email", "Reviewed launch assets"],
      drains: ["Waiting on final approvals", "Press timing uncertainty"],
      future_focus: ["Schedule launch retro", "Prep post-launch survey"],
      emotional_tone: "steady",
      energy_level: "low",
      emotion_confidence: "medium",
    },
    tasks: [
      { task_text: "Polish launch checklist", category: "organizing" },
      { task_text: "Queue announcement email", category: "communicating" },
      { task_text: "Review launch assets", category: "creating" },
      { task_text: "Schedule launch retro", category: "organizing" },
      { task_text: "Prep post-launch survey", category: "organizing" },
    ],
  },
]

const insertReflection = async (reflection) => {
  const { data: voiceNote, error: voiceError } = await supabase
    .from("voice_notes")
    .insert({
      user_id: userId,
      recorded_at: reflection.recorded_at,
      audio_file_size_mb: 0,
      duration_seconds: 180,
    })
    .select("id")
    .single()

  if (voiceError) throw voiceError

  const { data: transcription, error: transcriptionError } = await supabase
    .from("transcriptions")
    .insert({
      voice_note_id: voiceNote.id,
      user_id: userId,
      transcription_text: "Seeded reflection transcript.",
      word_count: 5,
      model_used: "seed",
    })
    .select("id")
    .single()

  if (transcriptionError) throw transcriptionError

  const summaryPayload = reflection.summary
  const wins = pickRandom(
    summaryPayload.wins,
    randomCount(1, 3, summaryPayload.wins.length)
  )
  const drains = pickRandom(
    summaryPayload.drains,
    randomCount(1, 2, summaryPayload.drains.length)
  )
  const futureFocus = pickRandom(
    summaryPayload.future_focus,
    randomCount(1, 2, summaryPayload.future_focus.length)
  )
  const { error: summaryError } = await supabase.from("daily_summaries").insert({
    voice_note_id: voiceNote.id,
    user_id: userId,
    wins,
    drains,
    future_focus: futureFocus,
    emotional_tone: summaryPayload.emotional_tone,
    energy_level: summaryPayload.energy_level,
    emotion_confidence: summaryPayload.emotion_confidence,
    original_wins: wins,
    original_drains: drains,
    original_future_focus: futureFocus,
  })

  if (summaryError) throw summaryError

  const taskRows = pickRandom(
    reflection.tasks,
    randomCount(3, reflection.tasks.length, reflection.tasks.length)
  ).map((task) => ({
    transcription_id: transcription.id,
    user_id: userId,
    task_text: task.task_text,
    category: task.category,
    confidence: "high",
    ai_extracted: false,
    human_validated: true,
    human_accepted: true,
  }))

  const { error: taskError } = await supabase.from("tasks").insert(taskRows)
  if (taskError) throw taskError
}

const run = async () => {
  for (const reflection of reflections) {
    await insertReflection(reflection)
  }
  console.log("Seeded reflections for user:", userId)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
