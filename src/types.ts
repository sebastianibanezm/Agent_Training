export type TaskStatus = 'draft' | 'brainstorming' | 'planning' | 'running' | 'done'
export type ActionStatus = 'brainstorming' | 'ready' | 'running' | 'done' | 'paused'
export type StepStatus = 'pending' | 'running' | 'done' | 'error'
export type ExecutorType = 'research' | 'document' | 'draft' | 'analyzer' | 'email' | 'comparison' | 'coach' | 'flashcard'

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
  created_at: string
  updated_at: string
}

export interface PlanStep {
  title: string
  description: string
  executor_type: ExecutorType
}
