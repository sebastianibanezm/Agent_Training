# Foundation Polish — Pass 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 7 systemic UI/UX issues across the coaching app: active nav indicator, empty states, section labels, typography scale, slug humanization, executor type tooltip, and hover consistency.

**Architecture:** All changes are display-layer only — no API routes, no DB migrations, no business logic changes. Two new data fetches are added (skills in agents page, agents in tasks page) to enable slug humanization. One new component is created (`NavLinks.tsx`) to enable `usePathname()` in a server-component layout.

**Tech Stack:** Next.js 14 App Router, React 19, TypeScript, Tailwind CSS v4, Vitest

**Spec:** `docs/superpowers/specs/2026-04-01-foundation-polish-design.md`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/components/shared/NavLinks.tsx` | **Create** | Client component for active nav state |
| `src/app/dashboard/layout.tsx` | Modify (lines 34–47) | Render `<NavLinks />` instead of hardcoded links |
| `src/app/dashboard/agents/page.tsx` | Modify | Add empty state + skills fetch + skillsMap prop |
| `src/app/dashboard/skills/page.tsx` | Modify | Add empty state |
| `src/components/shared/SectionContainer.tsx` | Modify (line 19) | New accent-bar label pattern |
| `src/components/agents/AgentForm.tsx` | Modify (labels ~129, 176, 201) | Replace hardcoded ALL-CAPS labels |
| `src/components/wizard/Step4Agent.tsx` | Modify (any hardcoded labels) | Replace hardcoded ALL-CAPS labels |
| `src/components/wizard/Step5Skill.tsx` | Modify (any hardcoded labels) | Replace hardcoded ALL-CAPS labels |
| `src/components/tasks/StepRow.tsx` | Modify | Label pattern + slug humanization + hover fix + font scale |
| `src/components/tasks/TaskItem.tsx` | Modify | Slug humanization + hover fix |
| `src/components/tasks/TaskDetail.tsx` | Modify | Thread skillsMap/agentsMap to TaskPanel |
| `src/components/tasks/TaskPanel.tsx` | Modify | Thread skillsMap/agentsMap to StepRow + font scale |
| `src/components/agents/AgentCard.tsx` | Modify | Slug humanization + hover fix + font scale |
| `src/components/skills/SkillCard.tsx` | Modify | Hover fix + font scale |
| `src/components/skills/SkillForm.tsx` | Modify (~line 55 area) | Executor type tooltip |

---

## Task 1: NavLinks Client Component

**Files:**
- Create: `src/components/shared/NavLinks.tsx`
- Modify: `src/app/dashboard/layout.tsx`

The dashboard layout is an async server component (runs auth redirect). `usePathname()` is client-only, so nav active state must live in a separate `'use client'` child.

- [ ] **Step 1: Create `NavLinks.tsx`**

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
    <div className="flex gap-1">
      {LINKS.map(({ href, label }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? 'px-3 py-1.5 rounded-md text-sm text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 transition'
                : 'px-3 py-1.5 rounded-md text-sm text-slate-400 hover:text-white hover:bg-[#1e2130] transition'
            }
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Update `layout.tsx` to use `<NavLinks />`**

In `src/app/dashboard/layout.tsx`, add the import and replace lines 34–48:

```tsx
// Add import at top:
import { NavLinks } from '@/components/shared/NavLinks'

// Replace the inner div (lines 34–48) with:
<div className="flex items-center gap-8">
  <span className="font-bold text-sm text-white">{userName}&apos;s Command Center</span>
  <NavLinks />
