# ColabCoding Architecture

## Vision

ColabCoding is a real-time collaborative development platform that aims to eliminate traditional Git-style merge conflict workflows through continuous collaboration and AI-assisted conflict resolution.

---

## High Level Architecture

Frontend
↓
Yjs CRDT Layer
↓
WebSocket Server
↓
Conflict Detection Engine
↓
AI Server
↓
Gemini API

---

## Frontend

Responsibilities:

- Monaco Editor
- File Explorer
- Terminal UI
- Real-time collaboration
- Conflict Review UI (upcoming)

Tech Stack:

- Next.js
- React
- Monaco Editor
- Socket.io Client

---

## WebSocket Server

Responsibilities:

- Project synchronization
- File synchronization
- Terminal execution
- Conflict detection
- Collaboration state management

Tech Stack:

- Node.js
- Express
- Socket.io

---

## AI Server

Responsibilities:

- Conflict analysis
- Merge suggestion generation
- Future code review features

Tech Stack:

- Node.js
- Gemini API

---

## Current Conflict Flow

Code Change
↓
AST Parsing
↓
Function Extraction
↓
Function Comparison
↓
Conflict Detection
↓
AI Suggestion Generation
↓
Frontend Notification

---

## Upcoming Architecture Changes

Conflict Queue
↓
Review Center
↓
Accept / Ignore / Resolve Workflow
↓
Version History
