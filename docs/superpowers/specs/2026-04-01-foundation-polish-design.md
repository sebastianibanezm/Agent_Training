# Foundation Polish — Pass 1 Design Spec

**Date:** 2026-04-01  
**Scope:** Navigation, empty states, section labels, typography scale, slug humanization, executor type tooltip, hover consistency  
**Pass:** 1 of 2 (Pass 2 covers onboarding wizard improvements)

---

## Overview

This pass addresses systemic UI/UX issues that affect every section of the app. None of these changes touch data models, API routes, or business logic — they are display-layer and interaction-layer corrections. All changes must be independently testable by visual inspection.

---

## 1. Navigation — Active State Indicator

**Problem:** The top nav (Tasks / Agents / Skills) has no visual indication of which page is active. Users lose wayfinding context when navigating or after being redirected between sections.

**Files:**
- `src/app/dashboard/layout.tsx` — extract nav into a client component
- `src/components/shared/NavLinks.tsx` — new client component (the only new file in this pass)

**Solution:**

`dashboard/layout.tsx` is a server component (runs auth redirect). Extract the nav links into a `'use client'` child component `NavLinks` that reads `usePathname()` itself. The layout renders `<NavLinks />` with no props needed.

```tsx
// src/components/shared/NavLinks.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/dashboard/tasks', label: 'Tasks' },
  { href: '/dashboard/agents', label: 'Agents' },
  { href: '/dashboard/skills', label: 'Skills' },
]

export function NavLinks() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center gap-1">
      {LINKS.map(({ href, label }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={active
              ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-md px-3 py-1 text-sm transition-colors'
              : 'text-slate-400 hover:text-white rounded-md px-3 py-1 text-sm transition-colors'
            }
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
```

Replace the current hardcoded link list in `layout.tsx` with `<NavLinks />`.

---

## 2. Empty States

**Problem:** All three sections (Tasks, Agents, Skills) show nothing when empty. No orientation, no CTA, no explanation of purpose.

**Tasks page — no change needed:** `tasks/page.tsx` already renders `<FirstTaskPrompt>` in the **right panel** when `tasks.length === 0 && !selectedId`. This component (a company-name input that creates an interview-prep task) already serves as the Tasks empty state. Do not replace or duplicate it.

Empty states are only added to **Agents** and **Skills** in this pass.

**Files:**
- `src/app/dashboard/agents/page.tsx` — full-page empty state when agents array is empty
- `src/app/dashboard/skills/page.tsx` — full-page empty state when skills array is empty

**Shared structure (inline JSX, no new component):**
```tsx
<div className="flex flex-col items-center justify-center h-full text-center">
  <div className="w-12 h-12 rounded-xl bg-cyan-500/8 border border-cyan-500/15 
                  flex items-center justify-center text-xl mb-4">
    {icon}
  </div>
  <h3 className="text-[15px] font-semibold text-slate-100 tracking-tight">{headline}</h3>
  <p className="text-sm text-slate-400 leading-relaxed mt-2 max-w-[260px]">{body}</p>
  <button
    onClick={onCta}
    className="mt-5 bg-cyan-500/12 text-cyan-400 border border-cyan-500/20 
               rounded-md px-4 py-2 text-sm font-medium hover:bg-cyan-500/20 transition-colors"
  >
    {ctaLabel}
  </button>
</div>
```

**Section-specific copy:**

| Section | Icon | Headline | Body | CTA | `onCta` |
|---------|------|----------|------|-----|---------|
| Agents | 🤖 | Build your first AI agent | Agents are AI workers with a defined role and skills. Create one and give it a task to run. | + Create your first agent | same handler as `+ New agent` button (opens AgentForm panel) |
| Skills | 🛠️ | Teach your agents new skills | Skills are instructions that tell an agent how to do a specific type of work — research, writing, analysis. | + Create your first skill | same handler as `+ New skill` button (opens SkillForm panel) |

---

## 3. Section Labels

**Problem:** `UPPERCASE TRACKING-WIDER` labels are used for every section. Overuse creates visual noise with no resting points.

**Affected files:**
- `src/components/shared/SectionContainer.tsx` — primary change
- `src/components/wizard/Step4Agent.tsx` — hardcoded labels
- `src/components/wizard/Step5Skill.tsx` — hardcoded labels
- `src/components/tasks/StepRow.tsx` — any section labels
- `src/components/tasks/TaskPanel.tsx` — any hardcoded section labels

**`SectionContainer` specifics:** The component renders a card-like container with a header row (`bg-[#161920]`, border-bottom). The label lives inside this header row. Replace the label span with the new accent-bar pattern **inside** the existing header div — do not remove the header's background or border treatment.

**Old label pattern:**
```tsx
<span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
  ROLE
</span>
```

**New label pattern:**
```tsx
<div className="flex items-center gap-2">
  <div className="w-0.5 h-3.5 rounded-full bg-cyan-400/40 flex-shrink-0" />
  <span className="text-[11px] font-semibold text-slate-300">
    Role
  </span>
</div>
```

