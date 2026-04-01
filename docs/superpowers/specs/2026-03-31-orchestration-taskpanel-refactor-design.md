# Orchestration + TaskPanel Refactor — Design Spec
**Date:** 2026-03-31
**Status:** Approved

---

## Overview

Refactor the coaching app so that:

1. **Orchestration** mirrors the memory app pattern: classifier picks agent + skill independently; skill's `executor_type` determines which executor runs — Claude never picks `executor_type` directly.
2. **Tasks UI** mirrors the memory app's ActionPanel: a single unified `TaskPanel` replaces the three separate `BrainstormPanel` / `ExecutionPanel` / `ReportPanel` components.

Skills and agents remain DB-only (no TypeScript registries). All skills/agents are injected directly into the classifier prompt — no vector embeddings needed given the small dataset per instance.

---

## 1. Data Model Changes

### `skills` table
Add `executor_type` column mapping each skill to an executor:

```sql
ALTER TABLE skills ADD COLUMN executor_type TEXT NOT NULL DEFAULT 'draft';
```

The user picks `executor_type` when creating/editing a skill via the UI (same 8 values that already exist: `research`, `document`, `draft`, `analyzer`, `email`, `coach`, `flashcard`, `comparison`).

### `action_steps` table
Add `skill_slug` and `agent_slug` columns to record what Claude assigned:

```sql
ALTER TABLE action_steps ADD COLUMN skill_slug TEXT;
ALTER TABLE action_steps ADD COLUMN agent_slug TEXT;
```

`executor_type` on the step is derived from `skill.executor_type` at accept-plan time — not picked by Claude. `executor_type` remains `NOT NULL`; the accept-plan route guarantees a resolved value (defaulting to `'draft'` if no skill match) before every insert.

The `?? 'draft'` fallback applies only at accept-plan time (new step creation). For existing rows already in the DB, `executor_type` is already populated — no re-derivation happens on old steps.

### TypeScript types (`src/types.ts`)

```typescript
interface Skill {
  id: string
  slug: string
  name: string
  trigger: string
  instructions: string
  output_format: string
  example_output: string | null
  executor_type: ExecutorType   // NEW
  created_at: string
  updated_at: string
}

interface ActionStep {
  // existing fields unchanged
  skill_slug: string | null    // NEW
  agent_slug: string | null    // NEW
  // executor_type already present — now derived from skill
}
```

No breaking changes. Existing steps without `skill_slug` continue to work; `executor_type` falls back to the stored value.

---

## 2. Orchestration Flow

### System prompt changes (`src/lib/agent/system-prompt.ts`)

The brainstorm system prompt is rebuilt to inject all DB skills and agents. The prompt builder:

1. Fetches all agents from `agents` table
2. Fetches all skills from `skills` table
3. Injects two blocks:

```
## Available Agents
- {name} (slug: {slug}) — {role}
... (all agents)

## Available Skills
- {name} (slug: {slug}) — {trigger}
... (all skills, trigger field used as description)

When proposing a plan, output a JSON block in this format:
{
  "plan": [
    {
      "title": "...",
      "description": "...",
      "skill_slug": "<slug from Available Skills>",
      "agent_slug": "<slug from Available Agents, or null>"
    }
  ]
}
```

Claude picks skills and agents by slug. It never picks `executor_type` directly. The `executor_type` field is removed from the plan JSON format — Claude must not output it.

### Accept-plan changes (`src/app/api/actions/[id]/accept-plan/route.ts`)

Current: parse JSON → create steps with `executor_type` taken directly from plan JSON.

New:
```
parse JSON plan
→ fetch all skills from DB
→ for each step in plan:
    skill = skills.find(s => s.slug === step.skill_slug)
    executor_type = skill?.executor_type ?? 'draft'
→ INSERT action_steps with:
    title, description,
    skill_slug,    // from plan
    agent_slug,    // from plan
    executor_type  // derived from skill
```

### Execution pipeline — unchanged

All API routes, executors, SSE streaming, and the execution engine remain untouched. The refactor is isolated to the system prompt builder and the accept-plan derivation logic.

---

## 3. TaskPanel UI

### New component structure

```
src/components/tasks/
├── TaskPanel.tsx          — unified container (replaces BrainstormPanel + ExecutionPanel + ReportPanel)
├── TaskChat.tsx           — brainstorm chat (port of ActionChat)
├── StepRow.tsx            — single step row
├── StepDetailPanel.tsx    — fixed left sidebar: execution log + output
└── CompletionReport.tsx   — post-execution report dialog
```

