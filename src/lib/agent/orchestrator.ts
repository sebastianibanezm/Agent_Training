import type { ActionStep, Agent, Skill, ExecutorType } from '@/types'
import { emitStepLog, emitStepDone, emitStepError } from './step-events'
import { runResearchExecutor } from './executors/research'
import { runDocumentExecutor } from './executors/document'
import { runDraftExecutor } from './executors/draft'
import { runAnalyzerExecutor } from './executors/analyzer'
import { runEmailExecutor } from './executors/email'
import { runComparisonExecutor } from './executors/comparison'
import { runCoachExecutor } from './executors/coach'
import { runFlashcardExecutor } from './executors/flashcard'

export type ExecutorContext = {
  step: ActionStep
  agent: Agent | null
  skills: Skill[]
  actionId: string
  conversation: Array<{ role: 'user' | 'assistant'; content: string }>
}

type ExecutorFn = (ctx: ExecutorContext) => Promise<string>

const EXECUTOR_MAP: Record<ExecutorType, ExecutorFn> = {
  research: runResearchExecutor,
  document: runDocumentExecutor,
  draft: runDraftExecutor,
  analyzer: runAnalyzerExecutor,
  email: runEmailExecutor,
  comparison: runComparisonExecutor,
  coach: runCoachExecutor,
  flashcard: runFlashcardExecutor,
}

export async function runStep(ctx: ExecutorContext): Promise<string> {
  const { step } = ctx
  const executor = EXECUTOR_MAP[step.executor_type] ?? EXECUTOR_MAP['draft']

  emitStepLog(step.id, `Starting: ${step.title}`)
  try {
    const output = await executor(ctx)
    emitStepDone(step.id)
    return output
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    emitStepError(step.id, message)
    throw err
  }
}
