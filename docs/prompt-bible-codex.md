# Prompt Bible — Codex Edition (v0.1)

> **Purpose**: Reusable, high-signal prompt templates for planning, designing, building, testing, and shipping software with an AI coding assistant. Each template includes clearly marked placeholders, output expectations, and quality guardrails.

---

## 0) How to use this Bible

**Principles**

* Pack context: include domain, constraints, interfaces, and acceptance criteria.
* Be explicit about non-negotiables (security, performance budgets, style guides).
* Ask the model to reveal **assumptions, open questions, and risks** at the end of every answer.
* Demand structured outputs (checklists, tables, JSON, or Markdown sections).
* Prefer short, iterative prompts over one giant omnibus.

**Macro-prompt you can prepend to any template (optional)**

```
You are a senior staff engineer and pragmatic architect. Communicate clearly, cite assumptions, and prefer simple, maintainable solutions.
For every answer: (1) list assumptions, (2) call out trade-offs, (3) include a short checklist for next steps.
If you must make a choice without data, state the heuristic used.
Format using concise Markdown sections.
```

---

## 1) New Project Scaffold

**Goal**: file structure + essential tooling.

```
I'm starting a new [type of project] using [language/framework/version].
Constraints: [runtime], [hosting], [CI], [package manager].
Non-negotiables: [lint rules], [test framework], [license], [min Node/SDK].
Suggest:
1) A minimal file/folder structure
2) Essential dependencies (dev + prod) with 1-line justification each
3) Bootstrapping scripts (package.json or equivalents)
4) Initial config files (eslint, tsconfig, prettier, .gitignore)
5) A 5-step "first commit" checklist
Output: Markdown with tree view + code blocks for config files.
```

---

## 2) Capabilities (Use AI wisely)

```
What are the key strengths and limitations when using you for software development?
Cover: ideation, code generation, debugging, tests, refactors, reviews, security, performance, docs.
List 8 do’s and 8 don’ts; add examples of good vs. vague prompts.
Output: table with Capability | What to ask | Caveats.
```

---

## 3) Break a Project into Tasks

```
I want to build [brief description].
Give me: (A) major workstreams, (B) decomposed tasks per workstream, (C) recommended order of execution, (D) checkpoint criteria per task.
Assume team size: [solo/2-3/etc.]; cadence: [part-time hours/week].
Output: Markdown with numbered lists and a dependency graph (text).
```

---

## 4) Component/Module Breakdown (Deep)

```
Based on this overview: [paste], break into components.
For each:
1) Name
2) Main responsibility
3) Interfaces (inputs/outputs, events, DB/API touches)
4) Potential challenges
5) Interactions with other components
Then propose a logical build order with rationale.
Output: a table + a short bullets diagram of interactions.
```

---

## 5) Roadmap & Estimation

```
Using the component breakdown, draft a project roadmap.
Include:
1) Build order
2) Part-time timeframes (hrs or weeks) per component
3) Milestones with demoable outcomes
4) Dependencies that affect order
5) Useful proofs-of-concept or spikes
Output: timeline table + milestone checklist.
Assume [N] hrs/week; add an optimistic/likely/pessimistic range.
```

---

## 6) Risk Register with Mitigations

```
From this plan [paste], identify risks.
For each: Risk | Likelihood | Impact | Mitigation | Early warning signal | Owner.
Output: table + top-3 "burn down now" recommendations.
```

---

## 7) Technology Trade-off

```
We’re considering [Tech A] vs [Tech B] for [functionality].
Compare:
- Fit for our constraints: [latency], [throughput], [team skills], [cost], [ops]
- Performance and scalability vectors
- Developer ergonomics & ecosystem maturity
- Migration & lock-in risks
- Example reference implementation outline (10 steps)
Output: comparison table + decision guidance.
```

---

## 8) Scope & Effort Sizing

```
Given requirements [paste] and breakdown [paste], estimate total effort.
Provide: (1) bottom-up hours, (2) confidence level, (3) staffing scenarios, (4) scope cut options to fit [deadline/budget].
Output: table + bullets for descoping levers.
```

