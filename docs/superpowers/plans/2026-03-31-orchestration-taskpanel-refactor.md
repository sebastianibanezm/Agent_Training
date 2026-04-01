# Orchestration + TaskPanel Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the coaching app so that skills drive executor selection (Claude picks skill slug → code derives executor_type) and the Tasks UI uses a unified TaskPanel mirroring the memory app's ActionPanel.

**Architecture:** DB-only skills/agents injected directly into Claude's brainstorm prompt. At accept-plan time, `executor_type` is derived from the chosen skill's `executor_type` column — never from Claude's output. The three separate panels (BrainstormPanel, ExecutionPanel, ReportPanel) are replaced by one unified `TaskPanel` with sub-components.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS 4, Supabase (PostgreSQL), Anthropic Claude Sonnet 4.6, Vitest

**Spec:** `docs/superpowers/specs/2026-03-31-orchestration-taskpanel-refactor-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/db/migration.sql` | Modify | Add `executor_type` to skills, `skill_slug`+`agent_slug` to action_steps |
| `src/types.ts` | Modify | Add fields to Skill, ActionStep, update PlanStep |
| `src/lib/agent/plan-parser.ts` | Modify | Parse new `skill_slug`/`agent_slug` plan format |
| `src/lib/agent/system-prompt.ts` | Modify | Inject all agents + skills; new plan JSON format |
| `src/app/api/actions/[id]/chat/route.ts` | Modify | Fetch all agents + skills for prompt |
| `src/app/api/actions/[id]/accept-plan/route.ts` | Modify | Derive executor_type from skill lookup |
| `src/app/api/skills/route.ts` | Modify | Include executor_type in POST (create) |
| `src/app/api/skills/[slug]/route.ts` | Modify | Include executor_type in PATCH (update) |
| `src/components/skills/SkillForm.tsx` | Modify | Add executor_type dropdown |
| `src/components/tasks/StepRow.tsx` | Create | Step row with skill + agent badges (replaces execution/StepRow.tsx) |
| `src/components/tasks/StepDetailPanel.tsx` | Create | Fixed left sidebar: step events log + output |
| `src/components/tasks/TaskChat.tsx` | Create | Brainstorm chat, plan-ready bar, accept button |
| `src/components/tasks/CompletionReport.tsx` | Create | Report dialog with step summary + cost |
| `src/components/tasks/TaskPanel.tsx` | Create | Unified container: header, steps, chat, footer |
| `src/app/dashboard/tasks/page.tsx` | Modify | Use TaskPanel instead of TaskDetail |
| `src/components/tasks/TaskDetail.tsx` | Delete | Replaced by TaskPanel |
| `src/components/execution/BrainstormPanel.tsx` | Delete | Replaced by TaskChat |
| `src/components/execution/ExecutionPanel.tsx` | Delete | Replaced by TaskPanel |
| `src/components/execution/ReportPanel.tsx` | Delete | Replaced by CompletionReport |
| `src/components/execution/StepRow.tsx` | Delete | Replaced by tasks/StepRow.tsx |
| `tests/accept-plan.test.ts` | Modify | Update tests for new plan format |

---

## Task 1: DB Migration + TypeScript Types

**Files:**
- Modify: `src/lib/db/migration.sql`
- Modify: `src/types.ts`

- [ ] **Step 1: Add migration SQL**

Open `src/lib/db/migration.sql` and append at the end (after the existing `delete_skill_and_unlink` function):

```sql
-- Migration: add executor_type to skills and skill_slug/agent_slug to action_steps
ALTER TABLE skills ADD COLUMN IF NOT EXISTS executor_type TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE action_steps ADD COLUMN IF NOT EXISTS skill_slug TEXT;
ALTER TABLE action_steps ADD COLUMN IF NOT EXISTS agent_slug TEXT;
```

- [ ] **Step 2: Run migration against Supabase**

In the Supabase dashboard SQL editor (or via CLI), run:
```sql
ALTER TABLE skills ADD COLUMN IF NOT EXISTS executor_type TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE action_steps ADD COLUMN IF NOT EXISTS skill_slug TEXT;
ALTER TABLE action_steps ADD COLUMN IF NOT EXISTS agent_slug TEXT;
```

Verify: Go to Table Editor → `skills` table — confirm `executor_type` column exists with default `'draft'`. Check `action_steps` — confirm `skill_slug` and `agent_slug` columns exist (nullable).

- [ ] **Step 3: Update TypeScript types**

Replace the entire contents of `src/types.ts`:

```typescript
export type TaskStatus = 'draft' | 'brainstorming' | 'planning' | 'running' | 'done'
export type ActionStatus = 'brainstorming' | 'ready' | 'running' | 'done' | 'paused'
export type StepStatus = 'pending' | 'running' | 'done' | 'error'
export type ExecutorType = 'research' | 'document' | 'draft' | 'analyzer' | 'email' | 'comparison' | 'coach' | 'flashcard'

export const EXECUTOR_TYPES: ExecutorType[] = [
  'research', 'document', 'draft', 'analyzer', 'email', 'comparison', 'coach', 'flashcard'
]

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  agent_slug: string | null
  created_at: string
  updated_at: string
}

export interface Action {
  id: string
  task_id: string
  status: ActionStatus
  conversation: ConversationMessage[]
  created_at: string
  updated_at: string
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ActionStep {
  id: string
  action_id: string
  position: number
  title: string
  description: string | null
  executor_type: ExecutorType
  skill_slug: string | null
  agent_slug: string | null
  status: StepStatus
  output: string | null
  error: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Agent {
  id: string
  slug: string
  name: string
  role: string
  goals: string
  constraints: string
  skill_slugs: string[]
  created_at: string
  updated_at: string
}

export interface Skill {
  id: string
  slug: string
  name: string
  trigger: string
  instructions: string
  output_format: string
  example_output: string | null
  executor_type: ExecutorType
  created_at: string
  updated_at: string
}

// Plan step shape parsed from Claude's JSON output (new format)
export interface PlanStep {
  title: string
  description: string
  skill_slug: string
  agent_slug: string | null
}
```

