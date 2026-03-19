import { type RefObject } from "react"

import { ChatAvatar } from "@/components/page/ChatAvatar"

export interface HomeChatMessage {
  id: string
  role: "user" | "character"
  text: string
  messageId?: string
  characterId?: string
  characterName?: string
  isStreaming: boolean
  isInterrupted: boolean
}

interface HomeChatTranscriptProps {
  messages: HomeChatMessage[]
  userAvatarSrc: string
  characterImageById: Record<string, string>
  transcriptRef: RefObject<HTMLElement | null>
}

export function HomeChatTranscript({
  messages,
  userAvatarSrc,
  characterImageById,
  transcriptRef,
}: HomeChatTranscriptProps) {
  return (
    <section aria-label="Chat transcript" className="home-page__transcript" ref={transcriptRef}>
      <div className="home-page__transcript-inner">
        {messages.map((message) => {
          const isUser = message.role === "user"
          const characterName = message.characterName?.trim() || "Character"
          const displayName = isUser ? "You" : characterName
          const avatarSrc = isUser
            ? userAvatarSrc
            : (message.characterId ? characterImageById[message.characterId] : "") || ""

          return (
            <article
              className={`home-chat-message${isUser ? " is-user" : " is-character"}`}
              key={message.id}
            >
              {isUser ? null : (
                <ChatAvatar
                  imageSrc={avatarSrc}
                  isCharacter
                  isStreaming={message.isStreaming}
                  name={displayName}
                />
              )}

              <div className="home-chat-message__body">
                <p className="home-chat-message__author">{displayName}</p>
                <div
                  className={`home-chat-message__bubble${
                    message.isStreaming ? " is-streaming" : ""
                  }${message.isInterrupted ? " is-interrupted" : ""}`}
                >
                  <span>{message.text || (message.isStreaming ? "..." : "")}</span>
                  {message.isStreaming ? <span aria-hidden="true" className="home-chat-message__cursor" /> : null}
                </div>
              </div>

              {isUser ? <ChatAvatar imageSrc={avatarSrc} name={displayName} /> : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}
