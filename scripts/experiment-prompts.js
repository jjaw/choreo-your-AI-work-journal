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
  v3_examples: (transcript) =>
    [
      "Extract completed actions from this reflection.",
      "Return ONLY valid JSON with shape:",
      '{ "tasks": [ { "task_text": string, "category": "creating|collaborating|communicating|organizing" } ] }',
      "Rules:",
      "- Include actions that were clearly done today.",
      "- If a task was started but not finished, skip it.",
      "- Be specific and concise.",
      "",
      "Examples:",
      'Input: "I fixed the login bug and ran a demo with sales. I also replied to a few emails."',
      'Output: {"tasks":[{"task_text":"Fix login bug","category":"creating"},{"task_text":"Run demo with sales","category":"collaborating"},{"task_text":"Reply to emails","category":"communicating"}]}',
      'Input: "I updated the sprint plan, had standup, and drafted the FAQ."',
      'Output: {"tasks":[{"task_text":"Update sprint plan","category":"organizing"},{"task_text":"Daily standup meeting","category":"collaborating"},{"task_text":"Draft FAQ","category":"creating"}]}',
      "",
      `Transcript: ${transcript}`,
    ].join(" "),
}

module.exports = { summaryPrompts, taskPrompts }
