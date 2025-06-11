# CodePress Review

A turnkey GitHub Action for automatic, inline code review on every Pull Request using LLMs (OpenAI, Anthropic, Google Gemini, etc.).

## Features

- 🤖 **AI-Powered Reviews**: Uses GPT-4, Claude, Gemini, and other leading models
- 💬 **Inline Comments**: Posts line-level feedback directly on PRs
- 🔄 **Provider Agnostic**: Easily switch between OpenAI, Anthropic, Google
- 📝 **Smart Chunking**: Handles large diffs efficiently
- 🛡️ **Robust**: Built-in retries, rate limiting, and error handling
- ⚡ **Zero Setup**: Just add to your workflow file

## Quick Start

Add this workflow to your repository at `.github/workflows/codepress-review.yml`:

```yaml
name: CodePress Review

on:
  pull_request:
    types: [opened, reopened, synchronize]

permissions:
  pull-requests: write
  contents: read

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: CodePress Review
        uses: @quantfive/codepress-review@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          model_provider: "openai"
          model_name: "gpt-4o"
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
```

## Configuration

### Required Secrets

Add these to your repository's **Settings → Secrets and variables → Actions**:

| Secret              | Provider  | Description            |
| ------------------- | --------- | ---------------------- |
| `OPENAI_API_KEY`    | OpenAI    | Your OpenAI API key    |
| `ANTHROPIC_API_KEY` | Anthropic | Your Anthropic API key |
| `GEMINI_API_KEY`    | Google    | Your Google AI API key |

### Input Parameters

| Input                     | Required | Default               | Description                                  |
| ------------------------- | -------- | --------------------- | -------------------------------------------- |
| `github_token`            | ✅       | `${{ github.token }}` | GitHub token for API access                  |
| `model_provider`          | ✅       | `openai`              | AI provider: `openai`, `anthropic`, `gemini` |
| `model_name`              | ✅       | `gpt-4o`              | Model name (see examples below)              |
| `openai_api_key`          | ⚠️       |                       | Required if using OpenAI                     |
| `anthropic_api_key`       | ⚠️       |                       | Required if using Anthropic                  |
| `gemini_api_key`          | ⚠️       |                       | Required if using Google                     |
| `custom_prompt`           | ❌       | `''`                  | Custom review prompt for individual chunks   |
| `custom_summarize_prompt` | ❌       | `''`                  | Custom prompt for initial diff summarization |

## Examples

### OpenAI GPT-4o

```yaml
- name: CodePress Review
  uses: @quantfive/codepress-review@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "openai"
    model_name: "gpt-4o"
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
```

### Anthropic Claude

```yaml
- name: CodePress Review
  uses: @quantfive/codepress-review@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "anthropic"
    model_name: "claude-3-sonnet-20240229"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Google Gemini

```yaml
- name: CodePress Review
  uses: @quantfive/codepress-review@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "gemini"
    model_name: "gemini-1.5-pro"
    gemini_api_key: ${{ secrets.GEMINI_API_KEY }}
```

## Review Output Format

CodePress Review uses a structured XML format for consistent, rich code review comments. Each finding includes:

- **Severity**: `required`, `optional`, `nit`, or `fyi`
- **Inline Comments**: Posted directly on the relevant line
- **Suggestions**: Optional code improvements with syntax highlighting
- **Examples**: Optional code blocks demonstrating best practices

Example output format:

````xml
<comment>
  <severity>required</severity>
  <file>src/components/Button.tsx</file>
  <line>+  onClick?: () => void;</line>
  <message>Consider making onClick required for better UX - users expect buttons to be interactive.</message>
  <suggestion>+  onClick: () => void;</suggestion>
  <code>
    ```tsx
    interface ButtonProps {
      text: string;
      onClick: () => void; // required for user interaction
    }
    ```
  </code>
</comment>
````

## Two-Pass Review System

CodePress Review uses a sophisticated **two-pass review system** for enhanced code analysis:

1. **First Pass - Diff Summarization**: Analyzes the entire diff to identify PR type, key themes, and risks
2. **Second Pass - Chunk Review**: Reviews each code chunk with context from the first pass

This provides global awareness while maintaining focused, line-level feedback.

## Custom Prompts

You can customize both phases of the review process:

### `custom_prompt` (Chunk Review)

Customizes the individual chunk review behavior. When you provide a custom prompt:

- **Your prompt replaces**: The review criteria, guidelines, and style sections
- **System preserves**: The XML response format to ensure consistent output structure
- **Context included**: Each chunk receives global context from the summarization pass

### `custom_summarize_prompt` (Diff Summarization)

Customizes the initial diff analysis that provides context to chunk reviews. When provided:

- **Your prompt replaces**: The summarization guidelines and focus areas
- **System preserves**: The structured XML output format for global/hunk analysis
- **Output used**: Results enhance all subsequent chunk reviews with relevant context

Both custom prompts work seamlessly while maintaining the structured output formats.

### Security-Focused Review

```yaml
- name: CodePress Review
  uses: @quantfive/codepress-review@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "openai"
    model_name: "gpt-4o"
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    custom_prompt: |
      You are a security expert reviewing code for vulnerabilities. Focus on:
      - Authentication and authorization issues
      - Input validation and sanitization
      - SQL injection, XSS, and CSRF vulnerabilities
      - Sensitive data exposure

      Use severity levels: required (critical security issues),
      optional (security improvements), nit (minor security polish),
      fyi (security info).
