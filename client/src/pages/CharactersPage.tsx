import { useEffect, useMemo, useRef, useState } from "react"

import { CharacterDirectory } from "@/components/page/characters/CharacterDirectory"
import { CharacterEditor } from "@/components/page/characters/CharacterEditor"
import { type Character, type CharacterDraft, type CharacterTab, createEmptyCharacterDraft } from "@/lib/characters"
import { cn } from "@/lib/utils"

const CHARACTERS_STORAGE_KEY = "aichat.characters.v1"
const VOICE_OPTIONS = ["Alloy", "Ash", "Breeze", "Cora", "Juniper", "Sage", "Vale"]
const EDITOR_TRANSITION_MS = 220
const EDITOR_ENTER_DELAY_MS = 18

type EditorMode = "create" | "edit"
type EditorPhase = "hidden" | "entering" | "entered" | "exiting"

function readText(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function normalizeStoredCharacter(value: unknown): Character | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const defaults = createEmptyCharacterDraft()
  const record = value as Record<string, unknown>
  const characterId = readText(record.id).trim()

  if (!characterId) {
    return null
  }

  return {
    id: characterId,
    name: readText(record.name),
    voice: readText(record.voice),
    globalRoleplayPrompt: readText(record.globalRoleplayPrompt) || defaults.globalRoleplayPrompt,
    systemPrompt: readText(record.systemPrompt),
    imageDataUrl: readText(record.imageDataUrl),
    backgroundNotes: readText(record.backgroundNotes),
    chatNotes: readText(record.chatNotes),
    groupNotes: readText(record.groupNotes),
    memoryNotes: readText(record.memoryNotes),
  }
}

function loadCharactersFromStorage(): Character[] {
  if (typeof window === "undefined") {
    return []
  }

  const rawValue = window.localStorage.getItem(CHARACTERS_STORAGE_KEY)

  if (!rawValue) {
    return []
  }

  try {
    const parsedValue = JSON.parse(rawValue)

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue
      .map((entry) => normalizeStoredCharacter(entry))
      .filter((character): character is Character => character !== null)
  } catch {
    return []
  }
}

function toDraft(character: Character): CharacterDraft {
  return {
    name: character.name,
    voice: character.voice,
    globalRoleplayPrompt: character.globalRoleplayPrompt,
    systemPrompt: character.systemPrompt,
    imageDataUrl: character.imageDataUrl,
    backgroundNotes: character.backgroundNotes,
    chatNotes: character.chatNotes,
    groupNotes: character.groupNotes,
    memoryNotes: character.memoryNotes,
  }
}

function createCharacterId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `character-${Date.now()}-${Math.floor(Math.random() * 100000)}`
}

