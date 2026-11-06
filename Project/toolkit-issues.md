# Toolkit Issues — Rehearse the Journey (Problem Statement 6)

A log of issues found while **interacting with the AI for Accessibility Toolkit** during the Rehearse the Journey build and demo. This is also a hackathon deliverable: the judging criterion "Use of the toolkit and contribution back" expects **≥ 1 genuine toolkit issue logged from co-designer testing**, and the PRD (`Project/PRD.md` §1 success criterion 6) lists it in the delivery checklist.

> Only log **genuine, reproducible** issues. If none are found, report that honestly rather than fabricate one to satisfy a count. (Per `Project/rehearse-journey-implementation-plan.md` S7.)

---

## How to add or update an entry

Use the local skill: ask the coding agent to **"log a toolkit issue"** (skill: `log-toolkit-issue`). It will gather the fields below and append/update an entry in this file following the format.

Or edit this file by hand — copy the template block at the bottom and fill it in. **One entry per issue.** IDs are sequential: `TKI-001`, `TKI-002`, …

## Fields

| Field | Meaning |
|---|---|
| `ID` | `TKI-NNN`, sequential, never reused |
| `Date` | `YYYY-MM-DD` (EAT) the issue was found |
| `Found by` | Who hit it: co-designer, teammate name, or dev |
| `Area` | Which part of the toolkit — `adapters/<name>`, `core` (AbilityModel/Librarian), `surfaces`, `server`, `extension`, `docs`, `other` |
| `Title` | One-line summary |
| `What happened` | Steps to reproduce; what you did |
| `Expected` | What should have happened |
| `Actual` | What happened instead |
| `Severity` | `blocker` / `major` / `minor` / `note` |
| `Status` | `open` / `investigating` / `filed-upstream` / `resolved` / `wontfix` |
| `Upstream` | Link to the GitHub issue if filed upstream; `—` if not |
| `Notes` | Anything else; the co-designer's own words where relevant |

## Index

| ID | Date | Area | Title | Severity | Status |
|---|---|---|---|---|---|
| _none yet_ | | | | | |

---

## Entries

<!-- New entries go below this line. Copy the template block, fill it in, and add a row to the index above. -->

### Template

```markdown
### TKI-NNN — <Title>

- **ID:** TKI-NNN
- **Date:** YYYY-MM-DD
- **Found by:** <who>
- **Area:** <area>
- **What happened:** <steps>
- **Expected:** <expected>
- **Actual:** <actual>
- **Severity:** blocker | major | minor | note
- **Status:** open | investigating | filed-upstream | resolved | wontfix
- **Upstream:** <link> | —
- **Notes:** <notes>
```