</div>
```

- [ ] **Step 3: Run dev server and visually verify**

```bash
cd /Users/sebastian.ibanez/documents/coaching-app && npm run dev
```

Open http://localhost:3000/dashboard/tasks — Tasks link should show cyan ghost pill.  
Open http://localhost:3000/dashboard/agents — Agents link should show cyan ghost pill.  
Open http://localhost:3000/dashboard/skills — Skills link should show cyan ghost pill.

- [ ] **Step 4: Commit**

```bash
cd /Users/sebastian.ibanez/documents/coaching-app
git add src/components/shared/NavLinks.tsx src/app/dashboard/layout.tsx
git commit -m "feat: add active nav indicator via NavLinks client component"
```

---

## Task 2: Agents Empty State

**Files:**
- Modify: `src/app/dashboard/agents/page.tsx`

Show a contextual empty state when `agents.length === 0` and not currently loading.

- [ ] **Step 1: Add loading state and empty state to `agents/page.tsx`**

Add `loading` state and render empty state when `agents` is empty. Replace the current `useEffect` and return block:

```tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import { AgentCard } from '@/components/agents/AgentCard'
import { AgentForm } from '@/components/agents/AgentForm'
import type { Agent, Skill } from '@/types'

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Agent | null | 'new'>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/agents').then(r => r.json()),
      fetch('/api/skills').then(r => r.json()),
    ]).then(([agentsData, skillsData]) => {
      if (Array.isArray(agentsData)) setAgents(agentsData)
      if (Array.isArray(skillsData)) setSkills(skillsData)
    }).finally(() => setLoading(false))
  }, [])

  const skillsMap = useMemo(
    () => Object.fromEntries(skills.map(s => [s.slug, s.name])),
    [skills]
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-white">Agents</h1>
        <button
          onClick={() => setEditing('new')}
          className="bg-cyan-500 text-slate-900 font-bold text-sm px-4 py-2 rounded-lg hover:bg-cyan-400 transition"
        >
          + New agent
        </button>
      </div>

      {!loading && agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/8 border border-cyan-500/15 flex items-center justify-center text-xl mb-4">
            🤖
          </div>
          <h3 className="text-[15px] font-semibold text-slate-100 tracking-tight">Build your first AI agent</h3>
          <p className="text-sm text-slate-400 leading-relaxed mt-2 max-w-[260px]">
            Agents are AI workers with a defined role and skills. Create one and give it a task to run.
          </p>
          <button
            onClick={() => setEditing('new')}
            className="mt-5 bg-cyan-500/12 text-cyan-400 border border-cyan-500/20 rounded-md px-4 py-2 text-sm font-medium hover:bg-cyan-500/20 transition-colors"
          >
            + Create your first agent
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              skillsMap={skillsMap}
              onEdit={() => setEditing(agent)}
              onDelete={async () => {
                const res = await fetch(`/api/agents/${agent.slug}`, { method: 'DELETE' })
                if (res.ok) {
                  setAgents(prev => prev.filter(a => a.id !== agent.id))
                } else {
                  alert('Failed to delete agent')
                }
              }}
              onTaskCreated={() => {}}
            />
          ))}
        </div>
      )}

      {editing && (
        <AgentForm
          agent={editing === 'new' ? null : editing}
          onSave={(saved) => {
            setAgents(prev =>
              editing === 'new'
                ? [saved, ...prev]
                : prev.map(a => a.id === saved.id ? saved : a)
            )
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
```

Note: `AgentCard` now receives `skillsMap` — it will error until Task 5 updates the component. Complete Task 2 and Task 5 before verifying.

- [ ] **Step 2: Commit (after Task 5 completes — see note)**

Hold this commit until `AgentCard` accepts `skillsMap`. Committed together in Task 5.

---

## Task 3: Skills Empty State

**Files:**
- Modify: `src/app/dashboard/skills/page.tsx`

- [ ] **Step 1: Add loading state and empty state to `skills/page.tsx`**

Add `loading` state. Replace the full component:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { SkillCard } from '@/components/skills/SkillCard'
import { SkillForm } from '@/components/skills/SkillForm'
import type { Skill } from '@/types'

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Skill | null | 'new'>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/skills')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load skills')
        return res.json()
      })
      .then(setSkills)
      .catch(() => setError('Failed to load skills. Please refresh.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-white">Skills</h1>
        <button
          onClick={() => setEditing('new')}
          className="bg-cyan-500 text-slate-900 font-bold text-sm px-4 py-2 rounded-lg hover:bg-cyan-400 transition"
        >
          + New skill
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {!loading && skills.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/8 border border-cyan-500/15 flex items-center justify-center text-xl mb-4">
            🛠️
          </div>
          <h3 className="text-[15px] font-semibold text-slate-100 tracking-tight">Teach your agents new skills</h3>
          <p className="text-sm text-slate-400 leading-relaxed mt-2 max-w-[260px]">
            Skills are instructions that tell an agent how to do a specific type of work — research, writing, analysis.
          </p>
          <button
            onClick={() => setEditing('new')}
            className="mt-5 bg-cyan-500/12 text-cyan-400 border border-cyan-500/20 rounded-md px-4 py-2 text-sm font-medium hover:bg-cyan-500/20 transition-colors"
          >
            + Create your first skill
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map(skill => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onEdit={() => setEditing(skill)}
              onDelete={async () => {
                const res = await fetch(`/api/skills/${skill.slug}`, { method: 'DELETE' })
                if (res.ok) {
                  setSkills(prev => prev.filter(s => s.id !== skill.id))
                } else {
                  setError('Failed to delete skill. Please try again.')
                }
              }}
            />
          ))}
        </div>
      )}

      {editing && (
        <SkillForm
          skill={editing === 'new' ? null : editing}
          onSave={(saved) => {
            setSkills(prev =>
              editing === 'new'
                ? [saved, ...prev]
                : prev.map(s => s.id === saved.id ? saved : s)
            )
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify visually**

Navigate to Skills page with no skills in the DB. Should show the 🛠️ empty state with CTA button.

- [ ] **Step 3: Commit**

```bash
cd /Users/sebastian.ibanez/documents/coaching-app
git add src/app/dashboard/skills/page.tsx
git commit -m "feat: add contextual empty state to Skills page"
```

---

## Task 4: SectionContainer Label Redesign

**Files:**
- Modify: `src/components/shared/SectionContainer.tsx`

Replace the ALL-CAPS label with an accent-bar + title-case pattern. This affects every place `SectionContainer` is used: agent/skill forms, wizard steps.

- [ ] **Step 1: Update `SectionContainer.tsx` line 19**

Current line 19:
```tsx
<span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{label}</span>
```

Replace the header div's contents (keeping `bg-[#161920]` and border):
```tsx
<div className="bg-[#161920] px-4 py-2.5 flex items-center gap-2 border-b border-[#1e2130]">
  <div className="w-0.5 h-3.5 rounded-full bg-cyan-400/40 flex-shrink-0" />
  <span className="text-[11px] font-semibold text-slate-300">{label}</span>
  {badge && (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${BADGE_STYLES[badge]}`}>
      {badge}
    </span>
  )}
</div>
```

Also bump the body text from `text-sm` to `text-sm` (already correct) and the empty state text from implicit to explicit `text-sm`:
```tsx
<div className={`px-4 py-3 ${empty ? 'text-slate-600 text-sm italic' : 'text-sm text-slate-300 whitespace-pre-wrap'}`}>
```
(No change needed here — it's already `text-sm`.)

- [ ] **Step 2: Verify visually**

Open AgentForm or SkillForm. Section labels (Role, Goals, Constraints, Trigger, etc.) should now show a thin cyan left bar with title-case text instead of ALL-CAPS.

- [ ] **Step 3: Commit**

```bash
cd /Users/sebastian.ibanez/documents/coaching-app
git add src/components/shared/SectionContainer.tsx
git commit -m "feat: replace ALL-CAPS section labels with accent-bar + title-case pattern"
```

---

## Task 5: AgentCard — Slug Humanization + Hover + Font Scale

**Files:**
- Modify: `src/components/agents/AgentCard.tsx`

Add `skillsMap` prop and use human names instead of slugs. Also fix hover and font scale.

- [ ] **Step 1: Update `AgentCard.tsx`**

Replace the full component:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Agent } from '@/types'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { AgentTriggerModal } from './AgentTriggerModal'

interface AgentCardProps {
  agent: Agent
  skillsMap: Record<string, string>
  onEdit: () => void
  onDelete: () => void
  onTaskCreated: () => void
}

export function AgentCard({ agent, skillsMap, onEdit, onDelete, onTaskCreated }: AgentCardProps) {
  const [showDelete, setShowDelete] = useState(false)
  const [showTrigger, setShowTrigger] = useState(false)
  const router = useRouter()

  return (
    <>
      <div className="bg-[#161920] border border-[#1e2130] rounded-xl p-4 flex flex-col gap-3 hover:bg-[#1a1d27] transition-colors">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-bold text-white">{agent.name}</h3>
          <div className="flex gap-1">
            <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-white transition rounded" aria-label="Edit agent">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button onClick={() => setShowDelete(true)} className="p-1.5 text-slate-400 hover:text-red-400 transition rounded" aria-label="Delete agent">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </div>

        {agent.role && (
          <p className="text-sm text-slate-400 line-clamp-1">{agent.role}</p>
        )}

        {agent.goals && (
          <p className="text-sm text-slate-500 line-clamp-2">{agent.goals}</p>
        )}

        {/* Skill chips — show human name, fall back to slug if not in map */}
        <div className="flex flex-wrap gap-1.5">
          {(agent.skill_slugs || []).length === 0 ? (
            <span className="text-xs text-slate-600">No skills assigned</span>
          ) : (
            (agent.skill_slugs || []).map(slug => (
              <span key={slug} className="text-xs font-medium bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                {skillsMap[slug] ?? slug}
              </span>
            ))
          )}
        </div>

        <button
          onClick={() => setShowTrigger(true)}
          className="w-full mt-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-bold py-2 rounded-lg border border-cyan-900 transition"
        >
          ▶ Run agent
        </button>
      </div>

      <ConfirmDialog
        open={showDelete}
        title="Delete agent"
        message={`Delete "${agent.name}"? This cannot be undone.`}
        onConfirm={() => { setShowDelete(false); onDelete() }}
        onCancel={() => setShowDelete(false)}
      />

      <AgentTriggerModal
        open={showTrigger}
        agent={agent}
        onClose={() => setShowTrigger(false)}
        onCreated={() => {
          setShowTrigger(false)
          onTaskCreated()
          router.push('/dashboard/tasks')
        }}
      />
    </>
  )
}
```

- [ ] **Step 2: Commit Tasks 2 + 5 together**

```bash
cd /Users/sebastian.ibanez/documents/coaching-app
git add src/app/dashboard/agents/page.tsx src/components/agents/AgentCard.tsx
git commit -m "feat: agents empty state + skill name humanization on cards"
```

---

## Task 6: SkillCard — Hover + Font Scale

**Files:**
- Modify: `src/components/skills/SkillCard.tsx`

- [ ] **Step 1: Add hover, fix font scale, fix delete button hover color**

Replace the outer card `div` className and update text sizes:

```tsx
// line 13: card container — add hover
<div className="bg-[#161920] border border-[#1e2130] rounded-xl p-4 flex flex-col gap-3 hover:bg-[#1a1d27] transition-colors">

// line 14–17: fix delete icon hover (currently hover:text-white, should be hover:text-red-400)
<button onClick={() => setShowDelete(true)} className="p-1.5 text-slate-400 hover:text-red-400 transition rounded" aria-label="Delete skill">

// line 20: bump trigger text font size
<p className="text-sm text-slate-400 line-clamp-1">{skill.trigger}</p>

// line 26: bump section label text in indicator pills
<span key={label} className="flex items-center gap-1 text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
```

- [ ] **Step 2: Commit**

```bash
cd /Users/sebastian.ibanez/documents/coaching-app
git add src/components/skills/SkillCard.tsx
git commit -m "fix: skill card hover state, font scale, delete icon color"
```

---

## Task 7: AgentForm Hardcoded Labels

**Files:**
- Modify: `src/components/agents/AgentForm.tsx`

The form has hardcoded ALL-CAPS labels for "Name", "Skills", and "Available Tools" sections. Read the full file to find exact locations, then replace each.

- [ ] **Step 1: Find and replace hardcoded labels in `AgentForm.tsx`**

Search for `uppercase tracking-wider` in `AgentForm.tsx`. For each instance, replace with the accent-bar pattern:

```tsx
{/* Old pattern: */}
<p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">NAME</p>

{/* New pattern: */}
<div className="flex items-center gap-2 mb-2">
  <div className="w-0.5 h-3.5 rounded-full bg-cyan-400/40 flex-shrink-0" />
  <span className="text-[11px] font-semibold text-slate-300">Name</span>
</div>
```

Apply the same transformation to:
- "SKILLS" → "Skills"  
- "AVAILABLE TOOLS" → "Available Tools" (keep the `reference` badge if present)

- [ ] **Step 2: Commit**

```bash
cd /Users/sebastian.ibanez/documents/coaching-app
git add src/components/agents/AgentForm.tsx
git commit -m "fix: replace ALL-CAPS hardcoded labels in AgentForm"
```

---

## Task 8: Wizard Step Labels (Step4Agent + Step5Skill)

**Files:**
- Modify: `src/components/wizard/Step4Agent.tsx`
- Modify: `src/components/wizard/Step5Skill.tsx`

Both wizard steps use `SectionContainer` (which is already fixed in Task 4) but may also have standalone hardcoded labels outside of `SectionContainer`.

- [ ] **Step 1: Search for remaining ALL-CAPS labels in both files**

```bash
grep -n "uppercase tracking-wider" \
  src/components/wizard/Step4Agent.tsx \
  src/components/wizard/Step5Skill.tsx
```

- [ ] **Step 2: Replace any found instances with the accent-bar pattern**

Same replacement as Task 7. If no instances found, skip to commit.

- [ ] **Step 3: Commit**

```bash
cd /Users/sebastian.ibanez/documents/coaching-app
git add src/components/wizard/Step4Agent.tsx src/components/wizard/Step5Skill.tsx
git commit -m "fix: replace ALL-CAPS labels in wizard steps 4 and 5"
```

---

## Task 9: StepRow — Labels + Hover + Slug Humanization

**Files:**
- Modify: `src/components/tasks/StepRow.tsx`

StepRow currently shows raw `skill_slug` and `agent_slug`. These will be replaced with human names via props. Also standardize hover.

- [ ] **Step 1: Update `StepRow.tsx` to accept name maps + fix hover**

```tsx
'use client'

import { ActionStep } from '@/types'

interface StepRowProps {
  step: ActionStep
  position: number
  isSelected: boolean
  onClick: () => void
  skillsMap: Record<string, string>
  agentsMap: Record<string, string>
}

function StatusIcon({ status }: { status: ActionStep['status'] }) {
  if (status === 'running') {
    return (
      <span className="animate-spin inline-block w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full" />
    )
  }
  if (status === 'done' || status === 'completed') {
    return <span className="text-green-400 text-sm font-bold">✓</span>
  }
  if (status === 'error' || status === 'failed') {
    return <span className="text-red-400 text-sm font-bold">✗</span>
  }
  return <span className="text-slate-500 text-sm">○</span>
}

export function StepRow({ step, position, isSelected, onClick, skillsMap, agentsMap }: StepRowProps) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-[#1e2130] transition ${
        isSelected
          ? 'bg-cyan-500/5 border-l-2 border-l-cyan-400'
          : 'hover:bg-[#1a1d27] border-l-2 border-l-transparent'
      }`}
    >
      {/* Position number */}
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1e2130] text-slate-400 text-xs flex items-center justify-center">
        {position}
      </div>

      {/* Title */}
      <span className="flex-1 text-sm text-slate-200 truncate min-w-0">{step.title}</span>

      {/* Badges — human names */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {step.skill_slug && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 whitespace-nowrap">
            {skillsMap[step.skill_slug] ?? step.skill_slug}
          </span>
        )}
        {step.agent_slug && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 border border-slate-600/30 whitespace-nowrap">
            {agentsMap[step.agent_slug] ?? step.agent_slug}
          </span>
        )}
      </div>

      {/* Status icon */}
      <div className="flex-shrink-0 w-5 flex items-center justify-center">
        <StatusIcon status={step.status} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Do not commit yet** — StepRow's new props must be provided by TaskPanel (Task 10).

