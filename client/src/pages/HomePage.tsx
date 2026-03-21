import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { HomeInfoDrawer } from "@/components/drawer/HomeInfoDrawer"
import { ChatEditor } from "@/components/editor/ChatEditor"
import { ChatMessageList, type LiveUserTranscription } from "@/components/editor/ChatMessageList"
import { AudioPlayer } from "@/lib/audio-player"
import { STTAudioCapture } from "@/lib/audio-capture"
import {
  appendAssistantChunk,
  appendUserMessage,
  startAssistantStream,
  stopAssistantStream,
  type ChatMessage,
} from "@/lib/chat-messages"
import { type LlmSettings, loadSettings, sanitizeSettings, saveSettings } from "@/lib/model-settings"
import { useVoiceSocket } from "@/lib/websocket"

const MODEL_SETTINGS_DEBOUNCE_MS = 160

type SttState = "inactive" | "listening" | "recording" | "transcribing"

type LiveTranscriptDraft = {
  stabilizedText: string
  updateText: string
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) {
    return null
  }

  return value as Record<string, unknown>
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function readBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function isSttState(value: string): value is SttState {
  return (
    value === "inactive" ||
    value === "listening" ||
    value === "recording" ||
    value === "transcribing"
  )
}

function buildLiveTranscription(draft: LiveTranscriptDraft | null): LiveUserTranscription | null {
  if (!draft) {
    return null
  }

  const stabilizedText = draft.stabilizedText
  const updateText = draft.updateText

  if (!stabilizedText && !updateText) {
    return null
  }

  if (!updateText) {
    return {
      stableText: stabilizedText,
      unstableText: "",
    }
  }

  if (stabilizedText && updateText.startsWith(stabilizedText)) {
    return {
      stableText: stabilizedText,
      unstableText: updateText.slice(stabilizedText.length),
    }
  }

  if (stabilizedText && stabilizedText.startsWith(updateText)) {
    return {
      stableText: updateText,
      unstableText: "",
    }
  }

  return {
    stableText: "",
    unstableText: updateText,
  }
}

