# Ticket Dashboard: Project Breakdown

A small React + TypeScript application and an agent built around it. It illustrates the progression from a coding-agent user to an agentic system engineer.

## What's Inside

* `src/` — application: a ticket list without search or filters
* `AGENTS.md` — agent context: structure, commands, rules, and acceptance criteria
* `tasks/` — three tasks with criteria
* `.pi/prompts/` — prompt templates for `/implement` and `/review` commands in Pi
* `agent/v0.ts` — the entire agent in a single file: model, three tools, execution loop
* `agent/core.ts` — the same loop as a reusable core: gate, trace, step limit
* `agent/coding-agent.ts` — a developer agent built on the core: file access permissions, checks executed by the test harness
* `agent/tickets-agent.ts` — the same core in product use: an agent for a support operator

## Running the Application

```bash
npm install
npm test
npm run typecheck
npm run dev

```

Requires Node.js 20.19+ or 22.12+. The application will open at http://localhost:5173.

## Pi

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
pi

```

On first launch inside the project directory, confirm that you trust the project; otherwise, templates from `.pi/prompts` will not load. The model is connected via `/login` and `/model`.

```text
/implement tasks/01-search-filter.md
/review tasks/01-search-filter.md

```

`/implement` and `/review` are project-specific template file names, not built-in Pi commands.

Pi version in the recording: enter the output of `pi --version`.

## Custom Agent

Copy `.env.example` to `.env` and configure the API endpoint, key, and model. Any OpenAI-compatible API supporting tool calling will work. Model availability depends on your provider's terms.

```bash
npx tsx agent/v0.ts tasks/02-reset-filters.md
npx tsx agent/coding-agent.ts tasks/03-search-by-customer.md
npx tsx agent/tickets-agent.ts "Close payment tickets that are currently in progress"

```

`v0.ts` is intentionally naive: it executes any command the model requests and can read any file, including `.env`. Run it only within a sandboxed/educational environment. In `coding-agent.ts`, the model has no terminal access, write permissions are restricted solely to `src/`, and `.env` is protected.

Always verify agent outputs yourself: run `npm test`, `npm run typecheck`, and check application behavior in the browser.