---

## Task 10: Prop Threading — Tasks Page → TaskDetail → TaskPanel → StepRow

**Files:**
- Modify: `src/app/dashboard/tasks/page.tsx`
- Modify: `src/components/tasks/TaskDetail.tsx`
- Modify: `src/components/tasks/TaskPanel.tsx`

- [ ] **Step 1: Update `tasks/page.tsx` — fetch agents, build agentsMap**

Add `Agent` import and fetch. Add to existing `useEffect`:

```tsx
// Add to imports
import type { Task, Agent } from '@/types'

// Add state
const [agents, setAgents] = useState<Agent[]>([])

// In useEffect, fetch agents alongside tasks:
useEffect(() => {
  Promise.all([
    fetch('/api/tasks').then(r => r.json()),
    fetch('/api/agents').then(r => r.json()),
  ]).then(([tasksData, agentsData]) => {
    if (Array.isArray(tasksData)) setTasks(tasksData)
    if (Array.isArray(agentsData)) setAgents(agentsData)
  }).finally(() => setLoading(false))
}, [])

// Add memo
import { useMemo } from 'react'  // add to existing react import

const agentsMap = useMemo(
  () => Object.fromEntries(agents.map(a => [a.slug, a.name])),
  [agents]
)
```

Pass `agentsMap` to `TaskItem` and `TaskDetail`:
```tsx
// TaskItem (add agentsMap prop):
<TaskItem
  task={task}
  isSelected={task.id === selectedId}
  onClick={() => setSelectedId(task.id)}
  agentsMap={agentsMap}
/>

// TaskDetail (add agentsMap prop):
<TaskDetail
  task={selected}
  agentsMap={agentsMap}
  onTaskUpdate={...}
  onTaskDelete={...}
/>
```

