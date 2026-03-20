import { ChatEditor } from "@/components/editor/ChatEditor"

export function HomePage() {
  return (
    <div className="page-canvas home-page">
      <div className="home-page__content">
        <div className="home-page__editor-offset">
          <ChatEditor />
        </div>
      </div>
    </div>
  )
}
