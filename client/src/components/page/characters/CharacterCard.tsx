import { type ChangeEvent, useRef } from "react"
import { Plus, UserRound, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  CHARACTER_TAB_LABELS,
  CHARACTER_TAB_VALUES,
  type CharacterDraft,
  type CharacterTab,
} from "@/lib/characters"

type CharacterCardMode = "create" | "edit"

interface CharacterCardProps {
  mode: CharacterCardMode
  draft: CharacterDraft
  activeTab: CharacterTab
  voiceOptions: string[]
  onTabChange: (tab: CharacterTab) => void
  onChange: (changes: Partial<CharacterDraft>) => void
  onSave: () => void
  onDelete: () => void
  onClose: () => void
  onChat: () => void
  onImageUpload: (file: File) => void
}

function isCharacterTab(value: string): value is CharacterTab {
  return CHARACTER_TAB_VALUES.some((tabValue) => tabValue === value)
}

export function CharacterCard({
  mode,
  draft,
  activeTab,
  voiceOptions,
  onTabChange,
  onChange,
  onSave,
  onDelete,
  onClose,
  onChat,
  onImageUpload,
}: CharacterCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const displayName = draft.name.trim() || "Character name"
  const canDelete = mode === "edit"

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0]

    if (!nextFile) {
      return
    }

    onImageUpload(nextFile)
    event.target.value = ""
  }

  return (
    <section aria-label="Character editor" className="character-card">
      <header className="character-card__header">
        <div className="character-card__identity">
          <div className="character-card__avatar-stack" aria-hidden="true">
            <span className="character-card__avatar-ring">
              <UserRound size={20} />
            </span>
            <span className="character-card__avatar-plus">
              <Plus size={12} />
            </span>
          </div>

          <h2 className="character-card__title">{displayName}</h2>
        </div>

        <button
          aria-label="Close character editor"
          className="character-card__close"
          onClick={onClose}
          type="button"
        >
          <X size={18} />
        </button>
      </header>

      <Tabs
        className="character-card__tabs"
        onValueChange={(value) => {
          if (isCharacterTab(value)) {
            onTabChange(value)
          }
        }}
        value={activeTab}
      >
        <TabsList className="character-card__tabs-list" variant="line">
          {CHARACTER_TAB_VALUES.map((tabValue) => (
            <TabsTrigger className="character-card__tabs-trigger" key={tabValue} value={tabValue}>
              {CHARACTER_TAB_LABELS[tabValue]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent className="character-card__tab-content character-card__tab-content--profile" value="profile">
          <div className="character-card__profile-grid">
            <div className="character-card__upload-column">
              <button
                className="character-card__upload-surface"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                {draft.imageDataUrl ? (
                  <img alt={displayName} className="character-card__upload-image" src={draft.imageDataUrl} />
                ) : (
                  <div className="character-card__upload-empty" aria-hidden="true">
                    <UserRound size={62} />
                    <span>Click to upload image</span>
                  </div>
                )}
              </button>

              <input
                accept="image/*"
                className="character-card__file-input"
                onChange={handleFileSelection}
                ref={fileInputRef}
                type="file"
              />
            </div>

            <div className="character-card__fields-column">
              <label className="character-card__label" htmlFor="character-global-roleplay-prompt">
                Global Roleplay System Prompt
              </label>
              <Textarea
                className="character-card__textarea character-card__textarea--global"
                id="character-global-roleplay-prompt"
                onChange={(event) => onChange({ globalRoleplayPrompt: event.target.value })}
                value={draft.globalRoleplayPrompt}
              />

              <label className="character-card__label" htmlFor="character-name-input">
                Character Name
              </label>
              <Input
                className="character-card__input"
                id="character-name-input"
                onChange={(event) => onChange({ name: event.target.value })}
                value={draft.name}
              />

              <label className="character-card__label" htmlFor="character-voice-select">
                Voice
              </label>
              <Select onValueChange={(value) => onChange({ voice: value })} value={draft.voice || undefined}>
                <SelectTrigger className="character-card__select" id="character-voice-select">
                  <SelectValue placeholder="Select voice" />
                </SelectTrigger>
                <SelectContent>
                  {voiceOptions.map((voiceOption) => (
                    <SelectItem key={voiceOption} value={voiceOption}>
                      {voiceOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <label className="character-card__label" htmlFor="character-system-prompt">
                System Prompt
              </label>
              <Textarea
                className="character-card__textarea"
                id="character-system-prompt"
                onChange={(event) => onChange({ systemPrompt: event.target.value })}
                placeholder="Enter system prompt"
                value={draft.systemPrompt}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent className="character-card__tab-content" value="background">
          <div className="character-card__notes-wrap">
            <p className="character-card__notes-title">Background</p>
            <Textarea
              className="character-card__textarea"
              onChange={(event) => onChange({ backgroundNotes: event.target.value })}
              placeholder="Add background notes for this character"
              value={draft.backgroundNotes}
            />
          </div>
        </TabsContent>

        <TabsContent className="character-card__tab-content" value="chats">
          <div className="character-card__notes-wrap">
            <p className="character-card__notes-title">Chats</p>
            <Textarea
              className="character-card__textarea"
              onChange={(event) => onChange({ chatNotes: event.target.value })}
              placeholder="Add chat notes or starter dialogue"
              value={draft.chatNotes}
            />
          </div>
        </TabsContent>

        <TabsContent className="character-card__tab-content" value="groups">
          <div className="character-card__notes-wrap">
            <p className="character-card__notes-title">Groups</p>
            <Textarea
              className="character-card__textarea"
              onChange={(event) => onChange({ groupNotes: event.target.value })}
              placeholder="Add group context for this character"
              value={draft.groupNotes}
            />
          </div>
        </TabsContent>

        <TabsContent className="character-card__tab-content" value="memory">
          <div className="character-card__notes-wrap">
            <p className="character-card__notes-title">Memory</p>
            <Textarea
              className="character-card__textarea"
              onChange={(event) => onChange({ memoryNotes: event.target.value })}
              placeholder="Add memory snippets for this character"
              value={draft.memoryNotes}
            />
          </div>
        </TabsContent>
      </Tabs>

      <footer className="character-card__footer">
        <Button
          className="character-card__delete-button"
          disabled={!canDelete}
          onClick={onDelete}
          type="button"
          variant="secondary"
        >
          Delete
        </Button>

        <div className="character-card__footer-actions">
          <Button className="character-card__chat-button" onClick={onChat} type="button" variant="secondary">
            Chat
          </Button>
          <Button className="character-card__save-button" onClick={onSave} type="button">
            Save Character
          </Button>
        </div>
      </footer>
    </section>
  )
}
