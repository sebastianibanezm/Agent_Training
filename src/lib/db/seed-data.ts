import type { ConversationMessage } from '@/types'

// Fixed UUIDs — never change these; they ensure idempotent seeding (ON CONFLICT DO NOTHING)
export const SEED = {
  agents: {
    researcher: {
      id: '11111111-1111-1111-1111-111111111111',
      slug: 'the-researcher',
      name: 'The Researcher',
      role: 'Strategic research analyst for marketing roles in tech companies',
      goals: 'Deliver interview-ready briefings; prioritise recent information; tie findings to what a marketing candidate needs',
      constraints: 'No fabricated statistics; responses under 600 words unless asked; no legal/financial advice',
      skill_slugs: ['competitive-research', 'company-intelligence'],
    },
    coach: {
      id: '22222222-2222-2222-2222-222222222222',
      slug: 'interview-coach',
      name: 'Interview Coach',
      role: 'Interview preparation specialist for tech marketing roles',
      goals: 'Generate likely interview questions; draft credible talking points; surface non-obvious preparation angles',
      constraints: 'Ground advice in the specific company and role; no generic interview tips; flag knowledge gaps honestly',
      skill_slugs: ['interview-prep', 'personal-brand'],
    },
  },
  skills: {
    competitiveResearch: {
      id: 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      slug: 'competitive-research',
      name: 'Competitive Research',
      trigger: 'When a user wants to map the competitive landscape for a target company',
      instructions: '1. Identify the target company and its primary market segment\n2. Find 3–5 direct competitors\n3. For each competitor: summarize positioning, key differentiators, and recent moves\n4. Note the target company\'s competitive advantages and gaps\n5. Summarize in a structured briefing',
      output_format: 'Structured markdown with sections: Target Company, Competitor Matrix (table), Key Takeaways',
      example_output: '## Stripe Competitive Overview\n\n**Direct competitors:** Square, Adyen, Braintree\n\n| Competitor | Focus | Differentiator |\n|---|---|---|\n| Square | SMB | Hardware + POS |',
    },
    companyIntelligence: {
      id: 'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      slug: 'company-intelligence',
      name: 'Company Intelligence',
      trigger: 'When a user needs a deep-dive on a single company before an interview',
      instructions: '1. Research the company\'s mission, products, and business model\n2. Find recent news (funding, launches, layoffs, leadership changes)\n3. Identify company culture signals (Glassdoor, LinkedIn, blog posts)\n4. Surface the "so what" for a marketing candidate',
      output_format: 'Markdown briefing: Company Overview, Recent News, Culture Signals, Marketing Candidate Angle',
      example_output: '## Notion Company Intelligence\n\n**Mission:** Make toolmaking universal...',
    },
    interviewPrep: {
      id: 'cccc3333-cccc-cccc-cccc-cccccccccccc',
      slug: 'interview-prep',
      name: 'Interview Prep',
      trigger: 'When a user wants to prepare for a specific job interview',
      instructions: '1. Review the job description for key themes\n2. Generate 8–10 likely interview questions\n3. For each question: draft a credible talking point tailored to the user\n4. Flag any knowledge gaps to address before the interview',
      output_format: 'Q&A list: numbered questions with bullet-point talking points',
      example_output: '1. **How would you approach launching a new product to an enterprise market?**\n   - Lead with: segmentation before messaging',
    },
    personalBrand: {
      id: 'dddd4444-dddd-dddd-dddd-dddddddddddd',
      slug: 'personal-brand',
      name: 'Personal Brand',
      trigger: 'When a user wants to craft their professional narrative or LinkedIn presence',
      instructions: '1. Gather: current role, target role, key achievements, what makes them distinctive\n2. Draft a LinkedIn summary (3 paragraphs)\n3. Draft an elevator pitch (30 seconds, ~80 words)\n4. Suggest 3 content angles for LinkedIn posts',
      output_format: 'Three sections: LinkedIn Summary, Elevator Pitch, Content Angles',
      example_output: '**LinkedIn Summary**\nI help B2B SaaS companies turn complex products into...',
    },
  },
  tasks: {
    task1: {
      id: 'task1111-1111-1111-1111-111111111111',
      title: 'Research Stripe for my PMM interview',
      status: 'done',
      agent_slug: 'the-researcher',
    },
    task2: {
      id: 'task2222-2222-2222-2222-222222222222',
      title: 'Prep talking points for Adyen CMO role',
      status: 'running',
      agent_slug: 'interview-coach',
    },
    task3: {
      id: 'task3333-3333-3333-3333-333333333333',
      title: 'Draft my LinkedIn headline',
      status: 'draft',
      agent_slug: null,
    },
  },
  actions: {
    action1: {
      id: 'act11111-1111-1111-1111-111111111111',
      task_id: 'task1111-1111-1111-1111-111111111111',
      status: 'done',
      conversation: [
        { role: 'user', content: 'Research Stripe for my PMM interview next week' },
        { role: 'assistant', content: 'I\'ll put together a comprehensive Stripe briefing for your PMM interview. Here\'s my plan:\n\n```json\n{"plan":[{"title":"Identify research targets","description":"Confirm Stripe as target, identify key product areas relevant to PMM","executor_type":"research"},{"title":"Gather company intelligence","description":"Deep-dive on Stripe\'s business model, recent news, and market position","executor_type":"research"},{"title":"Map competitive landscape","description":"Analyze Square, Adyen, Braintree — positioning and differentiators","executor_type":"analyzer"},{"title":"Generate interview briefing","description":"Compile everything into a structured PMM interview prep document","executor_type":"document"}]}\n```' },
      ] as ConversationMessage[],
    },
    action2: {
      id: 'act22222-2222-2222-2222-222222222222',
      task_id: 'task2222-2222-2222-2222-222222222222',
      status: 'running',
      conversation: [
        { role: 'user', content: 'Help me prep for a CMO interview at Adyen' },
        { role: 'assistant', content: 'Great choice — Adyen is a fascinating company for a CMO role. Let me build out a focused prep plan.\n\n```json\n{"plan":[{"title":"Research Adyen\'s marketing positioning","description":"Understand how Adyen positions itself vs competitors","executor_type":"research"},{"title":"Identify likely CMO interview themes","description":"Map the key strategic questions a CMO candidate would face","executor_type":"analyzer"},{"title":"Draft talking points","description":"Build credible, specific answers tied to Adyen\'s context","executor_type":"draft"},{"title":"Format final prep sheet","description":"Compile into a printable prep document","executor_type":"document"}]}\n```' },
      ] as ConversationMessage[],
    },
  },
  steps: {
    s1a: { id: 'step1a11-1111-1111-1111-111111111111', action_id: 'act11111-1111-1111-1111-111111111111', position: 1, title: 'Identify research targets', description: 'Confirm Stripe as target, identify key product areas relevant to PMM', executor_type: 'research', status: 'done', output: 'Confirmed: Stripe Inc. Target role: Product Marketing Manager. Key areas: payments infrastructure, developer tools, B2B billing.' },
    s1b: { id: 'step1b11-1111-1111-1111-111111111111', action_id: 'act11111-1111-1111-1111-111111111111', position: 2, title: 'Gather company intelligence', description: 'Deep-dive on Stripe\'s business model, recent news, and market position', executor_type: 'research', status: 'done', output: 'Stripe processes $1T+ annually. Recent focus: B2B SaaS billing, Stripe Tax, Revenue Recognition. IPO anticipated.' },
    s1c: { id: 'step1c11-1111-1111-1111-111111111111', action_id: 'act11111-1111-1111-1111-111111111111', position: 3, title: 'Map competitive landscape', description: 'Analyze Square, Adyen, Braintree — positioning and differentiators', executor_type: 'analyzer', status: 'done', output: 'Competitors: Square (SMB focus), Adyen (enterprise), Braintree (developer-friendly). Stripe leads on DX and ecosystem.' },
    s1d: { id: 'step1d11-1111-1111-1111-111111111111', action_id: 'act11111-1111-1111-1111-111111111111', position: 4, title: 'Generate interview briefing', description: 'Compile everything into a structured PMM interview prep document', executor_type: 'document', status: 'done', output: '## Stripe PMM Briefing\n\nStripe is a developer-first payments infrastructure company processing over $1 trillion annually...' },
    s2a: { id: 'step2a22-2222-2222-2222-222222222222', action_id: 'act22222-2222-2222-2222-222222222222', position: 1, title: 'Research Adyen\'s marketing positioning', description: 'Understand how Adyen positions itself vs competitors', executor_type: 'research', status: 'done', output: 'Adyen positions as enterprise-only, no SMB. Key differentiator: unified commerce platform. Tagline: "The financial technology platform."' },
    s2b: { id: 'step2b22-2222-2222-2222-222222222222', action_id: 'act22222-2222-2222-2222-222222222222', position: 2, title: 'Identify likely CMO interview themes', description: 'Map the key strategic questions a CMO candidate would face', executor_type: 'analyzer', status: 'done', output: 'Themes: global expansion, payments complexity narrative, enterprise sales cycles, Adyen\'s brand vs product awareness gap.' },
    s2c: { id: 'step2c22-2222-2222-2222-222222222222', action_id: 'act22222-2222-2222-2222-222222222222', position: 3, title: 'Draft talking points', description: 'Build credible, specific answers tied to Adyen\'s context', executor_type: 'draft', status: 'pending', output: null },
    s2d: { id: 'step2d22-2222-2222-2222-222222222222', action_id: 'act22222-2222-2222-2222-222222222222', position: 4, title: 'Format final prep sheet', description: 'Compile into a printable prep document', executor_type: 'document', status: 'pending', output: null },
  },
  usageEvents: [
    { id: 'use11111-1111-1111-1111-111111111111', action_id: 'act11111-1111-1111-1111-111111111111', step_id: 'step1a11-1111-1111-1111-111111111111', model: 'claude-sonnet-4-6', input_tokens: 450, output_tokens: 380, cost_usd: 0.007050 },
    { id: 'use11112-1111-1111-1111-111111111112', action_id: 'act11111-1111-1111-1111-111111111111', step_id: 'step1b11-1111-1111-1111-111111111111', model: 'claude-sonnet-4-6', input_tokens: 520, output_tokens: 420, cost_usd: 0.007860 },
    { id: 'use11113-1111-1111-1111-111111111113', action_id: 'act11111-1111-1111-1111-111111111111', step_id: 'step1c11-1111-1111-1111-111111111111', model: 'claude-sonnet-4-6', input_tokens: 380, output_tokens: 350, cost_usd: 0.006390 },
    { id: 'use11114-1111-1111-1111-111111111114', action_id: 'act11111-1111-1111-1111-111111111111', step_id: 'step1d11-1111-1111-1111-111111111111', model: 'claude-sonnet-4-6', input_tokens: 600, output_tokens: 500, cost_usd: 0.009300 },
    { id: 'use22221-2222-2222-2222-222222222221', action_id: 'act22222-2222-2222-2222-222222222222', step_id: 'step2a22-2222-2222-2222-222222222222', model: 'claude-sonnet-4-6', input_tokens: 410, output_tokens: 360, cost_usd: 0.006630 },
    { id: 'use22222-2222-2222-2222-222222222222', action_id: 'act22222-2222-2222-2222-222222222222', step_id: 'step2b22-2222-2222-2222-222222222222', model: 'claude-sonnet-4-6', input_tokens: 490, output_tokens: 400, cost_usd: 0.007470 },
  ],
}
