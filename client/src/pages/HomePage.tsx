import { ChatEditor } from "@/components/editor/ChatEditor"

export function HomePage() {
  return (
    <div className="page-canvas home-page">
      <div className="home-page__columns">
        <div className="home-page__column home-page__column--left" />
        <div className="home-page__column home-page__column--right">
          <div className="home-page__editor-shell">
            <ChatEditor />
          </div>
        </div>
      </div>
    </div>
  )
}
