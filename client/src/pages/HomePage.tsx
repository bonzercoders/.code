import { useState } from "react"

import { HomeInfoDrawer } from "@/components/drawer/HomeInfoDrawer"
import { ChatEditor } from "@/components/editor/ChatEditor"

export function HomePage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  return (
    <div className="page-canvas home-page">
      <div className="home-page__columns">
        <div className="home-page__column home-page__column--left">
          <HomeInfoDrawer
            isOpen={isDrawerOpen}
            onToggle={() => setIsDrawerOpen((previous) => !previous)}
          />
        </div>

        <div className="home-page__column home-page__column--right">
          <div className="home-page__editor-shell">
            <ChatEditor />
          </div>
        </div>
      </div>
    </div>
  )
}
