# File Structure Overview

This document maps out the complete file structure of the codepress-review GitHub Action project.

## Root Directory Structure

```
codepress-review/
├── CLAUDE.md                    # Claude Code development guidelines and common commands
├── README.md                    # Project documentation and usage instructions
├── action.yml                   # GitHub Action definition and input/output specifications
├── eslint.config.js            # ESLint configuration for TypeScript linting
├── package.json                 # Node.js dependencies and npm scripts
├── pnpm-lock.yaml              # PNPM lock file for dependency versioning
├── tsconfig.json               # TypeScript compiler configuration
├── types.ts                    # Global type definitions for Finding objects
├── dist/                       # Compiled output directory (built artifacts)
├── node_modules/               # Node.js dependencies (ignored in git)
└── src/                        # Source code directory
```

## Source Code Structure (`src/`)

```
src/
├── index.ts                    # GitHub Action entry point
├── ai-review.ts               # Main AI review engine
└── system-prompt.ts           # System prompt builder and configuration
```

### Core Source Files

1. **`src/index.ts`**

   - GitHub Action entry point
   - Input validation and environment setup
   - Git diff generation
   - Delegates to ai-review.ts for processing

2. **`src/ai-review.ts`**

   - Main review engine implementation
   - Hunk-based diff processing
   - LLM integration via Vercel AI SDK
   - GitHub API comment posting
   - Retry logic with exponential backoff

3. **`src/system-prompt.ts`**
   - Configurable system prompt builder
   - Default code review guidelines
   - XML response format enforcement
   - Custom prompt integration

## Distribution Structure (`dist/`)

```
dist/
├── index.js                    # Bundled main entry point for GitHub Action
├── index.js.map               # Source map for main bundle
├── licenses.txt               # Third-party license information
├── sourcemap-register.js      # Source map registration for debugging
├── types.d.ts                 # Compiled type definitions
├── types.d.ts.map            # Source map for type definitions
├── types.js                   # Compiled types
├── types.js.map              # Source map for compiled types
└── src/                       # Compiled source files with declarations
    ├── ai-review.d.ts         # Type declarations for ai-review
    ├── ai-review.d.ts.map     # Source map for ai-review declarations
    ├── ai-review.js           # Compiled ai-review module
    ├── ai-review.js.map       # Source map for ai-review
    ├── index.d.ts             # Type declarations for index
    ├── index.d.ts.map         # Source map for index declarations
    ├── index.js               # Compiled index module
    ├── index.js.map           # Source map for index
    ├── system-prompt.d.ts     # Type declarations for system-prompt
    ├── system-prompt.d.ts.map # Source map for system-prompt declarations
    ├── system-prompt.js       # Compiled system-prompt module
    └── system-prompt.js.map   # Source map for system-prompt
```

## Configuration Files

### `action.yml`

- GitHub Action definition
- Input parameters (model_provider, model_name, API keys, etc.)
- Output specifications
- Runtime environment configuration

### `package.json`

- Project metadata and dependencies
- NPM scripts (build, lint, type-check, test, review)
- Dependencies: Vercel AI SDK, GitHub API, TypeScript tooling

### `tsconfig.json`

- TypeScript compiler settings
- Target ES2020 with CommonJS modules
- Strict typing configuration
- Declaration file generation

### `eslint.config.js`

- ESLint configuration for TypeScript
- Code quality and style enforcement
- Must have 0 warnings policy

## Type Definitions (`types.ts`)

```typescript
interface Finding {
  path: string; // File path
  line: number; // Line number
  message: string; // Review message
  severity: string; // Severity level (required, optional, nit, fyi)
  suggestion?: string; // Optional code suggestion
}
```

## Architecture Overview

### Technology Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript (strict mode)
- **AI Integration**: Vercel AI SDK (`ai` package)
- **Bundling**: `@vercel/ncc` for single-file distribution
- **API Integration**: GitHub REST API via `@actions/github`

### Supported LLM Providers

- **OpenAI**: GPT-4o and other OpenAI models
- **Anthropic**: Claude 3 Sonnet and other Claude models
- **Google**: Gemini Pro and other Google AI models

### Key Features

- **Hunk-based processing**: Splits diffs into focused chunks
- **Structured XML output**: Enforces consistent response format
- **Line number resolution**: Maps findings to actual GitHub lines
- **Custom prompts**: Supports user-defined review guidelines
- **Retry mechanisms**: Handles API failures gracefully
- **Multi-provider support**: Unified interface across AI providers

### Environment Variables

- `GITHUB_TOKEN`: GitHub API authentication
- `MODEL_PROVIDER`: AI provider selection
- `MODEL_NAME`: Specific model identification
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`: Provider API keys
- `CUSTOM_PROMPT`: Optional custom review instructions
- `CUSTOM_SUMMARIZE_PROMPT`: Optional custom summarize review instructions
- `GITHUB_REPOSITORY`: Repository identification

## Build Process

1. **TypeScript Compilation**: `tsc` compiles `.ts` to `.js` with declarations
2. **Bundling**: `@vercel/ncc` creates single-file distribution in `dist/index.js`
3. **Source Maps**: Generated for debugging support
4. **License Extraction**: Third-party licenses collected in `dist/licenses.txt`

## Testing and Quality

- **Linting**: ESLint with zero-warning policy
- **Type Checking**: Strict TypeScript compilation
- **Manual Testing**: `npm run review` for local execution
- **Build Validation**: Compilation and bundling verification