- [ ] **Step 4: Commit**

> **Note:** The `EXECUTOR_TYPES` constant exported here is used in Task 6 (`SkillForm`). Make sure it is included in the `types.ts` replacement — it's in the snippet above.

```bash
git add src/lib/db/migration.sql src/types.ts
git commit -m "feat: add executor_type to skills, skill_slug/agent_slug to action_steps, EXECUTOR_TYPES constant"
```

---

## Task 2: Update Plan Parser

The plan parser extracts Claude's JSON plan from the conversation. It now parses `skill_slug`/`agent_slug` instead of `executor_type`.

**Files:**
- Modify: `src/lib/agent/plan-parser.ts`
- Modify: `tests/accept-plan.test.ts`

- [ ] **Step 1: Write the failing tests**

Replace `tests/accept-plan.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { extractPlanFromConversation } from '@/lib/agent/plan-parser'

describe('extractPlanFromConversation', () => {
  it('extracts plan with skill_slug and agent_slug from last assistant message', () => {
    const conversation = [
      { role: 'user' as const, content: 'Help me research Stripe' },
      {
        role: 'assistant' as const,
        content: 'Here\'s my plan:\n\n```json\n{"plan":[{"title":"Research","description":"Do research","skill_slug":"web-research","agent_slug":"researcher"}]}\n```',
      },
    ]
    const plan = extractPlanFromConversation(conversation)
    expect(plan).toHaveLength(1)
    expect(plan![0].title).toBe('Research')
    expect(plan![0].skill_slug).toBe('web-research')
    expect(plan![0].agent_slug).toBe('researcher')
  })

  it('accepts null agent_slug', () => {
    const conversation = [
      {
        role: 'assistant' as const,
        content: '```json\n{"plan":[{"title":"Draft","description":"Write it","skill_slug":"write-doc","agent_slug":null}]}\n```',
      },
    ]
    const plan = extractPlanFromConversation(conversation)
    expect(plan![0].agent_slug).toBeNull()
  })

  it('returns null if no json block found', () => {
    const conversation = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'How can I help?' },
    ]
    expect(extractPlanFromConversation(conversation)).toBeNull()
  })

  it('returns null if plan array is missing', () => {
    const conversation = [
      { role: 'assistant' as const, content: '```json\n{"something":"else"}\n```' },
    ]
    expect(extractPlanFromConversation(conversation)).toBeNull()
  })

  it('skips steps missing skill_slug', () => {
    const conversation = [
      {
        role: 'assistant' as const,
        content: '```json\n{"plan":[{"title":"A","description":"a","skill_slug":"web-research","agent_slug":null},{"title":"B","description":"b"}]}\n```',
      },
    ]
    const plan = extractPlanFromConversation(conversation)
    expect(plan).toHaveLength(1)
    expect(plan![0].title).toBe('A')
  })
})

// Tests for the executor_type derivation logic used in accept-plan/route.ts
// This is a pure function test — no Supabase needed
describe('executor_type derivation from skill', () => {
  function deriveExecutorType(
    skillSlug: string,
    skills: Array<{ slug: string; executor_type: string }>
  ): string {
    const skill = skills.find(s => s.slug === skillSlug)
    return skill?.executor_type ?? 'draft'
  }

  it('returns the skill executor_type when skill is found', () => {
    const skills = [{ slug: 'web-research', executor_type: 'research' }]
    expect(deriveExecutorType('web-research', skills)).toBe('research')
  })

  it('falls back to draft when skill_slug is not found in DB', () => {
    const skills = [{ slug: 'web-research', executor_type: 'research' }]
    expect(deriveExecutorType('unknown-skill', skills)).toBe('draft')
  })

  it('falls back to draft when skills list is empty', () => {
    expect(deriveExecutorType('any-skill', [])).toBe('draft')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/sebastian.ibanez/documents/coaching-app && npm test
```

Expected: Tests fail because `skill_slug` field doesn't exist on parsed output yet.

- [ ] **Step 3: Update plan-parser.ts**

Replace `src/lib/agent/plan-parser.ts`:

```typescript
import type { ConversationMessage, PlanStep } from '@/types'

export function extractPlanFromConversation(
  conversation: ConversationMessage[]
): PlanStep[] | null {
  const lastAssistant = [...conversation]
    .reverse()
    .find(m => m.role === 'assistant')

  if (!lastAssistant) return null

  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/g
  const matches = [...lastAssistant.content.matchAll(jsonBlockRegex)]
  if (matches.length === 0) return null

  const lastMatch = matches[matches.length - 1][1]

  try {
    const parsed = JSON.parse(lastMatch)
    if (!Array.isArray(parsed.plan)) return null

    const steps: PlanStep[] = []
    for (const step of parsed.plan) {
      if (!step.skill_slug) continue  // skip malformed steps
      steps.push({
        title: step.title || 'Untitled step',
        description: step.description || '',
        skill_slug: step.skill_slug,
        agent_slug: step.agent_slug ?? null,
      })
    }

    return steps.length > 0 ? steps : null
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: All 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent/plan-parser.ts tests/accept-plan.test.ts
git commit -m "feat: update plan parser to read skill_slug/agent_slug instead of executor_type"
```

---

## Task 3: Update System Prompt

The system prompt builder now injects all available agents and skills so Claude can pick by slug. The plan JSON format changes to `skill_slug` + `agent_slug`.

**Files:**
- Modify: `src/lib/agent/system-prompt.ts`

- [ ] **Step 1: Replace system-prompt.ts**

