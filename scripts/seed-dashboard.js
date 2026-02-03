const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") })
const { createClient } = require("@supabase/supabase-js")

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const userId = process.env.SEED_USER_ID

if (!supabaseUrl || !supabaseKey || !userId) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, or SEED_USER_ID")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const reflections = [
  {
    recorded_at: "2026-02-01T18:30:00Z",
    summary: {
      wins: ["Closed the onboarding checklist", "Drafted the project brief"],
      drains: ["Context switching between planning and approvals"],
      future_focus: ["Share the brief with the team"],
      emotional_tone: "focused",
      energy_level: "medium",
      emotion_confidence: "high",
    },
    tasks: [
      { task_text: "Close onboarding checklist", category: "organizing" },
      { task_text: "Draft project brief", category: "creating" },
      { task_text: "Approval sync with ops", category: "collaborating" },
      { task_text: "Message team about next steps", category: "communicating" },
    ],
  },
  {
    recorded_at: "2026-02-02T19:10:00Z",
    summary: {
      wins: ["Shipped the landing page update", "Fixed the auth redirect bug"],
      drains: ["Back-to-back standups"],
      future_focus: ["Refactor the profile settings flow"],
      emotional_tone: "relieved",
      energy_level: "low",
      emotion_confidence: "medium",
    },
    tasks: [
      { task_text: "Ship landing page update", category: "creating" },
      { task_text: "Fix auth redirect bug", category: "creating" },
      { task_text: "Daily standup meeting", category: "collaborating" },
      { task_text: "Respond to bug triage thread", category: "communicating" },
    ],
  },
  {
    recorded_at: "2026-02-03T20:05:00Z",
    summary: {
      wins: ["Finalized the onboarding flow", "Polished empty state visuals"],
      drains: ["Long design review cycles"],
      future_focus: ["Prepare handoff to engineering"],
      emotional_tone: "proud",
      energy_level: "medium",
      emotion_confidence: "high",
    },
    tasks: [
      { task_text: "Finalize onboarding flow", category: "creating" },
      { task_text: "Polish empty state visuals", category: "creating" },
      { task_text: "Design review with mobile team", category: "collaborating" },
      { task_text: "Send handoff notes to engineering", category: "communicating" },
    ],
  },
  {
    recorded_at: "2026-02-04T18:45:00Z",
    summary: {
      wins: ["Ran two successful product demos", "Closed the renewal with Redwood"],
      drains: ["Chasing late-stage pricing approvals"],
      future_focus: ["Update the pipeline forecast"],
      emotional_tone: "energized",
      energy_level: "high",
      emotion_confidence: "medium",
    },
    tasks: [
      { task_text: "Run product demos", category: "collaborating" },
      { task_text: "Close Redwood renewal", category: "collaborating" },
      { task_text: "Request pricing approvals", category: "communicating" },
      { task_text: "Update pipeline forecast", category: "organizing" },
    ],
  },
  {
    recorded_at: "2026-02-05T21:00:00Z",
    summary: {
      wins: ["Built the revenue cohort dashboard", "Validated churn model inputs"],
      drains: ["Rework due to inconsistent source data"],
      future_focus: ["Share insights with finance"],
      emotional_tone: "steady",
      energy_level: "medium",
      emotion_confidence: "high",
    },
    tasks: [
      { task_text: "Build revenue cohort dashboard", category: "creating" },
      { task_text: "Validate churn model inputs", category: "creating" },
      { task_text: "Document data inconsistencies", category: "organizing" },
      { task_text: "Send insights summary to finance", category: "communicating" },
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
  const { error: summaryError } = await supabase.from("daily_summaries").insert({
    voice_note_id: voiceNote.id,
    user_id: userId,
    wins: summaryPayload.wins,
    drains: summaryPayload.drains,
    future_focus: summaryPayload.future_focus,
    emotional_tone: summaryPayload.emotional_tone,
    energy_level: summaryPayload.energy_level,
    emotion_confidence: summaryPayload.emotion_confidence,
    original_wins: summaryPayload.wins,
    original_drains: summaryPayload.drains,
    original_future_focus: summaryPayload.future_focus,
  })

  if (summaryError) throw summaryError

  const taskRows = reflection.tasks.map((task) => ({
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
