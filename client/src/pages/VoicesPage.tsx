import { useEffect, useRef, useState } from "react"

import { VoiceDirectory } from "@/components/page/voices/VoiceDirectory"
import { VoiceEditor } from "@/components/page/voices/VoiceEditor"
import {
  createEmptyVoiceDraft,
  createVoiceId,
  loadVoicesFromStorage,
  saveVoicesToStorage,
  toVoiceDraft,
  type Voice,
  type VoiceDraft,
} from "@/lib/voices"
import { cn } from "@/lib/utils"

const VOICES_STORAGE_KEY = "aichat.voices.v1"
const EDITOR_TRANSITION_MS = 220
const EDITOR_ENTER_DELAY_MS = 18

type EditorMode = "create" | "edit"
type EditorPhase = "hidden" | "entering" | "entered" | "exiting"

export function VoicesPage() {
  const [voices, setVoices] = useState<Voice[]>(() => loadVoicesFromStorage(VOICES_STORAGE_KEY))
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<EditorMode>("create")
  const [draft, setDraft] = useState<VoiceDraft>(createEmptyVoiceDraft)
  const [editorPhase, setEditorPhase] = useState<EditorPhase>("hidden")

  const enterTimerRef = useRef<number | null>(null)
  const exitTimerRef = useRef<number | null>(null)

  useEffect(() => {
    saveVoicesToStorage(VOICES_STORAGE_KEY, voices)
  }, [voices])

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
      setSelectedVoiceId(null)
      setDraft(createEmptyVoiceDraft())
    })
  }

  const openEditEditor = (voiceId: string) => {
    const voice = voices.find((entry) => entry.voiceId === voiceId)

    if (!voice) {
      return
    }

    if (isEditorOpen && editorMode === "edit" && selectedVoiceId === voiceId) {
      return
    }

    transitionEditor(() => {
      setEditorMode("edit")
      setSelectedVoiceId(voiceId)
      setDraft(toVoiceDraft(voice))
    })
  }

  const handleSave = () => {
    const normalizedName = draft.voiceName.trim()

    if (editorMode === "create") {
      const nextVoice: Voice = {
        voiceId: createVoiceId(),
        ...draft,
        voiceName: normalizedName || "Untitled Voice",
      }

      setVoices((previousVoices) => [nextVoice, ...previousVoices])
      setSelectedVoiceId(nextVoice.voiceId)
      setEditorMode("edit")
      setDraft(toVoiceDraft(nextVoice))
      return
    }

    if (!selectedVoiceId) {
      return
    }

    const nextVoice: Voice = {
      voiceId: selectedVoiceId,
      ...draft,
      voiceName: normalizedName || "Untitled Voice",
    }

    setVoices((previousVoices) =>
      previousVoices.map((voice) => (voice.voiceId === selectedVoiceId ? nextVoice : voice))
    )

    setDraft(toVoiceDraft(nextVoice))
  }

  const handleDelete = () => {
    if (editorMode !== "edit" || !selectedVoiceId) {
      return
    }

    setVoices((previousVoices) => previousVoices.filter((voice) => voice.voiceId !== selectedVoiceId))

    unmountEditorWithPop(() => {
      setSelectedVoiceId(null)
      setEditorMode("create")
      setDraft(createEmptyVoiceDraft())
    })
  }

  const handlePreview = (voiceId: string) => {
    // Placeholder action by design.
    void voiceId
  }

  const editorShellClassName = cn(
    "voices-page__editor-shell",
    editorPhase === "entering" && "is-entering",
    editorPhase === "entered" && "is-entered",
    editorPhase === "exiting" && "is-exiting"
  )

  return (
    <div className="page-canvas voices-page">
      <div className="voices-page__split-shell">
        <VoiceDirectory
          onCreate={openCreateEditor}
          onPreview={handlePreview}
          onSelect={openEditEditor}
          selectedId={selectedVoiceId}
          voices={voices}
        />

        {isEditorOpen ? (
          <div className={editorShellClassName}>
            <VoiceEditor
              mode={editorMode}
              onChange={(changes) => setDraft((previousDraft) => ({ ...previousDraft, ...changes }))}
              onDelete={handleDelete}
              onSave={handleSave}
              voiceDraft={draft}
            />
          </div>
        ) : (
          <section className="voices-page__editor-empty" aria-label="Voice editor placeholder">
            <h2 className="voices-page__editor-empty-title">Voice Editor</h2>
            <p className="voices-page__editor-empty-copy">
              Select a voice from the directory or create a new one to begin editing.
            </p>
          </section>
        )}
      </div>
    </div>
  )
}