```typescript
import type { Agent, Skill } from '@/types'

export function buildBrainstormSystemPrompt(
  agent: Agent | null,
  allAgents: Agent[],
  allSkills: Skill[]
): string {
  const agentsBlock = allAgents.length > 0
    ? `## Available Agents\n${allAgents.map(a => `- ${a.name} (slug: ${a.slug}) — ${a.role}`).join('\n')}`
    : '## Available Agents\nNo agents defined yet.'

  const skillsBlock = allSkills.length > 0
    ? `## Available Skills\n${allSkills.map(s => `- ${s.name} (slug: ${s.slug}) — ${s.trigger}`).join('\n')}`
    : '## Available Skills\nNo skills defined yet.'

  const agentContext = agent
    ? `You are ${agent.name}.\n\n## Your Role\n${agent.role}\n\n## Your Goals\n${agent.goals}\n\n## Constraints\n${agent.constraints}\n\n`
    : 'You are a helpful AI assistant that helps users plan and execute tasks.\n\n'

  return `${agentContext}${agentsBlock}

${skillsBlock}

## Your Task
Help the user clarify what they want to accomplish. Ask one focused question at a time if needed. Once you have enough context, propose a concrete execution plan.

## Plan Format
When ready to commit to a plan, end your message with a JSON block in exactly this format (no other JSON blocks in the same message):

\`\`\`json
{
  "plan": [
    {
      "title": "Step title",
      "description": "What this step does and why",
      "skill_slug": "<slug from Available Skills>",
      "agent_slug": "<slug from Available Agents, or null>"
    }
  ]
}
\`\`\`

Rules:
- Every step must have a \`skill_slug\` from the Available Skills list above.
- \`agent_slug\` must be a slug from Available Agents, or null if no agent is needed.
- Do NOT output \`executor_type\` — that is derived from the skill automatically.
- Only include the JSON block when you are ready to commit. Do not include it in exploratory messages.`
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/agent/system-prompt.ts
git commit -m "feat: rebuild system prompt to inject all agents + skills; plan format uses skill_slug/agent_slug"
```

---

## Task 4: Update Chat Route

> **Dependency:** Requires Task 3 to be complete. The `buildBrainstormSystemPrompt` function signature changed from `(agent, skills)` to `(agent, allAgents, allSkills)` in Task 3. If Task 4 is applied before Task 3, TypeScript will fail to compile.

The chat route currently loads only the agent's associated skills. It now loads all agents and all skills for injection into the prompt.

**Files:**
- Modify: `src/app/api/actions/[id]/chat/route.ts`

- [ ] **Step 1: Replace chat route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAnthropicClient } from '@/lib/getAnthropicClient'
import { buildBrainstormSystemPrompt } from '@/lib/agent/system-prompt'
import { extractPlanFromConversation } from '@/lib/agent/plan-parser'
import type { ConversationMessage } from '@/types'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { message } = await req.json()
  const supabase = createServerClient()

  const { data: action } = await supabase.from('actions').select('*').eq('id', id).single()
  if (!action) return NextResponse.json({ error: 'Action not found' }, { status: 404 })

  const { data: task } = await supabase.from('tasks').select('*').eq('id', action.task_id).single()

  // Load the assigned agent (if any) plus all agents and all skills for the prompt
  const agentSlug = task?.agent_slug ?? null
  const [agentResult, allAgentsResult, allSkillsResult] = await Promise.all([
    agentSlug
      ? supabase.from('agents').select('*').eq('slug', agentSlug).single()
      : Promise.resolve({ data: null }),
    supabase.from('agents').select('*').order('created_at'),
    supabase.from('skills').select('*').order('created_at'),
  ])

  const agent = agentResult.data ?? null
  const allAgents = allAgentsResult.data ?? []
  const allSkills = allSkillsResult.data ?? []

  const systemPrompt = buildBrainstormSystemPrompt(agent, allAgents, allSkills)

  const conversation: ConversationMessage[] = action.conversation || []
  const updatedConversation: ConversationMessage[] = [
    ...conversation,
    { role: 'user', content: message },
  ]

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const client = await getAnthropicClient()
        let fullContent = ''

        const anthropicStream = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1200,
          system: systemPrompt,
          messages: updatedConversation.map(m => ({ role: m.role, content: m.content })),
          stream: true,
        })

        for await (const event of anthropicStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullContent += event.delta.text
            const data = JSON.stringify({ type: 'delta', content: event.delta.text })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }
        }

        const finalConversation: ConversationMessage[] = [
          ...updatedConversation,
          { role: 'assistant', content: fullContent },
        ]
        await supabase.from('actions').update({ conversation: finalConversation }).eq('id', id)

        const plan = extractPlanFromConversation(finalConversation)
        const doneData = JSON.stringify({
          type: 'done',
          hasPlan: plan !== null,
          stepCount: plan?.length ?? 0,
        })
        controller.enqueue(encoder.encode(`data: ${doneData}\n\n`))
        controller.close()
      } catch (err) {
        const errData = JSON.stringify({
          type: 'error',
          content: err instanceof Error ? err.message : 'Stream error',
        })
        controller.enqueue(encoder.encode(`data: ${errData}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/actions/[id]/chat/route.ts
git commit -m "feat: chat route loads all agents + skills for prompt injection"
```

---

## Task 5: Update Accept-Plan Route

Derives `executor_type` from the chosen skill's `executor_type` column instead of reading it from Claude's output.

**Files:**
- Modify: `src/app/api/actions/[id]/accept-plan/route.ts`

- [ ] **Step 1: Replace accept-plan route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { extractPlanFromConversation } from '@/lib/agent/plan-parser'
import type { Skill } from '@/types'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServerClient()

  const { data: action } = await supabase.from('actions').select('*').eq('id', id).single()
  if (!action) return NextResponse.json({ error: 'Action not found' }, { status: 404 })

  const plan = extractPlanFromConversation(action.conversation || [])
  if (!plan || plan.length === 0) {
    return NextResponse.json({ error: 'No plan found in last assistant message' }, { status: 422 })
  }

  // Fetch all skills to derive executor_type from skill_slug
  const { data: skills } = await supabase.from('skills').select('*')
  const skillsMap = new Map<string, Skill>((skills ?? []).map((s: Skill) => [s.slug, s]))

  const stepsToInsert = plan.map((step, i) => {
    const skill = skillsMap.get(step.skill_slug)
    const executor_type = skill?.executor_type ?? 'draft'
    return {
      action_id: id,
      position: i + 1,
      title: step.title,
      description: step.description,
      skill_slug: step.skill_slug,
      agent_slug: step.agent_slug,
      executor_type,   // derived from skill, never from Claude output
      status: 'pending',
    }
  })

  // Delete any existing steps first — guards against duplicate inserts on retry
  await supabase.from('action_steps').delete().eq('action_id', id)

  const { data: steps, error: stepsError } = await supabase
    .from('action_steps')
    .insert(stepsToInsert)
    .select()

  if (stepsError) return NextResponse.json({ error: stepsError.message }, { status: 500 })

  await supabase.from('actions').update({ status: 'running' }).eq('id', id)
  await supabase.from('tasks').update({ status: 'running' }).eq('id', action.task_id)

  return NextResponse.json({ steps })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/actions/[id]/accept-plan/route.ts
git commit -m "feat: accept-plan derives executor_type from skill lookup, stores skill_slug/agent_slug"
```

