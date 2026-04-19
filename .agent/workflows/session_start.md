---
description: What the AI must do at the start of every new session
---

# Session Start Protocol

This workflow runs automatically at the beginning of EVERY conversation on this project.

## Steps (in order, no skipping):

1. **Read the AI diary:**
   Read the file `AI_DIARY.md` at the project root (`/Users/thirunavukarasu/ShailajaIASApp/shailaja-ias/AI_DIARY.md`).
   This file contains the full project context, architecture, known issues, and changelog.

2. **Read the style guide:**
   If the task involves any UI work, read `apps/client/app/style.json`.
   Then read `.agent/workflows/apply_style.md`.

3. **Verify environment:**
   Check `apps/api/.env` to confirm database URI, ports, and keys are set.

4. **Confirm understanding:**
   Briefly acknowledge to the user what the current state of the project is, then ask what to work on next (unless the user has already stated a task).

## After Every Session: Update the Diary

At the end of every session where code was meaningfully changed:

1. Open `AI_DIARY.md`
2. Add a **CHANGELOG** entry at the bottom of the changelog section with:
   - Date (use current local time)
   - Summary of what was built or changed
   - Any new gotchas or issues discovered
   - Status update on pending features
3. Update the **"WHAT IS BUILT"** section to reflect new completions
4. Commit the diary update as part of the session's work

## Why this matters:
Each AI session starts with zero memory. This diary is the only continuity.
A well-maintained diary means the next session can start in 5 minutes instead of 30.
