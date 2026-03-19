import { useCallback, useEffect, useRef, useState } from "react"

import jayvatar from "@/assets/jayvatar.png"
import { ChatEditor } from "@/components/editor/ChatEditor"
import { HomeChatTranscript, type HomeChatMessage } from "@/components/page/HomeChatTranscript"
import { fetchCharacters } from "@/lib/supabase/characters"
import { useVoiceSocket } from "@/lib/useVoiceSocket"

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key]
  return typeof value === "string" ? value : ""
}

function readBoolean(source: Record<string, unknown>, key: string): boolean {
  const value = source[key]
  return typeof value === "boolean" ? value : false
}

function createLocalMessageId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`
}

function findMessageIndex(messages: HomeChatMessage[], messageId: string): number {
  return messages.findIndex((entry) => entry.messageId === messageId)
}

export function HomePage() {
  const [messages, setMessages] = useState<HomeChatMessage[]>([])
  const [composerValue, setComposerValue] = useState("")
  const [pendingMessages, setPendingMessages] = useState<string[]>([])
  const [characterImageById, setCharacterImageById] = useState<Record<string, string>>({})
  const transcriptRef = useRef<HTMLElement | null>(null)

  const handleSocketText = useCallback((payload: Record<string, unknown>) => {
    const eventType = readString(payload, "type")
    const eventData = asObject(payload.data)

    if (!eventType || !eventData) {
      return
    }

    if (eventType === "text_stream_start") {
      const messageId = readString(eventData, "message_id")

      if (!messageId) {
        return
      }

      const characterId = readString(eventData, "character_id")
      const characterName = readString(eventData, "character_name")

      setMessages((previousMessages) => {
        const index = findMessageIndex(previousMessages, messageId)

        if (index === -1) {
          return [
            ...previousMessages,
            {
              id: `character-${messageId}`,
              role: "character",
              text: "",
              messageId,
              characterId,
              characterName,
              isStreaming: true,
              isInterrupted: false,
            },
          ]
        }

        const nextMessages = [...previousMessages]
        const previousMessage = nextMessages[index]

        nextMessages[index] = {
          ...previousMessage,
          characterId: characterId || previousMessage.characterId,
          characterName: characterName || previousMessage.characterName,
          isStreaming: true,
          isInterrupted: false,
        }

        return nextMessages
      })

      return
    }

    if (eventType === "text_chunk") {
      const messageId = readString(eventData, "message_id")
      const chunkText = readString(eventData, "text")

      if (!messageId || chunkText.length === 0) {
        return
      }

      const characterId = readString(eventData, "character_id")
      const characterName = readString(eventData, "character_name")

      setMessages((previousMessages) => {
        const index = findMessageIndex(previousMessages, messageId)

        if (index === -1) {
          return [
            ...previousMessages,
            {
              id: `character-${messageId}`,
              role: "character",
              text: chunkText,
              messageId,
              characterId,
              characterName,
              isStreaming: true,
              isInterrupted: false,
            },
          ]
        }

        const nextMessages = [...previousMessages]
        const previousMessage = nextMessages[index]

        nextMessages[index] = {
          ...previousMessage,
          text: `${previousMessage.text}${chunkText}`,
          characterId: characterId || previousMessage.characterId,
          characterName: characterName || previousMessage.characterName,
          isStreaming: true,
          isInterrupted: false,
        }

        return nextMessages
      })

      return
    }

    if (eventType === "text_stream_stop") {
      const messageId = readString(eventData, "message_id")

      if (!messageId) {
        return
      }

      const characterId = readString(eventData, "character_id")
      const characterName = readString(eventData, "character_name")
      const stoppedText = readString(eventData, "text")
      const isInterrupted = readBoolean(eventData, "interrupted")

      setMessages((previousMessages) => {
        const index = findMessageIndex(previousMessages, messageId)

        if (index === -1) {
          return [
            ...previousMessages,
            {
              id: `character-${messageId}`,
              role: "character",
              text: stoppedText,
              messageId,
              characterId,
              characterName,
              isStreaming: false,
              isInterrupted,
            },
          ]
        }

        const nextMessages = [...previousMessages]
        const previousMessage = nextMessages[index]

        nextMessages[index] = {
          ...previousMessage,
          text: stoppedText || previousMessage.text,
          characterId: characterId || previousMessage.characterId,
          characterName: characterName || previousMessage.characterName,
          isStreaming: false,
          isInterrupted,
        }

        return nextMessages
      })

      return
    }

    if (eventType === "tts_interrupted") {
      const messageId = readString(eventData, "message_id")

      if (!messageId) {
        return
      }

      setMessages((previousMessages) => {
        const index = findMessageIndex(previousMessages, messageId)

        if (index === -1) {
          return previousMessages
        }

        const nextMessages = [...previousMessages]
        nextMessages[index] = {
          ...nextMessages[index],
          isStreaming: false,
          isInterrupted: true,
        }

        return nextMessages
      })
    }
  }, [])

  const { status, sendText } = useVoiceSocket({ onText: handleSocketText })

  useEffect(() => {
    let cancelled = false

    fetchCharacters()
      .then((characters) => {
        if (cancelled) {
          return
        }

        const imageMap = characters.reduce<Record<string, string>>((result, character) => {
          if (character.imageUrl) {
            result[character.id] = character.imageUrl
          }

          return result
        }, {})

        setCharacterImageById(imageMap)
      })
      .catch((error) => console.error("Failed to load character avatars:", error))

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (status !== "connected" || pendingMessages.length === 0) {
      return
    }

    pendingMessages.forEach((pendingMessage) => {
      sendText({
        type: "user_message",
        text: pendingMessage,
      })
    })

    setPendingMessages([])
  }, [pendingMessages, sendText, status])

  useEffect(() => {
    const transcriptElement = transcriptRef.current

    if (!transcriptElement) {
      return
    }

    const animationId = window.requestAnimationFrame(() => {
      transcriptElement.scrollTop = transcriptElement.scrollHeight
    })

    return () => {
      window.cancelAnimationFrame(animationId)
    }
  }, [messages])

  const handleSend = useCallback(() => {
    const userMessage = composerValue.trim()

    if (!userMessage) {
      return
    }

    setMessages((previousMessages) => [
      ...previousMessages,
      {
        id: createLocalMessageId("user"),
        role: "user",
        text: userMessage,
        isStreaming: false,
        isInterrupted: false,
      },
    ])

    if (status === "connected") {
      sendText({
        type: "user_message",
        text: userMessage,
      })
    } else {
      setPendingMessages((previousMessages) => [...previousMessages, userMessage])
    }

    setComposerValue("")
  }, [composerValue, sendText, status])

  return (
    <div className="page-canvas home-page">
      <div className="home-page__content">
        <div className="home-page__grid">
          <div className="home-page__chat-column">
            <HomeChatTranscript
              characterImageById={characterImageById}
              messages={messages}
              transcriptRef={transcriptRef}
              userAvatarSrc={jayvatar}
            />
            <div className="home-page__editor-shell">
              <ChatEditor
                onSend={handleSend}
                onValueChange={setComposerValue}
                status={status}
                value={composerValue}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