---

## Task 6: Add executor_type to Skills UI + API

Add the `executor_type` selector to the skill form and ensure it's saved via the API.

**Files:**
- Modify: `src/components/skills/SkillForm.tsx`
- Modify: `src/app/api/skills/[slug]/route.ts`

- [ ] **Step 1: Update SkillForm.tsx**

In `src/components/skills/SkillForm.tsx`, make the following changes:

1. Import `EXECUTOR_TYPES` at the top:
```typescript
import type { Skill, ConversationMessage, ExecutorType } from '@/types'
import { EXECUTOR_TYPES } from '@/types'
```

2. Add `executorType` state after the `sections` state:
```typescript
const [executorType, setExecutorType] = useState<ExecutorType>(
  skill?.executor_type ?? 'draft'
)
```

3. Add the dropdown UI after the Name input (before the chat thread section):
```typescript
{/* Executor type */}
<div>
  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
    Executor Type
  </label>
  <select
    value={executorType}
    onChange={e => setExecutorType(e.target.value as ExecutorType)}
    className="w-full bg-[#161920] border border-[#1e2130] rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-400/50"
  >
    {EXECUTOR_TYPES.map(t => (
      <option key={t} value={t}>{t}</option>
    ))}
  </select>
  <p className="text-[10px] text-slate-600 mt-1">
    Determines which executor runs this skill's steps.
  </p>
</div>
```

4. Update the `save()` function body to include `executor_type`:
```typescript
const body = { name: name.trim(), ...sections, executor_type: executorType }
```

- [ ] **Step 2: Update POST route to include executor_type**

In `src/app/api/skills/route.ts`, replace the POST handler. The body passthrough already works, but be explicit that `executor_type` is accepted:

```typescript
export async function POST(req: NextRequest) {
  const body = await req.json()
  // executor_type comes from the form; DB default is 'draft' if missing
  const supabase = createServerClient()
  const { data, error } = await supabase.from('skills').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

The existing POST already passes the full body through, so this is a no-op code change — but confirm that the SkillForm `save()` body includes `executor_type` before the insert reaches the DB.

- [ ] **Step 3: Update PATCH route to include executor_type**

In `src/app/api/skills/[slug]/route.ts`, update the destructuring and update call:

```typescript
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { name, slug: newSlug, trigger, instructions, output_format, example_output, executor_type } = await req.json()
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('skills')
    .update({ name, slug: newSlug, trigger, instructions, output_format, example_output, executor_type, updated_at: new Date().toISOString() })
    .eq('slug', slug)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/skills/SkillForm.tsx src/app/api/skills/route.ts src/app/api/skills/[slug]/route.ts
git commit -m "feat: add executor_type selector to SkillForm; persist via POST and PATCH routes"
```

---

## Task 7: Build StepRow Component

New step row for the TaskPanel. Shows position, title, skill badge, agent badge, and status. Replaces `src/components/execution/StepRow.tsx`.

**Files:**
- Create: `src/components/tasks/StepRow.tsx`

- [ ] **Step 1: Create StepRow.tsx**

```typescript
import type { ActionStep } from '@/types'

interface StepRowProps {
  step: ActionStep
  isActive: boolean
  isSelected: boolean
  onClick: () => void
}

export function StepRow({ step, isActive, isSelected, onClick }: StepRowProps) {
  const statusIcon = {
    done: <span className="text-green-400">✓</span>,
    error: <span className="text-red-400">✗</span>,
    running: (
      <span className="flex gap-0.5">
        <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce [animation-delay:0ms]" />
        <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce [animation-delay:150ms]" />
        <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce [animation-delay:300ms]" />
      </span>
    ),
    pending: <span className="text-slate-600">{step.position}</span>,
  }[step.status]

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg border transition ${
        isSelected
          ? 'border-cyan-700 bg-cyan-500/10'
          : isActive
          ? 'border-cyan-900 bg-[#0a1520]'
          : 'border-[#1e2130] hover:border-slate-700'
      }`}
    >
      {/* Position / status icon */}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
        step.status === 'done' ? 'bg-green-900' :
        step.status === 'running' ? 'bg-cyan-900' :
        step.status === 'error' ? 'bg-red-900' :
        'bg-slate-800'
      }`}>
        {statusIcon}
      </div>

      {/* Title */}
      <span className={`flex-1 text-sm font-medium truncate ${
        step.status === 'done' ? 'text-slate-500' : 'text-slate-200'
      }`}>
        {step.title}
      </span>

      {/* Skill badge */}
      {step.skill_slug && (
        <span className="text-[10px] font-semibold bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full flex-shrink-0">
          {step.skill_slug}
        </span>
      )}

      {/* Agent badge */}
      {step.agent_slug && (
        <span className="text-[10px] font-semibold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full flex-shrink-0">
          {step.agent_slug}
        </span>
      )}
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tasks/StepRow.tsx
git commit -m "feat: add StepRow component with skill/agent badges"
```

---

## Task 8: Build StepDetailPanel Component

Fixed-position left sidebar that shows a selected step's description, live execution logs, and output.

**Files:**
- Create: `src/components/tasks/StepDetailPanel.tsx`

- [ ] **Step 1: Create StepDetailPanel.tsx**

```typescript
'use client'
import { useEffect } from 'react'
import type { ActionStep } from '@/types'

