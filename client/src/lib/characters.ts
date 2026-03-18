export const CHARACTER_TAB_VALUES = [
  "profile",
  "background",
  "chats",
  "groups",
  "memory",
] as const

export type CharacterTab = (typeof CHARACTER_TAB_VALUES)[number]

export interface Character {
  id: string
  name: string
  voice: string
  globalRoleplayPrompt: string
  systemPrompt: string
  imageDataUrl: string
  backgroundNotes: string
  chatNotes: string
  groupNotes: string
  memoryNotes: string
}

export type CharacterDraft = Omit<Character, "id">

export const CHARACTER_TAB_LABELS: Record<CharacterTab, string> = {
  profile: "Profile",
  background: "Persona",
  chats: "Chats",
  groups: "Groups",
  memory: "Memory",
}

export const DEFAULT_GLOBAL_ROLEPLAY_PROMPT =
  "You are {character.name}, a roleplay actor engaging in a conversation with {user.name}. Your replies should be written in a conversational format, taking on the personality and characteristics of {character.name}."

export function createEmptyCharacterDraft(): CharacterDraft {
  return {
    name: "",
    voice: "",
    globalRoleplayPrompt: DEFAULT_GLOBAL_ROLEPLAY_PROMPT,
    systemPrompt: "",
    imageDataUrl: "",
    backgroundNotes: "",
    chatNotes: "",
    groupNotes: "",
    memoryNotes: "",
  }
}

