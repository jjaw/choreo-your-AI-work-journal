const summaryPrompts = {
  v1_simple: (transcript) =>
    [
      "Summarize this work reflection into JSON with keys:",
      "wins (array of strings), drains (array of strings), future_focus (array of strings),",
      "emotional_tone (string), energy_level (string), emotion_confidence (low|medium|high).",
      "Return ONLY valid JSON.",
      "",
      `Transcript: ${transcript}`,
    ].join(" "),
  v2_structured: (transcript) =>
    [
      "You are summarizing a user's workday reflection.",
      "Return ONLY valid JSON with keys:",
      "wins (2-4 items), drains (1-3 items), future_focus (1-3 items),",
      "emotional_tone (single word), energy_level (low|medium|high), emotion_confidence (low|medium|high).",
      "Rules:",
      "- Wins and drains must be concrete events or outcomes.",
      "- Future focus must be next-step intentions.",
      "",
      `Transcript: ${transcript}`,
    ].join(" "),
}

const taskPrompts = {
  v1_simple: (transcript) =>
    [
      "Extract completed actions from this reflection.",
      "Return ONLY valid JSON with shape:",
      '{ "tasks": [ { "task_text": string, "category": "creating|collaborating|communicating|organizing" } ] }',
      "",
      `Transcript: ${transcript}`,
    ].join(" "),
  v2_structured: (transcript) =>
    [
      "Extract only completed actions from this reflection.",
      "Return ONLY valid JSON with shape:",
      '{ "tasks": [ { "task_text": string, "category": "creating|collaborating|communicating|organizing" } ] }',
      "Rules:",
      "- Only include actions that were completed today.",
      "- Be specific (not 'worked on project').",
      "- Categorize correctly.",
      "",
      `Transcript: ${transcript}`,
    ].join(" "),
}

module.exports = { summaryPrompts, taskPrompts }
