---
name: log-toolkit-issue
description: Log or update an issue found while interacting with the AI for Accessibility Toolkit during the Rehearse the Journey build. Use when someone says "log a toolkit issue", "record this toolkit bug", "update the toolkit issues", or reports a problem with the toolkit (adapters, AbilityModel, Librarian, surfaces, server, extension, docs). Reads and writes Project/toolkit-issues.md.
---

# Log a Toolkit Issue

You log issues found while interacting with the AI for Accessibility Toolkit during the Rehearse the Journey project. The log lives at `Project/toolkit-issues.md` (relative to the repo root: `/home/vincent/Desktop/Projects/senses_Hackathon/AI-for-Accessibility-Toolkit/Project/toolkit-issues.md`).

## What counts as an issue

A **genuine, reproducible** problem with the toolkit itself — its adapters, core (`AbilityModel`/`Librarian`), surfaces, server, browser extension, or docs — that you hit while building or testing Rehearse the Journey. **Not** a bug in the Rehearse the Journey app, and **not** a missing feature we're choosing not to build. If in doubt, ask the person before logging.

Do not fabricate an issue to hit a count. The plan (`Project/rehearse-journey-implementation-plan.md` S7) is explicit: if none are found, report that honestly.

## Steps

1. **Read the log first.** Read `Project/toolkit-issues.md` to find the highest existing `TKI-NNN` ID. The next ID is that +1 (`TKI-001` if the log is empty). Never reuse an ID.

2. **Gather the fields.** You need: Date (today, `YYYY-MM-DD`), Found by, Area, Title, What happened (steps), Expected, Actual, Severity, Status. If the person hasn't given you one, ask — in one short question — only for the fields you're missing. Use the `question` tool if you have it; otherwise ask in one plain message and stop.
   - **Area** is one of: `adapters/<name>` (e.g. `adapters/read-aloud`, `adapters/simplify-text`), `core` (AbilityModel/Librarian), `surfaces`, `server`, `extension`, `docs`, `other`.
   - **Severity** is one of: `blocker` (demo can't run / safeguarding), `major` (feature broken), `minor` (works but wrong), `note` (surprising but harmless).
   - **Status** starts as `open`. Update it to `investigating`, `filed-upstream`, `resolved`, or `wontfix` on later edits.

3. **Append the entry** at the end of the `## Entries` section in `Project/toolkit-issues.md`, using the template block that's already in the file. Replace the placeholder text. Keep the person's own wording in `What happened` and `Notes` where they gave it — don't sanitize their description into generic bug-speak.

4. **Update the index table** at the top of the file: add one row (`ID | Date | Area | Title | Severity | Status`). Keep the table in `ID` order.

5. **If the issue is filed upstream** (GitHub issue on the toolkit repo), set `Status` to `filed-upstream` and put the issue URL in `Upstream`. If it's later resolved upstream, set `Status` to `resolved` and leave the link.

6. **To update an existing issue**, edit its entry in place (Status, Upstream, Notes) and update its index row. Do **not** create a new ID for the same issue.

7. **Confirm what you logged.** Reply with the ID, title, area, and severity in one line, and note whether the index was updated. Do not paste the whole entry back.

## Rules

- One entry per issue. IDs are sequential and never reused.
- Do not delete entries. Use `wontfix` (with a Note explaining why) instead of removing.
- Never put secrets, API keys, personal data, or audio in the log.
- If the person asks to log something that is actually a Rehearse-the-Journey app bug (not a toolkit issue), say so and ask whether they still want it recorded here or somewhere else.