**Rules:**
- Title case (not ALL-CAPS)
- `text-[11px] font-semibold text-slate-300`
- Always preceded by `w-0.5 h-3.5 rounded-full bg-cyan-400/40 flex-shrink-0`
- Accent bar and label share a flex row with `gap-2 items-center`
- Badge (`editable` / `auto-assigned` / `reference`) appears **after** the label span if present — the whole row is `flex items-center gap-2`
- **Do not change badge shape** — keep existing `rounded-full` on badge elements; the `BADGE_STYLES` map in `SectionContainer.tsx` is unchanged

**`AgentForm.tsx` labels:** The form has hardcoded `uppercase tracking-wider` labels at approximately lines 129 ("Name"), 176 ("Skills"), and 201 ("Available Tools"). Apply the same accent-bar + title-case pattern to each of these. "Available Tools" is a reference section — keep its `reference` badge style, just update the label text treatment.

---

## 4. Typography Scale

**Problem:** The app overuses `text-xs` (10–12px) for body content, making the UI dense and hard to read for a non-technical learning audience.

**Rules (apply globally):**

| Use case | Old | New |
|----------|-----|-----|
| Badge/pill text, timestamps, metadata | `text-xs` | Keep `text-xs` |
| Form labels, secondary body | `text-xs` | `text-sm` (14px) |
| Card body descriptions | `text-xs`/`text-sm` | `text-sm` (14px) |
| Chat messages | `text-sm` | Keep `text-sm` |
| Step descriptions, task panel body | `text-sm` | `text-base` (16px) |
| Section explainer text | `text-xs` | `text-sm` (14px) |

**Files most affected:** `SectionContainer.tsx`, `AgentCard.tsx`, `SkillCard.tsx`, `StepRow.tsx`, wizard step components.

**Do not change:** Font families (Geist stays), font weights, line heights.

---

## 5. Slug Humanization

**Problem:** Skill and agent slugs (e.g., `web-researcher`, `draft-writer`) appear on cards and in the task sidebar instead of human-readable names.

### `AgentCard.tsx` — skill pills

`AgentCard` receives an `Agent` with `skill_slugs: string[]` — no hydrated skill objects. To show `skill.name`, `AgentsPage` must pass a `skillsMap` prop.

**`agents/page.tsx`:** Already fetches agents. Add a skills fetch alongside it:
```tsx
const [skills, setSkills] = useState<Skill[]>([])
// fetch skills on mount alongside agents
const skillsMap = useMemo(
  () => Object.fromEntries(skills.map(s => [s.slug, s.name])),
  [skills]
)
// pass to AgentCard:
<AgentCard agent={agent} skillsMap={skillsMap} ... />
```

**`AgentCard.tsx`:** Add `skillsMap: Record<string, string>` prop. Replace slug pills with:
```tsx
{agent.skill_slugs?.map(slug => (
  <span key={slug} className="...">
    {skillsMap[slug] ?? slug}
  </span>
))}
```
Fallback to slug if name not found (defensive).

### `TaskItem.tsx` — agent name

`TaskItem` receives a `Task` with `agent_slug: string | null`. To show `agent.name`, `TasksPage` must pass an `agentsMap` prop.

**`tasks/page.tsx`:** Add agents fetch alongside tasks:
```tsx
const [agents, setAgents] = useState<Agent[]>([])
const agentsMap = useMemo(
  () => Object.fromEntries(agents.map(a => [a.slug, a.name])),
  [agents]
)
// pass to TaskItem:
<TaskItem task={task} agentsMap={agentsMap} ... />
```

**`TaskItem.tsx`:** Add `agentsMap: Record<string, string>` prop. Replace slug display with:
```tsx
{task.agent_slug && (
  <span className="text-xs text-slate-500">
    {agentsMap[task.agent_slug] ?? task.agent_slug}
  </span>
)}
```

### `StepRow.tsx` — skill + agent pills

`StepRow` receives a `Step` with `skill_slug` and `agent_slug`. Same pattern — receive `skillsMap` and `agentsMap` props, threaded down from `TasksPage`.

**Prop threading chain:** `tasks/page.tsx → TaskDetail → TaskPanel → StepRow`

`TaskDetail` sits between `TasksPage` and `TaskPanel`. It currently renders `<TaskPanel task={...} ...>`. Add `skillsMap` and `agentsMap` to `TaskDetail`'s props interface and forward them to `TaskPanel`.

**Updated files table for this section:**