### `TaskPanel` layout

```
┌─────────────────────────────────────────────────┐
│  HEADER                                         │
│  [Task title]  [status pill]  [report btn]      │
├─────────────────────────────────────────────────┤
│  STEPS LIST (visible once plan accepted)        │
│  ① Web Research    [researcher] [research]  ✓   │
│  ② Write Document  [writer]    [document]   ●   │
│  ③ Draft Email     [writer]    [draft]      ○   │
├─────────────────────────────────────────────────┤
│  CHAT (visible during brainstorming)            │
│  Agent: "What's the goal of this task?"         │
│  You: "..."                                     │
│  [Plan ready — 3 steps]  [Accept & Run]         │
├─────────────────────────────────────────────────┤
│  FOOTER                                         │
│  [Execute]  or  [Pause]  or  (done)             │
└─────────────────────────────────────────────────┘
```

### `StepRow` displays
- Position number
- Step title + description (truncated)
- Skill badge (skill name)
- Agent badge (agent slug, or "unassigned")
- Status icon: pending (grey) → running (cyan spinner) → done (green check) → error (red X)
- Click → opens `StepDetailPanel`

### `StepDetailPanel` (slide-in drawer, portaled to page root)
When a step is clicked, `StepDetailPanel` slides in from the left as a fixed-position overlay (392px wide), sitting alongside the main `TaskPanel`. It does not displace or resize the main panel — it overlays it. The layout is effectively two-column when the drawer is open.

- Shows for the selected/active step
- Phases:
  - **Planning:** title + description from step
  - **Executing:** live log lines streamed via SSE (tool calls, results, errors)
  - **Done:** full output rendered as markdown

### `TaskChat`
- Chat bubbles (user + agent messages)
- "Agent is thinking..." indicator while streaming
- Plan-ready bar: "Plan ready — N steps" with Accept & Run button
- Collapsed (but accessible) once plan is accepted

### State machine

| `action.status` | Chat | Steps | Footer |
|---|---|---|---|
| `brainstorming` | visible, expanded | hidden | — |
| `ready` | collapsed | visible | Execute button |
| `running` | collapsed | visible, active step highlighted | Pause button |
| `done` | collapsed | visible (all checked) | Report button |

### Deletions
`BrainstormPanel.tsx`, `ExecutionPanel.tsx`, `ReportPanel.tsx` — all removed and replaced by `TaskPanel` and its sub-components.

---

## 4. Skill UI — executor_type field

The skill creation/edit form (`src/components/skills/SkillForm.tsx`) gains an `executor_type` selector — a dropdown with the 8 existing executor types. This is required when creating a skill so every skill can drive executor selection.

---

## 5. Files Touched

| File | Change |
|---|---|
| `src/types.ts` | Add `executor_type` to `Skill`; add `skill_slug`, `agent_slug` to `ActionStep` |
| `src/lib/db/migration.sql` | Add columns to `skills` and `action_steps` |
| `src/lib/agent/system-prompt.ts` | Inject agents + skills blocks; update JSON plan format |
| `src/app/api/actions/[id]/accept-plan/route.ts` | Derive `executor_type` from skill lookup |
| `src/components/tasks/TaskPanel.tsx` | New — unified panel |
| `src/components/tasks/TaskChat.tsx` | New — brainstorm chat |
| `src/components/tasks/StepRow.tsx` | New — step row with skill/agent badges |
| `src/components/tasks/StepDetailPanel.tsx` | New — execution log sidebar |
| `src/components/tasks/CompletionReport.tsx` | New — report dialog |
| `src/components/skills/SkillForm.tsx` | Add `executor_type` dropdown |
| `src/app/dashboard/tasks/page.tsx` | Wire `TaskPanel` into task detail area |
| `src/components/tasks/BrainstormPanel.tsx` | Deleted |
| `src/components/tasks/ExecutionPanel.tsx` | Deleted |
| `src/components/tasks/ReportPanel.tsx` | Deleted |

---

## 6. Out of Scope

- Semantic search / vector embeddings — not needed at this scale
- TypeScript agent/skill registries — DB is source of truth
- Changes to executors, API routes (except accept-plan), or SSE infrastructure
- Authentication changes
- New executor types