- [ ] **Step 2: Update `TaskItem.tsx` — accept agentsMap, show agent name**

Add prop and replace slug display:
```tsx
interface TaskItemProps {
  task: Task
  isSelected: boolean
  onClick: () => void
  agentsMap: Record<string, string>
}

export function TaskItem({ task, isSelected, onClick, agentsMap }: TaskItemProps) {
  // ...existing status logic...
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-[#1e2130] hover:bg-[#1a1d27] transition ${
        isSelected ? 'border-l-2 border-l-cyan-400 bg-[#161920]' : 'border-l-2 border-l-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm text-slate-200 font-medium leading-tight line-clamp-2">{task.title}</span>
        <StatusPill status={task.status} />
      </div>
      {task.agent_slug && (
        <div className="text-xs text-slate-600 mt-0.5">
          {agentsMap[task.agent_slug] ?? task.agent_slug}
        </div>
      )}
      {subText && (
        <div className="text-xs text-slate-500 mt-0.5">{subText}</div>
      )}
    </button>
  )
}
```

Note: `text-[10px]` → `text-xs` on the metadata lines (typography fix bundled here).

- [ ] **Step 3: Update `TaskDetail.tsx` — accept and forward agentsMap**

Note: `TaskDetail` does not need `skillsMap` — it only renders `<TaskPanel>`. `TaskPanel` will need `skillsMap` for `StepRow`. But `TasksPage` does not fetch skills (only agents). The skills fetch is in `AgentsPage`. To keep things simple and avoid a second fetch in TasksPage:

**Decision:** `TaskPanel` passes `skillsMap` and `agentsMap` to `StepRow`. `TasksPage` fetches agents (done above). For skills, `TaskPanel` fetches skills itself once on mount (small addition, isolated to the panel that needs it).

Update `TaskDetail.tsx` — add `agentsMap` prop and forward it:
```tsx
interface TaskDetailProps {
  task: Task
  agentsMap: Record<string, string>
  onTaskUpdate: (updated: Task) => void
  onTaskDelete: (id: string) => void
}

export function TaskDetail({ task, agentsMap, onTaskUpdate, onTaskDelete }: TaskDetailProps) {
  // ...existing state...

  return (
    <div className="flex flex-col h-full">
      {/* ...existing content... */}
      <div className="flex-1 overflow-hidden relative p-4 flex flex-col min-h-0">
        {action ? (
          <TaskPanel
            action={action}
            title={task.title}
            agentsMap={agentsMap}
            onActionUpdated={handleActionUpdated}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-600 text-sm">
            No action found for this task.
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update `TaskPanel.tsx` — accept agentsMap, fetch skills internally, pass maps to StepRow**

Add to `TaskPanelProps`:
```tsx
interface TaskPanelProps {
  title: string
  action: Action
  agentsMap: Record<string, string>
  onActionUpdated: (action: Action) => void
}
```

Add skills fetch inside `TaskPanel`:
```tsx
// Add to imports
import type { Action, ActionStep, Skill } from '@/types'