| File | Change |
|------|--------|
| `src/app/dashboard/agents/page.tsx` | Fetch skills, build `skillsMap`, pass to `AgentCard` |
| `src/app/dashboard/tasks/page.tsx` | Fetch agents, build `agentsMap`, pass to `TaskItem` and `TaskDetail` |
| `src/components/tasks/TaskDetail.tsx` | Accept + forward `skillsMap`/`agentsMap` to `TaskPanel` |
| `src/components/agents/AgentCard.tsx` | Accept `skillsMap` prop, use names |
| `src/components/tasks/TaskItem.tsx` | Accept `agentsMap` prop, use names |
| `src/components/tasks/TaskPanel.tsx` | Accept + thread `skillsMap`/`agentsMap` to `StepRow` |
| `src/components/tasks/StepRow.tsx` | Accept `skillsMap`/`agentsMap` props, use names |

---

## 6. Executor Type Tooltip

**Problem:** The executor type dropdown in `SkillForm.tsx` is opaque to non-technical users.

**File:** `src/components/skills/SkillForm.tsx`

**Note:** `AgentForm.tsx` already has an `EXECUTOR_DESCRIPTIONS` constant (lines 8–17) covering all 8 types. Reuse that same constant or move it to a shared location. Do not define a second incomplete copy.

The actual executor types from `src/types.ts`:
```ts
'research' | 'document' | 'draft' | 'analyzer' | 'email' | 'comparison' | 'coach' | 'flashcard'
```

**`EXECUTOR_DESCRIPTIONS` must cover all 8 types.** Check `AgentForm.tsx` lines 8–17 for the existing descriptions. If they cover all 8, import/copy them into `SkillForm`. If any are missing, add them.

**Rendered hint:**
```tsx
{executorType && EXECUTOR_DESCRIPTIONS[executorType] && (
  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
    {EXECUTOR_DESCRIPTIONS[executorType]}
  </p>
)}
```

No tooltip component needed — inline hint text is more accessible.

---

## 7. Hover State Consistency

**Problem:** Interactive list items and cards use inconsistent hover values.

**Standardized token:** `hover:bg-[#1a1d27] transition-colors`

**Affected files:**

| File | Change |
|------|--------|
| `TaskItem.tsx` | Replace `hover:bg-[#161920]` → `hover:bg-[#1a1d27]` |
| `AgentCard.tsx` | **Add** `hover:bg-[#1a1d27] transition-colors` (no current hover class on card container) |
| `SkillCard.tsx` | Replace any existing hover class → `hover:bg-[#1a1d27]` |
| `StepRow.tsx` | Replace `hover:bg-[#1e2130]/50` → `hover:bg-[#1a1d27]` |

**Do not change:** Button hover states (`hover:bg-cyan-500/20`, `hover:bg-red-800`, etc. — these are intentional semantic tokens).

---

## Out of Scope for Pass 1

**Deferred to Pass 2 (Onboarding Wizard):**
- Step 2 DB setup de-risking
- Step 3 API key show/hide toggle + failed test button state
- Steps 4/5 chat-to-sections visual connection
- "Skip" button de-emphasis
- "Finish setup" milestone moment

**Deferred to Pass 3:**
- CompletionReport success celebration
- Mobile adaptation for side panels
- Unsaved changes warning on forms
- Task deletion from sidebar
- Pagination for large lists

---

## Files Changed Summary

| File | Change type |
|------|-------------|
| `src/app/dashboard/layout.tsx` | Render `<NavLinks />` in place of hardcoded links |
| `src/components/shared/NavLinks.tsx` | **New** — client component for active nav |
| `src/app/dashboard/tasks/page.tsx` | Fetch agents + build `agentsMap` + pass to `TaskItem` and `TaskDetail` |
| `src/app/dashboard/agents/page.tsx` | Full-page empty state + fetch skills + build `skillsMap` + pass to `AgentCard` |
| `src/app/dashboard/skills/page.tsx` | Full-page empty state |
| `src/components/shared/SectionContainer.tsx` | New label pattern + font scale |
| `src/components/wizard/Step4Agent.tsx` | New label pattern |
| `src/components/wizard/Step5Skill.tsx` | New label pattern |
| `src/components/tasks/StepRow.tsx` | Label pattern + slug humanization + hover fix |
| `src/components/tasks/TaskItem.tsx` | Slug humanization + hover fix |
| `src/components/tasks/TaskDetail.tsx` | Accept + forward `skillsMap`/`agentsMap` to `TaskPanel` |
| `src/components/tasks/TaskPanel.tsx` | Accept + thread `skillsMap`/`agentsMap` to `StepRow` + font scale |
| `src/components/agents/AgentCard.tsx` | Slug humanization + hover fix + font scale |
| `src/components/agents/AgentForm.tsx` | Label pattern + font scale |
| `src/components/skills/SkillCard.tsx` | Hover fix + font scale |
| `src/components/skills/SkillForm.tsx` | Executor type tooltip |

**Total files:** 16 (15 modified + 1 new)  
**New components:** 1 (`NavLinks.tsx`)  
**API/DB changes:** None  
**New queries:** 2 (skills fetch in agents page, agents fetch in tasks page) — both are simple `SELECT *` fetches using the existing Supabase client pattern