export function HomePage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [settings, setSettings] = useState<LlmSettings>(() => loadSettings())
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draftText, setDraftText] = useState("")
  const [sttState, setSttState] = useState<SttState>("inactive")
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [isVoiceBusy, setIsVoiceBusy] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [liveTranscript, setLiveTranscript] = useState<LiveTranscriptDraft | null>(null)

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audioPlayerRef = useRef<AudioPlayer | null>(null)
  const sttCaptureRef = useRef<STTAudioCapture | null>(null)
  const socketStatusRef = useRef<"connecting" | "connected" | "disconnected">("disconnected")

  const clearLiveTranscript = useCallback(() => {
    setLiveTranscript(null)
  }, [])

  useEffect(() => {
    const player = new AudioPlayer()
    audioPlayerRef.current = player

    return () => {
      player.destroy()

      if (audioPlayerRef.current === player) {
        audioPlayerRef.current = null
      }
    }
  }, [])

  const handleSocketText = useCallback(
    (payload: Record<string, unknown>) => {
      const eventType = readString(payload.type)

      if (eventType === "audio_stream_start") {
        const data = readRecord(payload.data)
        if (!data) {
          return
        }

        const characterId = readString(data.character_id)
        const characterName = readString(data.character_name)
        const messageId = readString(data.message_id)
        const sampleRate = readNumber(data.sample_rate, 24000)

        if (!characterId || !messageId) {
          return
        }

        audioPlayerRef.current?.handleStreamStart({
          character_id: characterId,
          character_name: characterName,
          message_id: messageId,
          sample_rate: sampleRate > 0 ? sampleRate : 24000,
        })

        return
      }

      if (eventType === "audio_stream_stop") {
        const data = readRecord(payload.data)
        if (!data) {
          return
        }

        const characterId = readString(data.character_id)
        const messageId = readString(data.message_id)

        if (!characterId || !messageId) {
          return
        }

        audioPlayerRef.current?.handleStreamStop({
          character_id: characterId,
          message_id: messageId,
        })

        return
      }

      if (eventType === "text_stream_start") {
        const data = readRecord(payload.data)
        if (!data) {
          return
        }

        const messageId = readString(data.message_id)
        if (!messageId) {
          return
        }

        setMessages((previous) =>
          startAssistantStream(previous, {
            messageId,
            characterId: readString(data.character_id),
            characterName: readString(data.character_name),
            characterImageUrl: readString(data.character_image_url),
          })
        )

        return
      }

      if (eventType === "text_chunk") {
        const data = readRecord(payload.data)
        if (!data) {
          return
        }

        const messageId = readString(data.message_id)
        if (!messageId) {
          return
        }

        setMessages((previous) =>
          appendAssistantChunk(previous, {
            messageId,
            text: readString(data.text),
          })
        )

        return
      }

      if (eventType === "text_stream_stop") {
        const data = readRecord(payload.data)
        if (!data) {
          return
        }

        const messageId = readString(data.message_id)
        if (!messageId) {
          return
        }

        setMessages((previous) =>
          stopAssistantStream(previous, {
            messageId,
            text: readString(data.text),
            interrupted: readBoolean(data.interrupted),
            characterId: readString(data.character_id),
            characterName: readString(data.character_name),
            characterImageUrl: readString(data.character_image_url),
          })
        )

        return
      }

      if (eventType === "stt_state") {
        const data = readRecord(payload.data)
        const nextState = readString(data?.state)

        if (!isSttState(nextState)) {
          return
        }

        setSttState(nextState)

        if (nextState === "inactive") {
          setIsVoiceEnabled(false)
          clearLiveTranscript()
        } else {
          setIsVoiceEnabled(true)
        }

        return
      }

      if (eventType === "stt_update") {
        const text = readString(payload.text)
        setLiveTranscript((previous) => ({
          stabilizedText: previous?.stabilizedText ?? "",
          updateText: text,
        }))
        return
      }

      if (eventType === "stt_stabilized") {
        const text = readString(payload.text)
        setLiveTranscript((previous) => ({
          stabilizedText: text,
          updateText: previous?.updateText ?? text,
        }))
        return
      }

      if (eventType === "stt_final") {
        const text = readString(payload.text).trim()

        if (text) {
          setMessages((previous) => appendUserMessage(previous, text))
        }

        clearLiveTranscript()
      }
    },
    [clearLiveTranscript]
  )

  const { status, socket } = useVoiceSocket({
    onText: handleSocketText,
    onBinary: (buffer) => audioPlayerRef.current?.handleAudioChunk(buffer),
  })

  useEffect(() => {
    socketStatusRef.current = status
  }, [status])

  useEffect(() => {
    const capture = new STTAudioCapture({
      sendBinary: (data) => {
        const activeSocket = socket.current

        if (!activeSocket || socketStatusRef.current !== "connected") {
          return false
        }

        activeSocket.sendBinary(data)
        return true
      },
    })

    sttCaptureRef.current = capture

    return () => {
      socket.current?.sendText({ type: "stop_listening" })
      capture.disable()
      void capture.destroy()

      if (sttCaptureRef.current === capture) {
        sttCaptureRef.current = null
      }
    }
  }, [socket])

  useEffect(() => {
    if (status === "connected") {
      return
    }

    audioPlayerRef.current?.stopAll()
    sttCaptureRef.current?.disable()
    setIsVoiceEnabled(false)
    setIsVoiceBusy(false)
    setSttState("inactive")
    setVoiceError(null)
    clearLiveTranscript()
  }, [clearLiveTranscript, status])

  const handleSettingsChange = useCallback((partial: Partial<LlmSettings>) => {
    setSettings((previous) => {
      const next = sanitizeSettings({ ...previous, ...partial })
      saveSettings(next)
      return next
    })
  }, [])

  const canSend = useMemo(() => {
    return status === "connected" && draftText.trim().length > 0
  }, [draftText, status])

  const liveUserTranscription = useMemo(() => buildLiveTranscription(liveTranscript), [liveTranscript])

  const handleSendMessage = useCallback(() => {
    const text = draftText.trim()
    if (!text || status !== "connected") {
      return
    }

    setMessages((previous) => appendUserMessage(previous, text))

    void audioPlayerRef.current?.unlock()

    socket.current?.sendText({
      type: "user_message",
      text,
      model_settings: settings,
    })

    setDraftText("")
  }, [draftText, settings, socket, status])

  const handleVoiceToggle = useCallback(async () => {
    if (status !== "connected" || isVoiceBusy) {
      return
    }

    const capture = sttCaptureRef.current
    if (!capture) {
      return
    }

    setVoiceError(null)
    setIsVoiceBusy(true)

    if (isVoiceEnabled) {
      capture.disable()
      socket.current?.sendText({ type: "stop_listening" })
      setIsVoiceEnabled(false)
      setSttState("inactive")
      clearLiveTranscript()
      setIsVoiceBusy(false)
      return
    }

    clearLiveTranscript()
    socket.current?.sendText({ type: "start_listening" })

    const enabled = await capture.enable()

    if (!enabled) {
      const errorMessage = capture.getState().error ?? "Unable to start microphone capture."
      capture.disable()
      socket.current?.sendText({ type: "stop_listening" })
      setIsVoiceEnabled(false)
      setSttState("inactive")
      setVoiceError(errorMessage)
      clearLiveTranscript()
      setIsVoiceBusy(false)
      return
    }

    setIsVoiceEnabled(true)
    setSttState((previous) => (previous === "inactive" ? "listening" : previous))
    setIsVoiceBusy(false)
  }, [clearLiveTranscript, isVoiceBusy, isVoiceEnabled, socket, status])

  useEffect(() => {
    if (status !== "connected") {
      return
    }

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current)
      syncTimerRef.current = null
    }

    syncTimerRef.current = setTimeout(() => {
      socket.current?.sendText({
        type: "model_settings",
        ...settings,
      })
    }, MODEL_SETTINGS_DEBOUNCE_MS)

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current)
        syncTimerRef.current = null
      }
    }
  }, [settings, socket, status])

  return (
    <div className="page-canvas home-page">
      <div className="home-page__columns">
        <div className="home-page__column home-page__column--left">
          <HomeInfoDrawer
            isOpen={isDrawerOpen}
            onSettingsChange={handleSettingsChange}
            onToggle={() => setIsDrawerOpen((previous) => !previous)}
            settings={settings}
          />
        </div>

        <div className="home-page__column home-page__column--right">
          <div className="home-page__editor-shell">
            <ChatMessageList liveUserTranscription={liveUserTranscription} messages={messages} />
            <ChatEditor
              canSend={canSend}
              isVoiceBusy={isVoiceBusy}
              isVoiceEnabled={isVoiceEnabled}
              onChange={setDraftText}
              onSend={handleSendMessage}
              onVoiceToggle={() => {
                void handleVoiceToggle()
              }}
              status={status}
              sttState={sttState}
              value={draftText}
              voiceError={voiceError}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
