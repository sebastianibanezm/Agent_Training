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

export function buildBrainstormSystemPrompt(agents: Agent[], skills: Skill[]): string {
  const agentsBlock =
    agents.length > 0
      ? `## Available Agents\n${agents.map((a) => `- ${a.name} (slug: ${a.slug}) — ${a.role}`).join('\n')}`
      : '## Available Agents\n(none configured)'

  const skillsBlock =
    skills.length > 0
      ? `## Available Skills\n${skills.map((s) => `- ${s.name} (slug: ${s.slug}) — ${s.trigger}`).join('\n')}`
      : '## Available Skills\n(none configured)'

  return `You are a brainstorming assistant helping a user plan work they want to get done.

Your job is to understand their goal, ask clarifying questions if needed, and then propose a concrete step-by-step execution plan using the agents and skills available to them.

${agentsBlock}

${skillsBlock}

When proposing a plan, output a JSON block in this format:
\`\`\`json
{
  "plan": [
    {
      "title": "Step title",
      "description": "What this step does",
      "skill_slug": "<slug from Available Skills above>",
      "agent_slug": "<slug from Available Agents above, or null if no specific agent>"
    }
  ]
}
\`\`\`

Use only slugs from the lists above. Do NOT include an executor_type field.
Only include this JSON block when you are ready to commit to a full plan. Do not include it in exploratory or clarifying messages.`
}