---

## 9) Architecture — Step-by-Step Design

```
Let’s design [component/system]. Consider:
1) Required capabilities
2) Data model & key entities
3) Modules/classes and responsibilities
4) Interfaces to other systems (sync/async)
5) Applicable design patterns (why)
6) Scale & operability (observability, limits, SLOs)
Output: concise sections + ASCII diagram + open questions.
```

---

## 10) Challenge the Design (Alternatives)

```
Evaluate the proposed design [paste].
1) Drawbacks/limitations
2) An alternative optimized for [performance/flexibility/simplicity]
3) How to adapt if we later need to [future requirement]
Output: pros/cons table + migration sketch.
```

---

## 11) ADR — Architecture Decision Record

```
Create an ADR.
Context: [problem + constraints]
Options considered: [A, B, C]
Decision: [chosen option]
Consequences: [positive, negative]
Related decisions: [links]
Output: ADR in Markdown with date and status.
```

---

## 12) Design Patterns Exploration

```
Given we need [specific capability], suggest relevant patterns.
For each: how it applies here, tiny code sketch, benefits, pitfalls.
Output: short sections, keep to 3–5 patterns.
```

---

## 13) Database Schema (Initial + Indexing)

```
Design a schema for [domain] with entities: [list].
Provide: tables with columns/types, PK/FK, junction tables, indexes, sample queries, and scaling notes (sharding/partitioning if relevant).
Output: Markdown tables + example SQL.
```

**Refinement prompt**

```
Analyze this schema [paste]. Cover normalization, possible denormalization, missing indexes, bottlenecks, constraints/triggers. Provide pros/cons.
```

---

## 14) API Design (REST)

```
Design a REST API for [functionality].
For each endpoint: METHOD, URL, purpose, auth, request body/params, response shape, status codes, idempotency, rate limits.
Output: Markdown with example requests/responses.
```

---

## 15) Scalability Plan

```
We expect [load profile]. Propose scale tactics across:
- Caching (client/edge/server)
- Concurrency & back-pressure
- Async processing (queues)
- Data partitioning/TTL
- Observability (metrics, logs, tracing), SLOs and alerts
Output: 1-page plan + readiness checklist.
```

---

## 16) Code Generation (High-Signal)

```
I need to implement [specific functionality] in [language/framework].
Requirements:
1) [Req 1]
2) [Req 2]
3) [Req 3]
Please consider: error handling, edge cases, performance, best practices.
Do not remove existing comments.
Output code with clear inline comments and a brief docstring header.
Also return a short test plan and example usage.
```

---

## 17) Explain Code

```
Explain this code in detail: [paste].
Cover: purpose, step-by-step flow, key data structures, complexity, potential issues, and improvements.
```

---

## 18) Code Review

```
Review the following code: [paste].
Evaluate: correctness, edge cases, security, performance, readability, maintainability.
Suggest concrete improvements with diff-style snippets.
```

---

## 19) Algorithm Prompt

```
Implement [algorithm] in [language]. Include: main function signature, helper functions, complexity, and worked example.
```

---

## 20) Class/Module Prompt

```
Create a [class/module] for [responsibility] in [language]. Include constructor, public methods (with docstrings), private helpers, and usage example.
```

---

## 21) Optimize Existing Code

```
Here is code to optimize: [paste].
Identify bottlenecks and propose refactors. For each change: rationale, expected impact, trade-offs. Provide revised code.
```

---

## 22) Unit Tests Generation

```
Generate unit tests for: [paste function/module].
Include: normal cases, edge cases, invalid inputs, and fixtures/mocks as needed. Use [testing framework].
Output: runnable test file(s) + coverage goals.
```

---

## 23) Integration Tests

```
Create integration tests for components: [list].
Scenarios: [happy paths], [failure modes], [timeouts/retries].
Include setup/teardown strategy and test data plan.
```

---

## 24) Performance Test Plan

```
We need a perf plan for [system]. KPIs: [latency], [throughput], [error rate].
Propose: workloads, test tools, ramp profiles, pass/fail thresholds, and bottleneck triage steps.
```