```

### Performance-Focused Review

```yaml
- name: CodePress Review
  uses: @quantfive/codepress-review@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "anthropic"
    model_name: "claude-3-sonnet-20240229"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    custom_prompt: |
      You are a performance optimization expert. Review this code for:
      - Inefficient algorithms and data structures
      - Memory leaks and excessive allocations
      - Database query optimization opportunities
      - Caching and batching improvements

      Provide concrete performance improvements and metrics when possible.
```

### Beginner-Friendly Review

````yaml
- name: CodePress Review
  uses: @quantfive/codepress-review@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "openai"
    model_name: "gpt-4o"
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    custom_prompt: |
      You are a patient mentor reviewing code from a junior developer. Your feedback should be:
      - Educational and encouraging
      - Explain the "why" behind suggestions
      - Include code examples when helpful
      - Focus on learning opportunities

      Prefer severity levels: optional (learning opportunities), nit (style), fyi (educational notes).

### Combined Custom Prompts

You can use both prompts together for comprehensive customization:

```yaml
- name: CodePress Review
  uses: @quantfive/codepress-review@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "openai"
    model_name: "gpt-4o"
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    custom_summarize_prompt: |
      You are analyzing a complete pull request. Focus on:
      - API design and breaking changes
      - Cross-service dependencies
      - Database migration impacts
      - Performance implications at scale

      Classify the PR type and identify global architectural concerns.
    custom_prompt: |
      You are reviewing individual code changes with architectural context.
      Focus on implementation details that support the overall design.
      Be specific about how each change impacts the broader system.
````

```

## Suggestion Format Demo

> See below for an example of a multi-line suggestion block.

```

```suggestion
// improved code here
```

```

## Screenshot

![screenshot](screenshot.png)

## Cost & Performance Caveats

- LLM usage may incur costs depending on provider/model.
- Review time and cost scale with diff size and model selection.

## Fork Safety

If you want to run this bot on PRs from forks, use `pull_request_target` instead of `pull_request` in your workflow trigger. **Warning:** This exposes repository secrets to forked PRs. For maximum safety, use a low-privilege Personal Access Token (PAT) with only `pull-requests: write` and `contents: read` scopes, and store it as a secret (e.g., `REVIEW_BOT_TOKEN`).

Update the workflow:

```

on:
pull_request_target:
types: [opened, reopened, synchronize]

```

And set:

```

env:
GITHUB_TOKEN: ${{ secrets.REVIEW_BOT_TOKEN }}

````

## Technical Architecture

This project uses the [Vercel AI SDK](https://ai-sdk.dev/docs/introduction) (`ai` package) for all LLM providers. The system:

- **Clean TypeScript Functions**: System prompts managed in `src/system-prompt.ts`
- **Proper Message Structure**: Uses system prompt for guidelines + user prompt for diff content
- **Preserved Response Format**: Always includes XML `<responseFormat>` regardless of custom prompts
- **Structured XML Output**: Parses XML responses for rich comment formatting
- **Severity System**: `required`, `optional`, `nit`, `fyi` with emoji indicators
- **Hunk-Based Processing**: Each diff hunk processed individually for focused reviews
- **Line Resolution**: Handles line number mapping from diff context

## Publishing to GitHub Marketplace

To publish this action to the GitHub Marketplace:

1. **Tag a Release**: Create and push a version tag
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

2. **Create Release**: Go to your repository's releases page and create a new release from the tag

3. **Publish to Marketplace**: Check the "Publish this Action to the GitHub Marketplace" box when creating the release

4. **Users Install**: After publishing, users can reference your action as:
   ```yaml
   - uses: @quantfive/codepress-review@v1
   ```

The action is completely self-contained - users don't need to install dependencies, get diffs manually, or run scripts. Everything is handled automatically by `src/index.ts`.

---

*See below for full usage and configuration details.*
````