export function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>(loadCharactersFromStorage)
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<EditorMode>("create")
  const [activeTab, setActiveTab] = useState<CharacterTab>("profile")
  const [draft, setDraft] = useState<CharacterDraft>(createEmptyCharacterDraft)
  const [editorPhase, setEditorPhase] = useState<EditorPhase>("hidden")

  const enterTimerRef = useRef<number | null>(null)
  const exitTimerRef = useRef<number | null>(null)

  const selectedCharacter = useMemo(
    () => (selectedCharacterId ? characters.find((character) => character.id === selectedCharacterId) ?? null : null),
    [characters, selectedCharacterId]
  )

  useEffect(() => {
    window.localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify(characters))
  }, [characters])

  useEffect(() => {
    return () => {
      if (enterTimerRef.current !== null) {
        window.clearTimeout(enterTimerRef.current)
      }

      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current)
      }
    }
  }, [])

  const clearAnimationTimers = () => {
    if (enterTimerRef.current !== null) {
      window.clearTimeout(enterTimerRef.current)
      enterTimerRef.current = null
    }

    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current)
      exitTimerRef.current = null
    }
  }

  const mountEditorWithPop = () => {
    clearAnimationTimers()
    setIsEditorOpen(true)
    setEditorPhase("entering")

    enterTimerRef.current = window.setTimeout(() => {
      setEditorPhase("entered")
      enterTimerRef.current = null
    }, EDITOR_ENTER_DELAY_MS)
  }

  const unmountEditorWithPop = (onAfter?: () => void) => {
    if (!isEditorOpen) {
      setEditorPhase("hidden")
      onAfter?.()
      return
    }

    clearAnimationTimers()
    setEditorPhase("exiting")

    exitTimerRef.current = window.setTimeout(() => {
      setIsEditorOpen(false)
      setEditorPhase("hidden")
      exitTimerRef.current = null
      onAfter?.()
    }, EDITOR_TRANSITION_MS)
  }

  const transitionEditor = (applyState: () => void) => {
    if (!isEditorOpen) {
      applyState()
      mountEditorWithPop()
      return
    }

    unmountEditorWithPop(() => {
      applyState()
      mountEditorWithPop()
    })
  }

  const openCreateEditor = () => {
    transitionEditor(() => {
      setEditorMode("create")
      setSelectedCharacterId(null)
      setActiveTab("profile")
      setDraft(createEmptyCharacterDraft())
    })
  }

  const openEditEditor = (characterId: string) => {
    const character = characters.find((entry) => entry.id === characterId)

    if (!character) {
      return
    }

    if (isEditorOpen && editorMode === "edit" && selectedCharacterId === characterId) {
      return
    }

    transitionEditor(() => {
      setEditorMode("edit")
      setSelectedCharacterId(characterId)
      setActiveTab("profile")
      setDraft(toDraft(character))
    })
  }

  const closeEditor = () => {
    const resetDraft = editorMode === "edit" && selectedCharacter ? toDraft(selectedCharacter) : createEmptyCharacterDraft()

    unmountEditorWithPop(() => {
      setActiveTab("profile")
      setDraft(resetDraft)
    })
  }

  const handleSave = () => {
    const normalizedName = draft.name.trim()
    const normalizedVoice = draft.voice.trim()

    if (editorMode === "create") {
      const nextCharacter: Character = {
        id: createCharacterId(),
        ...draft,
        name: normalizedName || "Untitled",
        voice: normalizedVoice,
      }

      setCharacters((previousCharacters) => [nextCharacter, ...previousCharacters])
      setSelectedCharacterId(nextCharacter.id)
      setEditorMode("edit")
      setDraft(toDraft(nextCharacter))
      return
    }

    if (!selectedCharacterId) {
      return
    }

    const nextCharacter: Character = {
      id: selectedCharacterId,
      ...draft,
      name: normalizedName || "Untitled",
      voice: normalizedVoice,
    }

    setCharacters((previousCharacters) =>
      previousCharacters.map((character) => (character.id === selectedCharacterId ? nextCharacter : character))
    )

    setDraft(toDraft(nextCharacter))
  }

  const handleDelete = () => {
    if (editorMode !== "edit" || !selectedCharacterId) {
      return
    }

    setCharacters((previousCharacters) =>
      previousCharacters.filter((character) => character.id !== selectedCharacterId)
    )

    unmountEditorWithPop(() => {
      setSelectedCharacterId(null)
      setEditorMode("create")
      setActiveTab("profile")
      setDraft(createEmptyCharacterDraft())
    })
  }

  const handleDirectoryChat = (characterId: string) => {
    // Placeholder action by design.
    void characterId
  }

  const handleImageUpload = (file: File) => {
    const fileReader = new FileReader()

    fileReader.onload = () => {
      const imageDataUrl = typeof fileReader.result === "string" ? fileReader.result : ""

      if (!imageDataUrl) {
        return
      }

      setDraft((previousDraft) => ({
        ...previousDraft,
        imageDataUrl,
      }))
    }

    fileReader.readAsDataURL(file)
  }

  const editorShellClassName = cn(
    "characters-page__editor-shell",
    editorPhase === "entering" && "is-entering",
    editorPhase === "entered" && "is-entered",
    editorPhase === "exiting" && "is-exiting"
  )

  return (
    <div className="page-canvas characters-page">
      <div className="characters-page__split-shell">
        <CharacterDirectory
          characters={characters}
          onChat={handleDirectoryChat}
          onCreate={openCreateEditor}
          onSelect={openEditEditor}
          selectedId={selectedCharacterId}
        />

        {isEditorOpen ? (
          <div className={editorShellClassName}>
            <CharacterEditor
              activeTab={activeTab}
              draft={draft}
              mode={editorMode}
              onChange={(changes) => setDraft((previousDraft) => ({ ...previousDraft, ...changes }))}
              onChat={() => setActiveTab("chats")}
              onClose={closeEditor}
              onDelete={handleDelete}
              onImageUpload={handleImageUpload}
              onSave={handleSave}
              onTabChange={setActiveTab}
              voiceOptions={VOICE_OPTIONS}
            />
          </div>
        ) : (
          <section className="characters-page__editor-empty" aria-label="Character editor placeholder">
            <h2 className="characters-page__editor-empty-title">Character Editor</h2>
            <p className="characters-page__editor-empty-copy">
              Select a character from the directory or create a new one to begin editing.
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
