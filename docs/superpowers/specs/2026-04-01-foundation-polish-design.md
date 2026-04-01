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

**File:** `src/app/dashboard/layout.tsx`

**Solution:**
- Use `usePathname()` from `next/navigation` to derive the active route
- Apply a ghost pill to the active link: `bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-md px-3 py-1`
- Inactive links: `text-slate-400 hover:text-white transition-colors`
- No changes to nav structure or routing

**Active path matching:**
- `/dashboard/tasks` → Tasks active
- `/dashboard/agents` → Agents active
- `/dashboard/skills` → Skills active
- Use `pathname.startsWith('/dashboard/tasks')` pattern for robustness

---

## 2. Empty States

**Problem:** All three sections (Tasks, Agents, Skills) show nothing when empty. No orientation, no CTA, no explanation of purpose.

**Files:**
- `src/app/dashboard/tasks/page.tsx` — render empty state when task list is empty and no task is selected
- `src/app/dashboard/agents/page.tsx` — render empty state when agents array is empty
- `src/app/dashboard/skills/page.tsx` — render empty state when skills array is empty

**Shared structure (inline, no new component needed):**
```
48px icon box: rounded-xl bg-cyan-500/8 border border-cyan-500/15
  → centered emoji icon (section-specific)
Headline: text-[15px] font-semibold text-slate-100 tracking-tight mt-4
Body copy: text-sm text-slate-400 leading-relaxed mt-2 max-w-[260px] mx-auto
CTA button: bg-cyan-500/12 text-cyan-400 border border-cyan-500/20 
            rounded-md px-4 py-2 text-sm font-medium hover:bg-cyan-500/20 
            transition-colors mt-5
```

**Section-specific copy:**

| Section | Icon | Headline | Body | CTA |
|---------|------|----------|------|-----|
| Tasks | ⚡ | Run your first agent | Tasks are jobs you give to your AI agents. Describe what you want done — your agent handles the rest. | + Create your first task |
| Agents | 🤖 | Build your first AI agent | Agents are AI workers with a defined role and skills. Create one and give it a task to run. | + Create your first agent |
| Skills | 🛠 | Teach your agents new skills | Skills are instructions that tell an agent how to do a specific type of work — research, writing, analysis. | + Create your first skill |

**CTA behavior:** Clicking the CTA triggers the same action as the `+ New X` button in the page header (opens the creation form/panel).

**Layout:** Empty state centered vertically and horizontally within the content area, `text-center`, `max-w-sm mx-auto`.

---

## 3. Section Labels

**Problem:** `UPPERCASE TRACKING-WIDER` labels are used for every section across agent forms, skill forms, wizard steps, and task panels. Overuse creates visual noise with no resting points.

**Affected files:**
- `src/components/shared/SectionContainer.tsx` — primary change (all labels rendered here)
- `src/components/wizard/Step4Agent.tsx` — hardcoded labels
- `src/components/wizard/Step5Skill.tsx` — hardcoded labels
- `src/components/tasks/StepRow.tsx` — any section labels
- `src/components/tasks/TaskPanel.tsx` — any hardcoded section labels

**Old pattern:**
```tsx
<span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
  ROLE
</span>
```

**New pattern:**
```tsx
<div className="flex items-center gap-2 mb-2">
  <div className="w-0.5 h-3.5 rounded-full bg-cyan-400/40" />
  <span className="text-[11px] font-semibold text-slate-300">
    Role
  </span>
</div>
```

**Rules:**
- Title case (not ALL-CAPS)
- `text-[11px] font-semibold text-slate-300`
- Always preceded by the `w-0.5 h-3.5 rounded-full bg-cyan-400/40` accent bar
- The accent bar and label share a flex row with `gap-2 items-center`
- Badge (editable / auto-assigned / reference) remains after the label if present

---

## 4. Typography Scale

**Problem:** The app overuses `text-xs` (10–12px) for body content, making the UI dense and hard to read for a non-technical learning audience.

**Rules (apply globally):**

| Use case | Old | New |
|----------|-----|-----|
| Badge/pill text, timestamps, metadata | `text-xs` (12px) | Keep `text-xs` |
| Form labels, secondary body | `text-xs` | `text-sm` (14px) |
| Card body descriptions | `text-xs`/`text-sm` | `text-sm` (14px) |
| Chat messages | `text-sm` | `text-sm` (keep) |
| Step descriptions, task panel body | `text-sm` | `text-base` (16px) |
| Section explainer text | `text-xs` | `text-sm` (14px) |

**Files most affected:** `SectionContainer.tsx`, `AgentCard.tsx`, `SkillCard.tsx`, `StepRow.tsx`, wizard step components.

