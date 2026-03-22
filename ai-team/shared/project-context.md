# SynthMR — Project Context

## What SynthMR Does

SynthMR (Synthetic Market Research) is an MVP web application that lets users validate business ideas and pricing strategies using AI-simulated market research. Users enter a business idea and price points, and the system generates a synthetic population of personas, samples from that population, then uses an LLM to simulate how each persona would respond to a survey about the product — including willingness to pay, objections, and value perception.

The output is a set of actionable insights: willingness-to-pay curves by price point, customer segments (age, income, pain point, channel), top objections, recommended messaging angles, and suggested next experiments.

## Target Users

- Founders validating product-market fit before building
- Product managers testing pricing strategies
- Marketers exploring messaging angles and audience segments
- Anyone who needs quick, low-cost directional market research without running real surveys

## Key Features (Implemented)

- Email/password authentication with session-based auth (Argon2, httpOnly cookies, CSRF)
- Study creation: business idea, geography (US), industry, 3 price points, target audience, sample size
- Population modes: general (200K–1M personas) or audience-specific (filtered)
- Saved audience presets per user
- Background job processing via BullMQ (population generation, sampling, LLM survey simulation, aggregation)
- Results display: WTP curves, top 5 segments, objections, messaging recommendations, next experiments
- Study management: list with search/sort/filter, duplicate, delete
- Account management: profile, data export, account deletion
- System status page (DB, Redis, worker health)
- Public API (v1) with API keys and webhook support
- Chat interface for discussing study results with AI
- SDK clients (Python and TypeScript) for programmatic access

## Product Goals

1. Deliver directionally useful market research insights in minutes instead of weeks
2. Make validation accessible at a fraction of traditional survey cost
3. Provide an API-first platform that AI agents and workflows can integrate with
4. Scale from MVP to production-ready SaaS with billing and multi-tenancy

## Current Development Priorities

1. Production hardening: env alignment, error tracking, monitoring
2. Billing integration (Stripe schema exists, no logic yet)
3. Worker scaling (currently single-process)
4. LLM cost controls and budget enforcement
5. Onboarding flow for new users
6. Multi-geography support beyond US
