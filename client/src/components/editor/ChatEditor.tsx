import { type MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from "react"
import { Plus } from "lucide-react"

import micIcon from "@/assets/mic.png"
import { Button } from "@/components/ui/button"
import { useVoiceSocket } from "@/lib/useVoiceSocket"

const MENU_ITEMS = ["File upload", "New chat"]

const STATUS_LABEL: Record<string, string> = {
  connected: "Connected",
  connecting: "Connecting...",
  disconnected: "Disconnected",
}

export function ChatEditor() {
  const { status } = useVoiceSocket()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isMenuOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return
      }

      setIsMenuOpen(false)
    }

    window.addEventListener("pointerdown", handlePointerDown)

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [isMenuOpen])

  const handleMenuToggle = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setIsMenuOpen((previous) => !previous)
  }

  return (
    <div aria-label="Chat editor" className="chat-editor" role="group">
      <div className="chat-editor__input-wrap">
        <div className="chat-editor__status">
          <span className="chat-editor__status-label">{STATUS_LABEL[status]}</span>
          <span
            className={`chat-editor__status-dot${status === "connected" ? " is-connected" : ""}`}
          />
        </div>
        <textarea className="chat-editor__input" rows={4} />
      </div>

      <div className="chat-editor__toolbar">
        <div className="chat-editor__menu" ref={menuRef}>
          <button
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            aria-label="Open add menu"
            className="chat-editor__icon-button chat-editor__icon-button--add"
            onClick={handleMenuToggle}
            type="button"
          >
            <Plus aria-hidden="true" size={18} />
          </button>

          {isMenuOpen ? (
            <div aria-label="Editor add menu" className="chat-editor__dropdown" role="menu">
              {MENU_ITEMS.map((item) => (
                <button
                  className="chat-editor__dropdown-item"
                  disabled
                  key={item}
                  role="menuitem"
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="chat-editor__actions">
          <button
            aria-label="Voice input"
            className="chat-editor__icon-button chat-editor__icon-button--mic"
            type="button"
          >
            <img alt="" aria-hidden="true" className="chat-editor__mic-icon" src={micIcon} />
          </button>
          <Button className="chat-editor__send-button" type="button">
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
