# Deployment Guide

## Local Setup (Recommended)

1. Clone the repo
2. `cp .env.example .env.local`
3. Create a Supabase project at supabase.com (free tier)
4. Copy NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from Settings → API
5. Run the migration: go to Supabase SQL Editor, paste contents of `src/lib/db/migration.sql`, run it
6. Add your ANTHROPIC_API_KEY from console.anthropic.com
7. Set DEMO_PASSWORD to any password you want
8. Generate SESSION_SECRET: `openssl rand -base64 32`
9. `npm install && npm run dev`
10. Visit http://localhost:3000 → complete the onboarding wizard

## Optional: Vercel Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

Add all env vars from `.env.example` to your Vercel project settings.

## Pre-Interview Checklist

- [ ] Open app and verify tasks load (especially Task 1: Stripe PMM research — completed)
- [ ] Check Agents section: The Researcher + Interview Coach visible
- [ ] Check Skills section: 4 skills visible with correct names
- [ ] Test: trigger The Researcher on a new task (should reach brainstorm step)
- [ ] If using web search: verify Tavily key is set and working
- [ ] Run `npm run seed` to reset demo data if needed

## Reset Demo Data

```bash
npm run seed
```

This re-seeds the 3 demo tasks with fixed IDs (idempotent — safe to run multiple times).
