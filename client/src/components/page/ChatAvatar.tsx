import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface ChatAvatarProps {
  imageSrc?: string
  name: string
  isCharacter?: boolean
  isStreaming?: boolean
}

function toInitials(name: string): string {
  const trimmed = name.trim()

  if (!trimmed) {
    return "?"
  }

  const parts = trimmed.split(/\s+/).slice(0, 2)
  const initials = parts.map((part) => part[0]?.toUpperCase() ?? "").join("")

  return initials || "?"
}

export function ChatAvatar({ imageSrc, name, isCharacter = false, isStreaming = false }: ChatAvatarProps) {
  const initials = toInitials(name)

  return (
    <div className={cn("chat-avatar", isCharacter && "is-character")}>
      <Avatar
        className={cn(
          "chat-avatar__image",
          isCharacter && "chat-avatar__image--character",
          isCharacter && isStreaming && "chat-avatar__image--streaming"
        )}
      >
        <AvatarImage alt={name} src={imageSrc} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      {isCharacter ? <span aria-hidden="true" className="chat-avatar__presence" /> : null}
    </div>
  )
}