---

## 25) Security Review

```
Security audit for code/config: [paste].
Check: injection, auth, sensitive data, access control, XSS/CSRF, SSRF, deserialization, dependencies, logging.
For each finding: impact, fix, example patch.
```

---

## 26) Test Data Generation

```
Given this schema: [paste], generate a test data plan and scripts.
Include normal/edge/invalid cases, enforce referential integrity, and provide cleanup strategy.
```

---

## 27) Commit Message Helper

```
Given this diff/summary: [paste], craft a conventional commit.
Subject ≤50 chars; body wrapped at 72; include context, rationale, and references.
```

---

## 28) Merge Conflict Resolution

```
Here are conflicting hunks: [paste].
The feature goal: [describe].
Propose a resolved version preserving both intents; explain the resolution and follow-up tests to run.
```

---

## 29) Pull Request Review

```
Review this PR: [paste diff/summary].
Call out: breaking changes, missing tests, performance/security issues, docs gaps. Provide actionable suggestions.
```

---

## 30) .gitignore Generator

```
Create a .gitignore for a [language/framework/IDE] project. Exclude system/IDE cruft, build artifacts, and secrets. Explain any non-obvious entries.
```

---

## 31) Release Notes

```
Generate release notes for v[X.Y.Z] using these commits: [paste].
Include: highlights, breaking changes + migration, fixes, performance notes, thanks.
```

---

## 32) Branch Naming Convention

```
Propose a branch naming scheme that encodes type (feature/bugfix/hotfix/chore), ticket number, and slug. Provide examples and rules.
```

---

## 33) Documentation Generator

```
Create documentation for [project/component]. Include: overview, install, configuration, API (if any), examples, troubleshooting, FAQ.
Audience: [devs/users]. Use clear language and runnable snippets.
```

**Updater prompt**

```
We changed the code as follows: [summary]. Update the docs accordingly, noting breaking changes and new features.
```

**Periodic review prompt**

```
Review these docs [paste] for gaps, outdated sections, clarity issues, and propose improvements.
```

---

## 34) QA & Debugging Helper

```
Bug report: [symptoms, logs, repro steps].
Analyze likely causes, propose a debugging checklist (ordered), tools to use, and a minimal patch if identifiable.
```

---

## Appendix A — Output Formats (cheat sheet)

* **Tables** for comparisons, risks, roadmaps.
* **Checklists** for acceptance criteria and DOR/DOD.
* **Code fences** with language tags.
* **JSON blocks** for machine-readable configs.

**Quality footer to paste at the end of any prompt**

```
At the end, list: Assumptions • Open Questions • Risks • Next 3 Actions.
```

---

## Appendix B — Example (Domain-specific)

> Replace placeholders with your domain specifics when useful. Example below is illustrative only.

**Example — Ingest API ADR (Cloudflare Worker)**

```
Context: Secure telemetry ingest for IoT devices over HTTPS; HMAC signature; rate limits; D1 for storage.
Options: (A) Single Worker with KV cache; (B) Worker + Durable Object per device; (C) Workers RPC + Queue.
Decision: A for MVP; B later if contention appears.
Consequences: + Low latency & simple ops; - Potential hot-key at peak → mitigated via token bucketing and backoff.
Related: ADR-004 on JWT/Access integration.
```

**Example — REST API design stub**

```
POST /api/ingest/{profileId}
Headers: X-DEVICE-ID, X-SIGNATURE, Content-Type: application/json
Body: { deviceId, ts, metrics: {k:v}, status: {...}, faults: [...] }
Responses: 202 on enqueue, 401 on bad signature, 409 on replay.
```

---

## Appendix C — Checklists

**Definition of Ready (for any feature)**

* Clear acceptance criteria
* Error states identified
* Telemetry & alerts defined
* Security/privacy reviewed

**Definition of Done**

* Tests pass with coverage ≥ [target]
* Docs updated
* Observability in place
* Release notes drafted

---

*End of v0.1*

