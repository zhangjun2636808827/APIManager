# AGENTS.md

## Goal
Build a Windows desktop app for managing LLM API providers and chatting through them.

## Tech Stack
- Tauri 2
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

## Product Scope
- Manage multiple API configs
- Support OpenAI-compatible and Anthropic first
- Open provider console URLs inside the app
- Chat with selected provider
- Package for Windows

## Coding Rules
- Prefer small, focused commits
- Do not refactor unrelated files
- Keep business logic separated from UI
- Keep provider adapters behind a shared interface
- Avoid hardcoding secrets
- Prefer readable code over clever code
- Ask for plan approval before large structural changes

## UI Rules
- Desktop-tool style
- Clean, minimal, neutral colors
- Use shadcn/ui components when possible
- Keep spacing consistent
- Avoid flashy animation

## Workflow
- For each task:
  1. explain the plan
  2. list files to change
  3. implement
  4. explain how to run
  5. explain how to test