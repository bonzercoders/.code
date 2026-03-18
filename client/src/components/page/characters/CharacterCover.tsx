import { type KeyboardEvent } from "react"
import { UserRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { Character } from "@/lib/characters"

interface CharacterCoverProps {
  character: Character
  onOpen: (characterId: string) => void
  onChat: (characterId: string) => void
}

export function CharacterCover({ character, onOpen, onChat }: CharacterCoverProps) {
  const displayName = character.name.trim() || "Untitled"

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onOpen(character.id)
    }
  }

  return (
    <article className="character-cover" data-character-id={character.id} role="listitem">
      <div
        aria-label={`Open ${displayName}`}
        className="character-cover__surface"
        onClick={() => onOpen(character.id)}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        {character.imageUrl ? (
          <img alt={displayName} className="character-cover__image" src={character.imageUrl} />
        ) : (
          <div className="character-cover__image character-cover__image--empty" aria-hidden="true">
            <UserRound size={56} />
          </div>
        )}

        <div className="character-cover__footer">
          <span className="character-cover__name">{displayName}</span>
          <Button
            className="character-cover__chat-button"
            onClick={(event) => {
              event.stopPropagation()
              onChat(character.id)
            }}
            size="default"
            type="button"
            variant="secondary"
          >
            Chat
          </Button>
        </div>
      </div>
    </article>
  )
}

