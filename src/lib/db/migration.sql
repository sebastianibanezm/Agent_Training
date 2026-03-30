-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  status      text NOT NULL DEFAULT 'draft',
  agent_slug  text,
  deleted_at  timestamptz,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Actions (one per task)
CREATE TABLE IF NOT EXISTS actions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'brainstorming',
  conversation jsonb DEFAULT '[]',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Action steps
CREATE TABLE IF NOT EXISTS action_steps (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id     uuid NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  position      integer NOT NULL,
  title         text NOT NULL,
  description   text,
  executor_type text NOT NULL,
  status        text NOT NULL DEFAULT 'pending',
  output        text,
  error         text,
  metadata      jsonb DEFAULT '{}',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- API usage events (cost tracking per step)
CREATE TABLE IF NOT EXISTS api_usage_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id     uuid NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  step_id       uuid REFERENCES action_steps(id) ON DELETE CASCADE,
  model         text,
  input_tokens  integer,
  output_tokens integer,
  cost_usd      numeric(10,6),
  created_at    timestamptz DEFAULT now()
);

-- Agents
CREATE TABLE IF NOT EXISTS agents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text UNIQUE NOT NULL,
  name         text NOT NULL,
  role         text NOT NULL,
  goals        text NOT NULL,
  constraints  text NOT NULL,
  skill_slugs  text[] DEFAULT '{}',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Skills
CREATE TABLE IF NOT EXISTS skills (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           text UNIQUE NOT NULL,
  name           text NOT NULL,
  trigger        text NOT NULL,
  instructions   text NOT NULL,
  output_format  text NOT NULL,
  example_output text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- Settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
  key        text PRIMARY KEY,
  value      text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for FK columns (Postgres does not auto-index these)
CREATE INDEX IF NOT EXISTS idx_actions_task_id ON actions(task_id);
CREATE INDEX IF NOT EXISTS idx_action_steps_action_id ON action_steps(action_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_events_action_id ON api_usage_events(action_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_events_step_id ON api_usage_events(step_id);

-- Transactional skill delete: removes skill + cleans up agent skill_slugs
CREATE OR REPLACE FUNCTION delete_skill_and_unlink(skill_slug text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM skills WHERE slug = skill_slug;
  UPDATE agents SET skill_slugs = array_remove(skill_slugs, skill_slug)
    WHERE skill_slug = ANY(skill_slugs);
END;
$$;
