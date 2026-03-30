# [Your Name]'s Command Center

An AI agent platform I built to manage research and interview preparation workflows.

## What it demonstrates

- **Agent architecture**: configurable AI agents with defined roles, goals, and constraints
- **Skill composition**: reusable skills that shape how agents execute specific types of work
- **Multi-step execution**: agents break tasks into steps, execute them sequentially, and log every action
- **Live observability**: watch agents think in real time through SSE-streamed execution logs
- **Completion reports**: every finished task generates a structured report with timing and cost breakdown

## Demo walkthrough (5 minutes)

1. **Tasks section**: show the completed Stripe PMM research task — open the Report tab
2. **Execution in progress**: show Task 2 (Adyen) — explain the step structure and what each executor does
3. **Run a new task**: go to Agents → The Researcher → "Run agent" → enter a company name
4. **Watch it execute**: narrate the brainstorm → accept plan → live execution logs
5. **Agents & Skills**: show how agents are configured and how skills shape their behaviour

## Stack

Next.js 15, TypeScript, Tailwind CSS, Supabase, Anthropic Claude Sonnet, optional Tavily web search
