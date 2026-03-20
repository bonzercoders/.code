import { useCallback, useEffect, useRef, useState } from "react"

import { HomeInfoDrawer } from "@/components/drawer/HomeInfoDrawer"
import { ChatEditor } from "@/components/editor/ChatEditor"
import { type LlmSettings, loadSettings, sanitizeSettings, saveSettings } from "@/lib/model-settings"
import { useVoiceSocket } from "@/lib/websocket"

const MODEL_SETTINGS_DEBOUNCE_MS = 160

export function HomePage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [settings, setSettings] = useState<LlmSettings>(() => loadSettings())
  const { status, socket } = useVoiceSocket()
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSettingsChange = useCallback((partial: Partial<LlmSettings>) => {
    setSettings((previous) => {
      const next = sanitizeSettings({ ...previous, ...partial })
      saveSettings(next)
      return next
    })
  }, [])

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
            <ChatEditor status={status} />
          </div>
        </div>
      </div>
    </div>
  )
}
