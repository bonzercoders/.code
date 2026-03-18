export const VOICE_METHOD_VALUES = ["clone", "profile"] as const

export type VoiceMethod = (typeof VOICE_METHOD_VALUES)[number]

export interface Voice {
  voiceId: string
  voiceName: string
  method: VoiceMethod
  scenePrompt: string
  referenceText: string
  referenceAudio: string
  speakerDescription: string
}

export type VoiceDraft = Omit<Voice, "voiceId">

function readText(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function normalizeVoiceMethod(value: unknown): VoiceMethod {
  return value === "profile" ? "profile" : "clone"
}

export function createEmptyVoiceDraft(): VoiceDraft {
  return {
    voiceName: "",
    method: "clone",
    scenePrompt: "",
    referenceText: "",
    referenceAudio: "",
    speakerDescription: "",
  }
}

export function normalizeStoredVoice(value: unknown): Voice | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>
  const defaults = createEmptyVoiceDraft()
  const voiceId = readText(record.voiceId).trim()

  if (!voiceId) {
    return null
  }

  return {
    voiceId,
    voiceName: readText(record.voiceName),
    method: normalizeVoiceMethod(record.method),
    scenePrompt: readText(record.scenePrompt) || defaults.scenePrompt,
    referenceText: readText(record.referenceText) || defaults.referenceText,
    referenceAudio: readText(record.referenceAudio) || defaults.referenceAudio,
    speakerDescription: readText(record.speakerDescription) || defaults.speakerDescription,
  }
}

export function loadVoicesFromStorage(storageKey: string): Voice[] {
  if (typeof window === "undefined") {
    return []
  }

  const rawValue = window.localStorage.getItem(storageKey)

  if (!rawValue) {
    return []
  }

  try {
    const parsedValue = JSON.parse(rawValue)

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue
      .map((entry) => normalizeStoredVoice(entry))
      .filter((voice): voice is Voice => voice !== null)
  } catch {
    return []
  }
}

export function saveVoicesToStorage(storageKey: string, voices: Voice[]): void {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(storageKey, JSON.stringify(voices))
}

export function toVoiceDraft(voice: Voice): VoiceDraft {
  return {
    voiceName: voice.voiceName,
    method: voice.method,
    scenePrompt: voice.scenePrompt,
    referenceText: voice.referenceText,
    referenceAudio: voice.referenceAudio,
    speakerDescription: voice.speakerDescription,
  }
}

export function createVoiceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `voice-${Date.now()}-${Math.floor(Math.random() * 100000)}`
}