// Add state
const [skills, setSkills] = useState<Skill[]>([])
const skillsMap = useMemo(
  () => Object.fromEntries(skills.map(s => [s.slug, s.name])),
  [skills]
)

// Fetch skills once on mount
useEffect(() => {
  fetch('/api/skills').then(r => r.json()).then(data => {
    if (Array.isArray(data)) setSkills(data)
  })
}, [])
```

Update each `<StepRow>` render to pass the maps:
```tsx
<StepRow
  key={step.id}
  step={step}
  position={step.position}
  isSelected={selectedStep?.id === step.id}
  onClick={() => setSelectedStep(step)}
  skillsMap={skillsMap}
  agentsMap={agentsMap}
/>
```

- [ ] **Step 5: Commit all task-threading changes together**

```bash
cd /Users/sebastian.ibanez/documents/coaching-app
git add \
  src/app/dashboard/tasks/page.tsx \
  src/components/tasks/TaskDetail.tsx \
  src/components/tasks/TaskPanel.tsx \
  src/components/tasks/TaskItem.tsx \
  src/components/tasks/StepRow.tsx
git commit -m "feat: humanize agent/skill names in task list and step rows"
```

---

## Task 11: Executor Type Tooltip in SkillForm

**Files:**
- Modify: `src/components/skills/SkillForm.tsx`

`AgentForm.tsx` already defines `EXECUTOR_DESCRIPTIONS` at lines 8–17 covering all 8 types. Import that constant or duplicate it in `SkillForm`.

- [ ] **Step 1: Add `EXECUTOR_DESCRIPTIONS` to `SkillForm.tsx` and render the hint**

Add the constant near the top of `SkillForm.tsx` (after imports):

```tsx
const EXECUTOR_DESCRIPTIONS: Record<string, string> = {
  research:   'Searches the web and synthesizes information',
  document:   'Creates structured documents and reports',
  draft:      'Writes first drafts of content',
  analyzer:   'Analyzes data, patterns, and insights',
  email:      'Composes professional email communications',
  comparison: 'Compares options and produces decision matrices',
  coach:      'Provides personalized coaching and feedback',
  flashcard:  'Creates study materials and flashcard sets',
}
```

Find the executor type `<select>` in the form JSX. Add the hint immediately after the closing `</select>` tag:

```tsx
{executorType && EXECUTOR_DESCRIPTIONS[executorType] && (
  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
    {EXECUTOR_DESCRIPTIONS[executorType]}
  </p>
)}
```

- [ ] **Step 2: Verify visually**

Open a new SkillForm. Change the executor type dropdown — each selection should show a one-line description below the dropdown.

- [ ] **Step 3: Commit**

```bash
cd /Users/sebastian.ibanez/documents/coaching-app
git add src/components/skills/SkillForm.tsx
git commit -m "feat: add plain-English executor type hint in SkillForm"
```

---

## Task 12: Global Typography Scale

**Files:**
- Multiple components (see table below)

Bump `text-xs` body text to `text-sm` or `text-base` per the scale rules. Badge/pill text and timestamps stay `text-xs`.

- [ ] **Step 1: Find all `text-xs` instances that should be bumped**

```bash
cd /Users/sebastian.ibanez/documents/coaching-app
grep -rn "text-xs" src/components/ --include="*.tsx" | grep -v "font-semibold.*px\|rounded-full\|StatusPill\|badge\|pill\|tracking" | head -40
```

Review the output. Change `text-xs` → `text-sm` for:
- Body descriptions in `AgentCard` (role, goals lines) — already done in Task 5
- Body descriptions in `SkillCard` (trigger text) — already done in Task 6
- `FirstTaskPrompt` "Task preview" label in `tasks/page.tsx` (line 47)
- Any remaining `text-xs` in `AgentForm.tsx` for section body text
- Any remaining `text-xs` in `StepRow.tsx` — already done in Task 9

- [ ] **Step 2: Fix `FirstTaskPrompt` "Task preview" label**

In `tasks/page.tsx` line 47, the hardcoded "Task preview" label uses `text-[10px] font-semibold text-slate-500 uppercase tracking-wider`. Apply the accent-bar pattern here too:

```tsx
<div className="bg-[#161920] border border-[#1e2130] rounded-lg px-4 py-3 mb-4">
  <div className="flex items-center gap-2 mb-1">
    <div className="w-0.5 h-3.5 rounded-full bg-cyan-400/40 flex-shrink-0" />
    <span className="text-[11px] font-semibold text-slate-300">Task preview</span>
  </div>
  <p className={`text-sm ${company.trim() ? 'text-slate-200' : 'text-slate-600 italic'}`}>{taskTitle}</p>