interface StepDetailPanelProps {
  step: ActionStep
  logLines: string[]
  onClose: () => void
}

export function StepDetailPanel({ step, logLines, onClose }: StepDetailPanelProps) {
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // NOTE on positioning: StepDetailPanel uses `absolute left-0 top-0 h-full` inside the
  // task detail container (which must have `position: relative overflow-visible`).
  // Do NOT use `fixed left-0` — that would cover the TaskList sidebar on the left.

  const statusLabel = {
    pending: <span className="text-slate-500 text-xs font-semibold">Pending</span>,
    running: <span className="text-cyan-400 text-xs font-semibold animate-pulse">Running…</span>,
    done: <span className="text-green-400 text-xs font-semibold">Done</span>,
    error: <span className="text-red-400 text-xs font-semibold">Error</span>,
  }[step.status]

  return (
    <div className="absolute left-0 top-0 h-full w-[392px] bg-[#0f1117] border-r border-[#1e2130] z-30 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#1e2130] flex items-start justify-between gap-3 flex-shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-slate-500">Step {step.position}</span>
            {statusLabel}
          </div>
          <h3 className="text-sm font-bold text-slate-100 leading-snug">{step.title}</h3>
          {step.skill_slug && (
            <span className="inline-block mt-1 text-[10px] font-semibold bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full">
              {step.skill_slug}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-slate-600 hover:text-slate-300 transition text-sm mt-0.5"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Description */}
        {step.description && (
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</p>
            <p className="text-sm text-slate-400 leading-relaxed">{step.description}</p>
          </div>
        )}

        {/* Live log */}
        {(step.status === 'running' || logLines.length > 0) && (
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Execution Log</p>
            <div className="bg-[#0a0d14] border border-[#1e2130] rounded-lg p-3 font-mono text-xs text-cyan-400 space-y-0.5 max-h-48 overflow-y-auto">
              {logLines.length === 0
                ? <span className="text-slate-600 animate-pulse">Starting…</span>
                : logLines.map((line, i) => <div key={i}>{line}</div>)
              }
            </div>
          </div>
        )}

        {/* Output */}
        {step.status === 'done' && step.output && (
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Output</p>
            <div className="bg-[#161920] border border-[#1e2130] rounded-lg p-4 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
              {step.output}
            </div>
          </div>
        )}

        {/* Error */}
        {step.status === 'error' && step.error && (
          <div>
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1.5">Error</p>
            <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-3 text-sm text-red-300">
              {step.error}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tasks/StepDetailPanel.tsx
git commit -m "feat: add StepDetailPanel slide-in sidebar for step logs and output"
```

---

## Task 9: Build TaskChat Component

Brainstorm chat component with streaming, thinking indicator, and plan-ready accept bar. Ported from `BrainstormPanel` as a focused sub-component (no outer container — `TaskPanel` provides that).

**Files:**
- Create: `src/components/tasks/TaskChat.tsx`

- [ ] **Step 1: Create TaskChat.tsx**

```typescript
'use client'
import { useState, useRef, useEffect } from 'react'
import type { Action, Task, ConversationMessage } from '@/types'
import { ChatInput } from '@/components/shared/ChatInput'

interface TaskChatProps {
  action: Action
  task: Task
  onPlanAccepted: () => void
}

export function TaskChat({ action, task, onPlanAccepted }: TaskChatProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>(action.conversation || [])
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamError, setStreamError] = useState<string | null>(null)
  const [hasPlan, setHasPlan] = useState(false)
  const [stepCount, setStepCount] = useState(0)
  const [accepting, setAccepting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const autoSentRef = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  useEffect(() => {
    if (autoSentRef.current) return
    if ((action.conversation || []).length === 0 && task.title) {
      autoSentRef.current = true
      sendMessage(task.title)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function sendMessage(text: string) {
    const userMsg: ConversationMessage = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setStreaming(true)
    setStreamingContent('')
    setStreamError(null)
    // Do NOT reset hasPlan here — the done event will update it correctly after
    // the new response finishes. Resetting it would hide the accept bar if Claude
    // sends a follow-up clarification after already proposing a plan.

    let assistantContent = ''

    try {
      const res = await fetch(`/api/actions/${action.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'delta') {
              assistantContent += data.content
              setStreamingContent(assistantContent)
            }
            if (data.type === 'done') {
              setHasPlan(data.hasPlan)
              setStepCount(data.stepCount)
            }
            if (data.type === 'error') setStreamError(data.content)
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      console.error('Chat error:', err)
    } finally {
      if (assistantContent) {
        setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }])
      }
      setStreamingContent('')
      setStreaming(false)
    }
  }

  async function acceptPlan() {
    setAccepting(true)
    try {
      const res = await fetch(`/api/actions/${action.id}/accept-plan`, { method: 'POST' })
      if (res.ok) onPlanAccepted()
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-slate-600 text-sm text-center py-8">Starting conversation…</div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'flex justify-end' : ''}>
            <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
              msg.role === 'user'
                ? 'bg-cyan-500/20 text-cyan-100 rounded-br-none'
                : 'bg-[#161920] text-slate-300 rounded-bl-none border border-[#1e2130]'
            }`}>
              <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
            </div>
          </div>
        ))}

        {streaming && !streamingContent && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:300ms]" />
            </span>
            Agent is thinking…
          </div>
        )}
        {streamError && <div className="text-xs text-red-400 px-2 py-1">{streamError}</div>}
        {streamingContent && (
          <div>
            <div className="max-w-[85%] rounded-xl px-4 py-3 text-sm bg-[#161920] text-slate-300 rounded-bl-none border border-[#1e2130]">
              <pre className="whitespace-pre-wrap font-sans">{streamingContent}</pre>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Plan accept bar */}
      {hasPlan && !streaming && (
        <div className="px-6 py-3 border-t border-[#1e2130] bg-[#0a1a10] flex items-center justify-between flex-shrink-0">
          <span className="text-sm text-green-400 font-medium">
            Plan ready — {stepCount} step{stepCount !== 1 ? 's' : ''}
          </span>
          <button
            onClick={acceptPlan}
            disabled={accepting}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold text-sm px-5 py-2 rounded-lg transition"
          >
            {accepting ? 'Accepting…' : `Accept & run (${stepCount} steps)`}
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-4 border-t border-[#1e2130] flex-shrink-0">
        <ChatInput
          onSubmit={sendMessage}
          placeholder="Add context or ask a question…"
          disabled={streaming}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tasks/TaskChat.tsx
git commit -m "feat: add TaskChat component (port of BrainstormPanel)"
```

---

## Task 10: Build CompletionReport Component

Post-execution report with step summary and total cost. Ported from `ReportPanel`.

**Files:**
- Create: `src/components/tasks/CompletionReport.tsx`

- [ ] **Step 1: Create CompletionReport.tsx**

```typescript
'use client'
import { useEffect, useState } from 'react'
import type { Action, ActionStep, Task } from '@/types'

interface ApiUsageEvent {
  id: string
  step_id: string
  model: string
  input_tokens: number
  output_tokens: number
  cost_usd: number
}

interface CompletionReportProps {
  action: Action
  task: Task
  onClose: () => void
}

export function CompletionReport({ action, task, onClose }: CompletionReportProps) {
  const [steps, setSteps] = useState<ActionStep[]>([])
  const [usage, setUsage] = useState<ApiUsageEvent[]>([])

  useEffect(() => {
    fetch(`/api/actions/${action.id}/steps`).then(r => r.json()).then(setSteps)
    fetch(`/api/actions/${action.id}/usage`).then(r => r.ok ? r.json() : []).then(setUsage)
  }, [action.id])

  const originalRequest = action.conversation?.[0]?.content || '—'
  const totalCost = usage.reduce((sum, e) => sum + (e.cost_usd || 0), 0)

  function download() {
    const lines = [
      `# Task Report: ${task.title}`,
      '',
      '## Original Request',
      originalRequest,
      '',
      '## Steps',
      ...steps.map(s =>
        `### ${s.position}. ${s.title}${s.skill_slug ? ` [${s.skill_slug}]` : ''}\n${s.output ? s.output.slice(0, 500) : 'No output'}`
      ),
      '',
      '## Cost',
      `Total: $${totalCost.toFixed(4)} USD`,
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${task.title.slice(0, 40).replace(/\s+/g, '-')}-report.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0f1117] border border-[#1e2130] rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1e2130] flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-bold text-slate-200">Completion Report</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={download}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 border border-cyan-900 px-3 py-1.5 rounded-lg transition"
            >
              ↓ Download
            </button>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Original request */}
          <div className="border border-[#1e2130] rounded-lg overflow-hidden">
            <div className="bg-[#161920] px-4 py-2.5 border-b border-[#1e2130]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Original Request</span>
            </div>
            <div className="px-4 py-3 text-sm text-slate-300">{originalRequest}</div>
          </div>

          {/* Steps */}
          <div className="border border-[#1e2130] rounded-lg overflow-hidden">
            <div className="bg-[#161920] px-4 py-2.5 border-b border-[#1e2130]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Steps</span>
            </div>
            <div className="divide-y divide-[#1e2130]">
              {steps.map(step => (
                <div key={step.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-bold text-slate-300">{step.position}. {step.title}</span>
                    {step.skill_slug && (
                      <span className="text-[10px] bg-indigo-900/40 text-indigo-300 px-2 py-0.5 rounded-full">{step.skill_slug}</span>
                    )}
                  </div>
                  {step.output && (
                    <p className="text-xs text-slate-500 line-clamp-2">{step.output}</p>
                  )}
                </div>
              ))}
              {steps.length === 0 && (
                <div className="px-4 py-3 text-xs text-slate-600">No steps recorded</div>
              )}
            </div>
          </div>

          {/* Cost */}
          <div className="border border-[#1e2130] rounded-lg overflow-hidden">
            <div className="bg-[#161920] px-4 py-2.5 border-b border-[#1e2130]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Cost</span>
            </div>
            <div className="px-4 py-3">
              <span className="text-2xl font-bold text-cyan-400">${totalCost.toFixed(4)}</span>
              <span className="text-xs text-slate-500 ml-2">USD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tasks/CompletionReport.tsx
git commit -m "feat: add CompletionReport dialog component"
```

---

## Task 11: Build TaskPanel (Unified Container)

The unified panel that replaces `TaskDetail` + all three separate panels. Manages the state machine: brainstorming → ready → running → done.

**Files:**
- Create: `src/components/tasks/TaskPanel.tsx`

- [ ] **Step 1: Create TaskPanel.tsx**

```typescript
'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Action, ActionStep, Task } from '@/types'
import { TaskChat } from './TaskChat'
import { StepRow } from './StepRow'
import { StepDetailPanel } from './StepDetailPanel'
import { CompletionReport } from './CompletionReport'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

interface TaskPanelProps {
  task: Task
  onTaskUpdate: (updated: Task) => void
  onTaskDelete: (id: string) => void
}

export function TaskPanel({ task, onTaskUpdate, onTaskDelete }: TaskPanelProps) {
  const [action, setAction] = useState<Action | null>(null)
  const [steps, setSteps] = useState<ActionStep[]>([])
  const [logLines, setLogLines] = useState<Record<string, string[]>>({})
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loading, setLoading] = useState(true)
  const onTaskUpdateRef = useRef(onTaskUpdate)
  useEffect(() => { onTaskUpdateRef.current = onTaskUpdate }, [onTaskUpdate])

  const addLogLine = useCallback((stepId: string, line: string) => {
    setLogLines(prev => ({ ...prev, [stepId]: [...(prev[stepId] || []), line] }))
  }, [])

  // Load or create action on mount
  useEffect(() => {
    setLoading(true)
    setAction(null)
    setSteps([])
    setLogLines({})
    setSelectedStepId(null)

    fetch(`/api/actions?task_id=${task.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(async (existing) => {
        if (existing && !existing.error) {
          setAction(existing)
          if (existing.status !== 'brainstorming') {
            const stepsRes = await fetch(`/api/actions/${existing.id}/steps`)
            if (stepsRes.ok) setSteps(await stepsRes.json())
          }
        } else if (task.status === 'draft') {
          const res = await fetch('/api/actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: task.id }),
          })
          if (res.ok) {
            const newAction = await res.json()
            setAction(newAction)
            onTaskUpdateRef.current({ ...task, status: 'brainstorming' })
          }
        }
      })
      .finally(() => setLoading(false))
  }, [task.id])

  // Run execution chain. Takes explicit actionId to avoid unsafe closure over `action` state
  // in async SSE callbacks — action state reference could be stale by the time events fire.
  async function runChain(actionId: string, stepsToRun: ActionStep[]) {
    setRunning(true)
    let taskCompleted = false
    try {
      for (const step of stepsToRun) {
        if (step.status !== 'pending') continue

        await new Promise<void>((resolve, reject) => {
          const sse = new EventSource(`/api/actions/${actionId}/steps/${step.id}/events`)
          sse.onmessage = (e) => {
            const event = JSON.parse(e.data)
            if (event.type === 'log') addLogLine(step.id, event.content)
            if (event.type === 'done') {
              sse.close()
              setSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'done', output: event.output ?? s.output } : s))
              resolve()
            }
            if (event.type === 'error') {
              sse.close()
              setSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'error', error: event.content } : s))
              reject(new Error(event.content))
            }
          }
          sse.onerror = () => { sse.close(); reject(new Error('SSE connection failed')) }
          fetch(`/api/actions/${actionId}/execute`, { method: 'POST' }).catch(reject)
        })
      }
      taskCompleted = true
    } catch {
      // step failed — partial run
    } finally {
      setRunning(false)
      if (taskCompleted) {
        onTaskUpdateRef.current({ ...task, status: 'done' })
        setShowReport(true)
      }
    }
  }

  function handlePlanAccepted() {
    onTaskUpdate({ ...task, status: 'running' })
    // Reload steps after plan accepted, then auto-run the chain immediately.
    // The Execute button in the footer is retained for manual resume (e.g. after pause)
    // but is NOT shown for a fresh plan acceptance — runChain fires automatically here.
    const actionId = action!.id
    fetch(`/api/actions/${actionId}/steps`)
      .then(r => r.ok ? r.json() : [])
      .then((fetchedSteps: ActionStep[]) => {
        setSteps(fetchedSteps)
        runChain(actionId, fetchedSteps)
      })
  }

  const selectedStep = steps.find(s => s.id === selectedStepId) ?? null
  const hasPendingStep = steps.some(s => s.status === 'pending')
  const hasRunningStep = steps.some(s => s.status === 'running')
  const isBrainstorming = !action || action.status === 'brainstorming'
  const isReady = action?.status === 'running' && steps.length > 0 && !running && hasPendingStep && !hasRunningStep
  const isDone = task.status === 'done'

  const statusPill = (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
      isDone ? 'bg-green-900/50 text-green-400' :
      running || hasRunningStep ? 'bg-cyan-900/50 text-cyan-400' :
      isBrainstorming ? 'bg-yellow-900/40 text-yellow-400' :
      'bg-slate-800 text-slate-400'
    }`}>
      {isDone ? 'Done' : running || hasRunningStep ? 'Running' : isBrainstorming ? 'Brainstorming' : 'Ready'}
    </span>
  )

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-600 text-sm">Loading…</div>
  }

  return (
    <>
      {/* Step detail sidebar */}
      {selectedStep && (
        <StepDetailPanel
          step={selectedStep}
          logLines={logLines[selectedStep.id] || []}
          onClose={() => setSelectedStepId(null)}
        />
      )}

      {/* Completion report modal */}
      {showReport && action && (
        <CompletionReport
          action={action}
          task={task}
          onClose={() => setShowReport(false)}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete task"
        message="This task and all its progress will be permanently deleted."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
          onTaskDelete(task.id)
        }}
      />

      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1e2130] flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <h2 className="text-base font-bold text-slate-100 leading-snug truncate">{task.title}</h2>
              {statusPill}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {isDone && (
                <button
                  onClick={() => setShowReport(true)}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 border border-cyan-900 px-3 py-1.5 rounded-lg transition"
                >
                  Report
                </button>
              )}
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-slate-600 hover:text-red-400 transition text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Steps list (hidden during brainstorming) */}
        {steps.length > 0 && (
          <div className="px-6 py-3 border-b border-[#1e2130] space-y-1.5 flex-shrink-0">
            {steps.map(step => (
              <StepRow
                key={step.id}
                step={step}
                isActive={step.status === 'running'}
                isSelected={step.id === selectedStepId}
                onClick={() => setSelectedStepId(prev => prev === step.id ? null : step.id)}
              />
            ))}
          </div>
        )}

        {/* Chat — shown during brainstorming; collapsed otherwise */}
        {isBrainstorming && action && (
          <div className="flex-1 overflow-hidden">
            <TaskChat
              action={action}
              task={task}
              onPlanAccepted={handlePlanAccepted}
            />
          </div>
        )}

        {/* Footer — execute / pause / done */}
        {!isBrainstorming && (
          <div className="px-6 py-4 border-t border-[#1e2130] flex-shrink-0">
            {/* Execute: shown when action is in 'running' status but execution has paused
                (e.g. after a Pause, or if a step errored and the user wants to resume).
                Not shown after fresh plan acceptance — runChain fires automatically then. */}
            {isReady && (
              <button
                onClick={() => runChain(action!.id, steps)}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-sm py-2.5 rounded-lg transition"
              >
                Resume execution
              </button>
            )}
            {running && (
              <button
                onClick={async () => {
                  await fetch(`/api/actions/${action!.id}/pause`, { method: 'POST' })
                  setRunning(false)
                }}
                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-sm py-2.5 rounded-lg transition"
              >
                Pause
              </button>
            )}
            {isDone && !running && (
              <p className="text-center text-sm text-slate-500">All steps complete.</p>
            )}
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tasks/TaskPanel.tsx
git commit -m "feat: add unified TaskPanel component"
```

---

## Task 12: Wire TaskPanel into Tasks Page + Delete Old Components

Replace `TaskDetail` with `TaskPanel` in the page. Delete the four old components that are now replaced.

**Files:**
- Modify: `src/app/dashboard/tasks/page.tsx`
- Delete: `src/components/tasks/TaskDetail.tsx`
- Delete: `src/components/execution/BrainstormPanel.tsx`
- Delete: `src/components/execution/ExecutionPanel.tsx`
- Delete: `src/components/execution/ReportPanel.tsx`
- Delete: `src/components/execution/StepRow.tsx`

- [ ] **Step 1: Update tasks/page.tsx**

Replace the import and usage of `TaskDetail` with `TaskPanel`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { TaskList } from '@/components/tasks/TaskList'
import { TaskPanel } from '@/components/tasks/TaskPanel'
import type { Task } from '@/types'

function FirstTaskPrompt({ onCreated }: { onCreated: (task: Task) => void }) {
  const [company, setCompany] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const taskTitle = company.trim()
    ? `Help me prepare for a marketing interview at ${company.trim()}`
    : 'Help me prepare for a marketing interview at …'

  async function create() {
    if (!company.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: taskTitle }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create task')
      onCreated(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
      setCreating(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-full px-8">
      <div className="w-full max-w-sm">
        <p className="text-slate-200 font-semibold text-base mb-1">Create your first task</p>
        <p className="text-slate-500 text-sm mb-6">Which company are you interviewing at?</p>
        <input
          type="text"
          value={company}
          onChange={e => setCompany(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && company.trim() && create()}
          placeholder="e.g. Google, Oatly, Stripe…"
          autoFocus
          className="w-full bg-[#161920] border border-[#1e2130] rounded-lg px-4 py-2.5 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-400/50 mb-3"
        />
        <div className="bg-[#161920] border border-[#1e2130] rounded-lg px-4 py-3 mb-4">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Task preview</p>
          <p className={`text-sm ${company.trim() ? 'text-slate-200' : 'text-slate-600 italic'}`}>{taskTitle}</p>
        </div>
        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
        <button
          onClick={create}
          disabled={!company.trim() || creating}
          className="w-full bg-cyan-400 text-[#0f172a] font-bold text-sm py-2.5 rounded-lg disabled:opacity-30"
        >
          {creating ? 'Creating…' : 'Create task →'}
        </button>
      </div>
    </div>
  )
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setTasks(d) })
      .finally(() => setLoading(false))
  }, [])

  const selected = tasks.find(t => t.id === selectedId) || null

  async function createTask() {
    const title = prompt('Task title')
    if (!title) return
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    const task = await res.json()
    setTasks(prev => [task, ...prev])
    setSelectedId(task.id)
  }

  function handleFirstTask(task: Task) {
    setTasks([task])
    setSelectedId(task.id)
  }

  return (
    <div className="flex gap-0 h-[calc(100vh-80px)] border border-[#1e2130] rounded-xl overflow-hidden">
      <TaskList
        tasks={tasks}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onCreate={createTask}
      />
      {/* relative + overflow-visible allows StepDetailPanel to use absolute positioning
          and slide in from the left of this container without covering the TaskList */}
      <div className="flex-1 border-l border-[#1e2130] overflow-hidden relative">
        {selected
          ? <TaskPanel
              key={selected.id}
              task={selected}
              onTaskUpdate={(updated) => setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))}
              onTaskDelete={(id) => { setTasks(prev => prev.filter(t => t.id !== id)); setSelectedId(null) }}
            />
          : !loading && tasks.length === 0
            ? <FirstTaskPrompt onCreated={handleFirstTask} />
            : <div className="flex items-center justify-center h-full text-slate-600 text-sm">Select a task to get started</div>
        }
      </div>
    </div>
  )
}
```

Note: `key={selected.id}` on TaskPanel ensures the component fully re-mounts when switching tasks, preventing stale state.

- [ ] **Step 2: Delete replaced files**

```bash
rm src/components/tasks/TaskDetail.tsx
rm src/components/execution/BrainstormPanel.tsx
rm src/components/execution/ExecutionPanel.tsx
rm src/components/execution/ReportPanel.tsx
rm src/components/execution/StepRow.tsx
```

- [ ] **Step 3: Run the app and verify**

```bash
npm run dev
```

Open `http://localhost:3000/dashboard/tasks`. Verify:
1. Selecting a task shows the TaskPanel (header + status pill)
2. New draft tasks auto-start brainstorm chat with the task title sent automatically
3. After plan is accepted, steps list appears with skill/agent badges
4. Clicking a step opens StepDetailPanel on the left
5. Execution runs steps and shows live logs in StepDetailPanel
6. After completion, Report button appears and opens CompletionReport dialog

- [ ] **Step 4: Run tests one final time**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/tasks/page.tsx
git commit -m "feat: wire TaskPanel into tasks page; remove TaskDetail and old execution panels"
```

---

## Summary of Changes

| Category | Before | After |
|---|---|---|
| Skills table | No executor_type | `executor_type TEXT NOT NULL DEFAULT 'draft'` |
| Plan format | Claude picks `executor_type` from hardcoded list | Claude picks `skill_slug` + `agent_slug`; code derives `executor_type` |
| System prompt | Lists executor types for Claude to choose | Injects all DB agents + skills; Claude picks by slug |
| Tasks UI | 3 separate panels (Brainstorm / Execution / Report) with tab navigation | Single unified `TaskPanel` with inline state machine |
| Step visibility | Separate Execution tab | Steps visible in panel as soon as plan is accepted |
| Step detail | Log lines inline in step row | Dedicated `StepDetailPanel` slide-in sidebar |
| Report | Separate Report tab | `CompletionReport` dialog triggered from header button |
