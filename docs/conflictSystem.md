# Conflict System

## Goal

Allow developers to collaborate without being constantly interrupted by merge conflict notifications.

---

## Current System

Code Change
↓
AST Parsing
↓
Function Extraction
↓
Conflict Detection
↓
AI Suggestion
↓
Immediate Popup

Problem:

Developers get interrupted while coding.

---

## New System (Under Development)

Code Change
↓
Conflict Detection
↓
AI Suggestion
↓
Conflict Queue
↓
Review Center

---

## Conflict Object

{
id,
function,
users,
aiSuggestion,
timestamp,
status
}

---

## Status Types

pending

Conflict requires review.

accepted

AI suggestion applied.

ignored

Developer intentionally ignored.

resolved

Conflict disappeared naturally.

---

## Future Goals

- Conflict deduplication
- Smart conflict grouping
- Function-level merge application
- Version history integration
