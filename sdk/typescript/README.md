# SynthMR TypeScript SDK (Starter)

Minimal SDK wrapper for SynthMR Agent API.

## Install

Copy `sdk/typescript/index.ts` into your project, or import directly in a monorepo.

## Usage

```ts
import { SynthmrClient } from "./index";

const client = new SynthmrClient({
  baseUrl: "https://your-synthmr-domain.com",
  apiKey: process.env.SYNTHMR_API_KEY!,
});

const study = await client.createStudy({
  ideaText: "AI-powered nutrition coach for busy parents",
  geography: "US",
  industry: "Health",
  pricePoints: [19, 39, 79],
});

const run = await client.startRun(String(study.study.id), { sampleSize: 250 });
const runId = String(run.run.id);

const runStatus = await client.getRun(runId);
const results = await client.getResults(runId);
```

## Methods

- `createStudy(...)`
- `startRun(studyId, ...)`
- `getRun(runId)`
- `getResults(runId)`
