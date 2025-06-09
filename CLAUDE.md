# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

- **Build**: `npm run build` - Compiles TypeScript and packages with ncc
- **Package**: `npm run package` - Alias for build command
- **Lint**: `npm run lint` - ESLint with TypeScript support, must have 0 warnings
- **Type Check**: `npm run type-check` - TypeScript compilation check without output
- **Test**: `npm run test` - Runs build and package (no separate test suite)
- **Manual Review**: `npm run review` - Runs ts-node on ai-review.ts for local testing

## Architecture Overview

This is a **GitHub Action** that provides AI-powered code review for Pull Requests using multiple LLM providers (OpenAI, Anthropic, Google Gemini).

### Core Components

- **`src/index.ts`**: GitHub Action entry point that validates inputs, generates git diffs, and delegates to ai-review.ts
- **`src/ai-review.ts`**: Main review engine with hunk-based diff processing, LLM integration via Vercel AI SDK, and GitHub API comment posting
- **`src/system-prompt.ts`**: Configurable system prompt builder with default code review guidelines and XML response format enforcement
- **`types.ts`**: Type definitions for Finding objects (path, line, message, severity, suggestion, code)

### Key Architecture Patterns

- **Provider Agnostic**: Uses Vercel AI SDK (`ai` package) for unified LLM access across OpenAI, Anthropic, and Google
- **Hunk-Based Processing**: Splits diffs into individual hunks rather than arbitrary size limits for focused reviews
- **Structured XML Output**: Enforces consistent XML response format with severity levels (required, optional, nit, fyi)
- **Line Resolution**: Maps XML findings to actual GitHub line numbers through diff parsing
- **Retry Logic**: Built-in exponential backoff for LLM API failures
- **Custom Prompts**: Supports custom review prompts while preserving XML response format

### Environment Variables

The action expects these environment variables (set automatically by GitHub Actions):
- `GITHUB_TOKEN`: GitHub API access
- `MODEL_PROVIDER`: "openai", "anthropic", or "gemini"  
- `MODEL_NAME`: Specific model (e.g., "gpt-4o", "claude-3-sonnet-20240229")
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`: Provider-specific keys
- `CUSTOM_PROMPT`: Optional custom review prompt
- `GITHUB_REPOSITORY`: Owner/repo format

### TypeScript Configuration

- Target ES2020 with CommonJS modules for Node.js 20+ compatibility
- Strict typing enabled with declaration files
- Uses `@vercel/ncc` for single-file bundling in `dist/index.js`