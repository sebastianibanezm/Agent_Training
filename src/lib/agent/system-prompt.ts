import type { Agent, Skill } from '@/types'

export function buildSystemPrompt(agent: Agent, skills: Skill[]): string {
  const skillsBlock =
    skills.length > 0
      ? `\n\n## Your Skills\n${skills
          .map(
            (s) =>
              `### ${s.name}\n**Trigger:** ${s.trigger}\n**Instructions:** ${s.instructions}\n**Output format:** ${s.output_format}`
          )
          .join('\n\n')}`
      : ''

  return `You are ${agent.name}.

## Role
${agent.role}

## Goals
${agent.goals}

## Constraints
${agent.constraints}${skillsBlock}

## Plan Format
When you have gathered enough information and are ready to propose an execution plan, end your message with a JSON block in exactly this format (no other JSON blocks):

\`\`\`json
{
  "plan": [
    { "title": "Step title", "description": "What this step does", "executor_type": "research" }
  ]
}
\`\`\`

Valid executor_type values: research, document, draft, analyzer, email, comparison, coach, flashcard.
Only include this block when you are ready to commit to a plan. Do not include it in exploratory messages.`
}
