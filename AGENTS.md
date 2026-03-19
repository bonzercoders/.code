# Project Overview

Low-latency voice chat application using WebRTC to connect remote server and local client (browser). 
Single-user application. Do not over-engineer for enterprise scale or multi-tenancy.

## Stack/Libraries

- server: Python, FastAPI, Supabase.
- client: React/TypeScript with Vite, shadcn ui, Tailwind CSS.

**Important**

  While Tailwind is installed, as it is required, you are welcome to, and in fact encouraged to use standard CSS when writing code. At very least, please include a div class with readable name.

## Principles/Style

- Adhere to KISS, YAGNI principles.
- Write code a human can read and maintain.

## Directory Structure

.code
├── server
├── client
│   └── src
│       ├── assets
│       ├── components
│       │   ├── characters
│       │   │   ├── CharacterDirectory.tsx
│       │   │   └── CharacterEditor.tsx
│       │   ├── editor
│       │   │   └── ChatEditor.tsx
│       │   ├── layout
│       │   │   ├── AppLayout.tsx
│       │   │   └── PageCanvas.tsx
│       │   ├── ui
│       │   └── voices
│       │       ├── VoiceDirectory.tsx
│       │       └── VoiceEditor.tsx
│       ├── lib
│       │   ├── supabase
│       │   │   ├── characters.ts
│       │   │   ├── client.ts
│       │   │   └── voices.ts
│       │   ├── characters.ts
│       │   ├── navigation.ts
│       │   ├── useVoiceSocket.ts
│       │   ├── utils.ts
│       │   ├── voices.ts
│       │   └── websocket.ts
│       └── pages
│           ├── HomePage.tsx
│           ├── AgentsPage.tsx
│           ├── CharactersPage.tsx
│           ├── VoicesPage.tsx
│           └── SettingsPage.tsx
├── CLAUDE.md
├── AGENTS.md
├── requirements_higgs.txt
└── setup.sh

###

  **Important Notes:**
  Maintain directory structure, keeping everything modular and organized.
  Components are either UI (from shadcn or similar) or a page specific component we are building, like a chat editor.
  Build component and then add to Page (Home etc.), don't build on Page.
  Use of lib also modular, organized with feature/functionality in mind i.e. an audio player, database etc.

  **Patching Issue**
  There seems to be an issue with apply_patch in this environment, so switching to direct file writes is the way to go.
  