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

# Conflict Queue System (Planned)

## Problem

The current conflict workflow immediately displays a conflict notification whenever a conflict is detected.

This creates several issues:

- Developers are interrupted while coding.
- The same conflict may appear repeatedly.
- No history of previous conflicts exists.
- Developers cannot review conflicts at their own pace.

---

## Solution

Introduce a centralized Conflict Queue.

Instead of immediately acting on a conflict, detected conflicts are stored and managed through a dedicated review workflow.

---

## New Workflow

Code Change
↓
AST Parsing
↓
Function Extraction
↓
Conflict Detection
↓
AI Suggestion Generation
↓
Conflict Queue
↓
Review Center

---

## Conflict Object Structure

```js
{
  id,
  function,
  users,
  aiSuggestion,
  timestamp,
  status
}
```

---

## Status Types

### pending

Conflict detected and waiting for developer review.

### accepted

Developer accepted the AI suggestion.

### ignored

Developer intentionally ignored the conflict.

### resolved

Conflict no longer exists in the codebase.

---

## Conflict Queue Responsibilities

- Store detected conflicts.
- Prevent duplicate conflicts.
- Maintain conflict status.
- Provide conflict history.
- Supply data to the Review Center UI.

---

## Future Enhancements

### Conflict Deduplication

If a conflict already exists for the same function and users, update the existing entry instead of creating a new one.

### Conflict Grouping

Group related conflicts together to reduce review noise.

### Version History Integration

Connect conflicts with file history and future rollback functionality.

### Function-Level Smart Merge

Apply accepted AI suggestions directly to conflicting functions using AST-based replacement.
