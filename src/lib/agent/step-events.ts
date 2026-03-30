import { EventEmitter } from 'events'

const emitter = new EventEmitter()
emitter.setMaxListeners(100)

export const emitStepLog = (stepId: string, content: string) =>
  emitter.emit(`step:${stepId}:log`, content)

export const emitStepDone = (stepId: string) =>
  emitter.emit(`step:${stepId}:done`)

export const emitStepError = (stepId: string, content: string) =>
  emitter.emit(`step:${stepId}:error`, content)

interface StepHandlers {
  onLog: (content: string) => void
  onDone: () => void
  onError: (content: string) => void
}

export function subscribeToStep(stepId: string, handlers: StepHandlers) {
  emitter.on(`step:${stepId}:log`, handlers.onLog)
  emitter.once(`step:${stepId}:done`, handlers.onDone)
  emitter.once(`step:${stepId}:error`, handlers.onError)
}

export function unsubscribeFromStep(stepId: string) {
  emitter.removeAllListeners(`step:${stepId}:log`)
  emitter.removeAllListeners(`step:${stepId}:done`)
  emitter.removeAllListeners(`step:${stepId}:error`)
}