**Do not change:** Font families (Geist stays), font weights, line heights.

---

## 5. Slug Humanization

**Problem:** Skill and agent slugs (e.g., `web-researcher`, `draft-writer`) are shown on cards and in the task sidebar instead of human-readable names.

**Affected components and fix:**

| Component | Current | Fix |
|-----------|---------|-----|
| `AgentCard.tsx` | Skill slug pills | Show `skill.name` |
| `TaskItem.tsx` | Agent slug below title | Show `agent.name` |
| `StepRow.tsx` | Skill slug + agent slug pills | Show `skill.name` / `agent.name` |

**Data availability:** `name` is already present on all agent and skill records fetched from Supabase. This is a display-only change — no new queries needed.

**Slug display:** Remove slug display entirely from all card and list contexts. Slugs remain in the database and are used internally (routing, API) but are not shown in the UI.

---

## 6. Executor Type Tooltip

**Problem:** The executor type dropdown in `SkillForm.tsx` shows options (`research`, `document`, `draft`, `analyze`, etc.) without explanation. These are opaque to non-technical users.

**File:** `src/components/skills/SkillForm.tsx`

**Solution:** Below the executor type `<select>`, render a one-line hint that updates dynamically when the selection changes:

```tsx
const EXECUTOR_DESCRIPTIONS: Record<string, string> = {
  research:  "Agent will search the web and summarize findings.",
  document:  "Agent will read and extract information from documents.",
  draft:     "Agent will write content — emails, reports, social posts.",
  analyze:   "Agent will review data or text and produce structured insights.",
  plan:      "Agent will break a goal into steps and create an action plan.",
  // add others as needed
}
```

Rendered as:
```tsx
{executorType && EXECUTOR_DESCRIPTIONS[executorType] && (
  <p className="text-xs text-slate-500 mt-1.5">
    {EXECUTOR_DESCRIPTIONS[executorType]}
  </p>
)}
```

No tooltip component needed — inline hint text is sufficient and more accessible.

---

## 7. Hover State Consistency

**Problem:** Interactive list items and cards use four different hover background values (`#161920`, `#1a1d27`, `#1e2130`, `opacity-80`), creating inconsistent tactile feedback.

**Standardized token:** `hover:bg-[#1a1d27]` — sits between the current card background and border color, providing clear but not jarring feedback.

**Affected files and their current values:**
- `TaskItem.tsx` — `hover:bg-[#161920]` → `hover:bg-[#1a1d27]`
- `AgentCard.tsx` — various → `hover:bg-[#1a1d27]`
- `SkillCard.tsx` — various → `hover:bg-[#1a1d27]`
- `StepRow.tsx` — `hover:bg-[#1e2130]/50` → `hover:bg-[#1a1d27]`

**Do not change:** Button hover states (these use semantic color tokens like `hover:bg-cyan-500/20` which are intentional).

---

## Out of Scope for Pass 1

The following issues are deferred to Pass 2 (Onboarding Wizard improvements):
- Step 2 DB setup de-risking
- Step 3 API key show/hide toggle
- Step 3 failed test button state
- Steps 4/5 chat-to-sections visual connection
- Executor type explanation in wizard context
- "Skip" button de-emphasis
- "Finish setup" milestone moment

The following are deferred to a future Pass 3:
- CompletionReport success celebration
- Mobile adaptation for side panels
- Unsaved changes warning on forms
- Task deletion from sidebar
- Pagination for large task/agent/skill lists

---

## Files Changed Summary

| File | Change type |
|------|-------------|
| `src/app/dashboard/layout.tsx` | Add active nav indicator |
| `src/app/dashboard/tasks/page.tsx` | Add empty state |
| `src/app/dashboard/agents/page.tsx` | Add empty state |
| `src/app/dashboard/skills/page.tsx` | Add empty state |
| `src/components/shared/SectionContainer.tsx` | New label pattern |
| `src/components/wizard/Step4Agent.tsx` | New label pattern |
| `src/components/wizard/Step5Skill.tsx` | New label pattern |
| `src/components/tasks/StepRow.tsx` | New label pattern + slug humanization + hover fix |
| `src/components/tasks/TaskItem.tsx` | Slug humanization + hover fix |
| `src/components/tasks/TaskPanel.tsx` | Label pattern, font scale |
| `src/components/agents/AgentCard.tsx` | Slug humanization + hover fix + font scale |
| `src/components/agents/AgentForm.tsx` | Label pattern + font scale |
| `src/components/skills/SkillCard.tsx` | Hover fix + font scale |
| `src/components/skills/SkillForm.tsx` | Executor type tooltip |

**Total files:** 14  
**New files:** 0  
**New components:** 0  
**API/DB changes:** None
