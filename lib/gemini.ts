import { GoogleGenAI, type ContentListUnion, type GenerateContentConfig, type PartUnion } from "@google/genai"
import { Opik } from "opik"
import { trackGemini } from "opik-gemini"

const apiKey = process.env.GEMINI_API_KEY
const defaultModel = process.env.GEMINI_MODEL

if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY")
}
if (!defaultModel) {
  throw new Error("Missing GEMINI_MODEL")
}
const resolvedModel: string = defaultModel
const opikApiKey = process.env.OPIK_API_KEY
const opikProjectName = process.env.OPIK_PROJECT_NAME
const opikWorkspaceName = process.env.OPIK_WORKSPACE ?? process.env.OPIK_WORKSPACE_NAME
const opikApiUrl = process.env.OPIK_URL_OVERRIDE

const opikClient =
  opikApiKey && opikProjectName && opikWorkspaceName
    ? new Opik({
        apiKey: opikApiKey,
        apiUrl: opikApiUrl,
        projectName: opikProjectName,
        workspaceName: opikWorkspaceName,
      })
    : null

const client = trackGemini(new GoogleGenAI({ apiKey }), opikClient ? { client: opikClient } : undefined)

export async function generateContent({
  contents,
  model = resolvedModel,
  config,
}: {
  contents: ContentListUnion
  model: string
  config?: GenerateContentConfig
}) {
  return client.models.generateContent({ model, contents, config })
}

export function buildInlineAudioPart(data: string, mimeType: string): PartUnion {
  return {
    inlineData: {
      data,
      mimeType,
    },
  }
}