</div>
```

- [ ] **Step 3: Commit**

```bash
cd /Users/sebastian.ibanez/documents/coaching-app
git add src/app/dashboard/tasks/page.tsx src/components/agents/AgentForm.tsx
git commit -m "fix: typography scale — bump body text from xs to sm, apply label pattern to FirstTaskPrompt"
```

---

## Task 13: Final Visual QA Pass

- [ ] **Step 1: Run the dev server**

```bash
cd /Users/sebastian.ibanez/documents/coaching-app && npm run dev
```

- [ ] **Step 2: Check each section**

| What to check | Expected |
|---|---|
| `/dashboard/tasks` | Tasks link shows cyan ghost pill; TaskItem shows agent human name; StepRow shows human skill/agent names; hover is `#1a1d27` |
| `/dashboard/agents` (no agents) | Empty state shows 🤖 icon + headline + body + cyan outline CTA |
| `/dashboard/agents` (with agents) | Cards show skill human names; hover visible; font sizes bump |
| `/dashboard/skills` (no skills) | Empty state shows 🛠️ icon + headline + body + cyan outline CTA |
| `/dashboard/skills` (with skills) | Cards hover visible; font sizes bump |
| AgentForm open | Section labels show accent bar + title case (Role, Goals, Constraints) |
| SkillForm open | Section labels show accent bar + title case; executor type dropdown shows hint text |
| Wizard Step 4 | Section labels show accent bar + title case |
| Wizard Step 5 | Section labels show accent bar + title case |
| FirstTaskPrompt | "Task preview" label shows accent bar + title case |

- [ ] **Step 3: Run TypeScript check**

```bash
cd /Users/sebastian.ibanez/documents/coaching-app && npx tsc --noEmit
```

Expected: 0 errors. Fix any type errors before committing.

- [ ] **Step 4: Final commit if any stragglers**

```bash
cd /Users/sebastian.ibanez/documents/coaching-app
git add -A
git commit -m "fix: final QA cleanup for foundation polish pass 1"
```

---

## Summary

13 tasks, 16 files, 1 new component. No API changes, no DB migrations. All changes are display-layer. The full pass delivers:

- Active nav indicator (ghost pill)
- Empty states on Agents and Skills pages
- Accent-bar + title-case section labels everywhere
- Typography scale bump (body text to `text-sm` minimum)
- Human names for agents and skills in cards, lists, and step rows
- Executor type plain-English hint in SkillForm
- Consistent `hover:bg-[#1a1d27]` across all interactive list items and cards
