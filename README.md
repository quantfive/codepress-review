<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://github.com/user-attachments/assets/67eeb3b4-aeb7-4b15-901e-89ca514cedd6">
  <source media="(prefers-color-scheme: light)" srcset="https://github.com/user-attachments/assets/d74bcba3-a2ee-435e-85cf-f3c6813815f4">
  <img height="50" alt="CodePress Logo" src="https://github.com/user-attachments/assets/d74bcba3-a2ee-435e-85cf-f3c6813815f4">
</picture>


# CodePress Review

A turnkey GitHub Action for automatic, inline code review on every Pull Request using LLMs (OpenAI, Anthropic, Google Gemini, Cohere, Mistral, Groq, DeepSeek, and more).

## Features

- 🤖 **Autonomous AI Agent**: Intelligent agent that explores code, verifies claims, and posts actionable feedback
- 🔑 **BYOK + OS**: 100% open source. Install as a github action, and use your own key
- 💬 **Inline Comments**: Posts line-level feedback directly on PRs via GitHub CLI
- ✅ **Formal PR Reviews**: Submits approve/request-changes/comment decisions with summaries
- 📄 **Smart PR Descriptions**: Automatically generates structured PR descriptions for blank PRs
- 🔄 **Provider Agnostic**: Easily switch between 11+ LLM providers including self-hosted models
- 🔍 **Context-Aware**: Agent can read full files, search code, and analyze dependencies before commenting
- ⚡ **Zero Setup**: Just add to your github action workflows
- 🎯 **Customizable**: Use custom review guidelines via configuration file
- 🚨 **Blocking-Only Mode**: Focus only on critical issues that must be fixed before approval

## Quick Start

Add this workflow to your repository at `.github/workflows/codepress-review.yml`:

```yaml
name: CodePress Review

on:
  pull_request:
    types: [opened, reopened, review_requested] #synchronize
  issue_comment:
    types: [created]
  workflow_dispatch: # Allow manual triggering

permissions:
  pull-requests: write
  contents: read
  issues: read

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 50

      - name: CodePress Review
        uses: quantfive/codepress-review@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          model_provider: "openai"
          model_name: "gpt-5.1"
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          # All trigger configurations use sensible defaults
          # + synchronize event runs automatically when included in workflow
```

> **Important:** The `actions/checkout` step is required for CodePress v4 to access the full repository context. Without it, the agent cannot read files or search code beyond the diff.

## Configuration

### Required Secrets

Add these to your repository's **Settings → Secrets and variables → Actions** (only add the ones for providers you plan to use):

| Secret                      | Provider          | Description                                    |
| --------------------------- | ----------------- | ---------------------------------------------- |
| `OPENAI_API_KEY`            | OpenAI            | Your OpenAI API key                            |
| `ANTHROPIC_API_KEY`         | Anthropic         | Your Anthropic API key                         |
| `GEMINI_API_KEY`            | Google/Gemini     | Your Google AI API key                         |
| `COHERE_API_KEY`            | Cohere            | Your Cohere API key                            |
| `MISTRAL_API_KEY`           | Mistral           | Your Mistral API key                           |
| `PERPLEXITY_API_KEY`        | Perplexity        | Your Perplexity API key                        |
| `FIREWORKS_API_KEY`         | Fireworks         | Your Fireworks API key                         |
| `GROQ_API_KEY`              | Groq              | Your Groq API key                              |
| `XAI_API_KEY`               | xAI               | Your xAI API key                               |
| `DEEPSEEK_API_KEY`          | DeepSeek          | Your DeepSeek API key                          |
| `OPENAI_COMPATIBLE_API_KEY` | OpenAI-Compatible | API key for self-hosted OpenAI-compatible APIs |
| `OLLAMA_API_KEY`            | Ollama            | API key for Ollama (often not needed)          |

### Input Parameters

| Input                        | Required | Default               | Description                                                             |
| ---------------------------- | -------- | --------------------- | ----------------------------------------------------------------------- |
| `github_token`               | ✅       | `${{ github.token }}` | GitHub token for API access                                             |
| `model_provider`             | ✅       | `openai`              | AI provider (see [Supported Providers](#supported-providers))           |
| `model_name`                 | ✅       | `gpt-5.1`             | Model name or alias like `latest`, `sonnet-latest` (see below)          |
| `openai_api_key`             | ⚠️       |                       | Required if using OpenAI                                                |
| `anthropic_api_key`          | ⚠️       |                       | Required if using Anthropic                                             |
| `gemini_api_key`             | ⚠️       |                       | Required if using Google/Gemini                                         |
| `cohere_api_key`             | ⚠️       |                       | Required if using Cohere                                                |
| `mistral_api_key`            | ⚠️       |                       | Required if using Mistral                                               |
| `perplexity_api_key`         | ⚠️       |                       | Required if using Perplexity                                            |
| `fireworks_api_key`          | ⚠️       |                       | Required if using Fireworks                                             |
| `groq_api_key`               | ⚠️       |                       | Required if using Groq                                                  |
| `xai_api_key`                | ⚠️       |                       | Required if using xAI                                                   |
| `deepseek_api_key`           | ⚠️       |                       | Required if using DeepSeek                                              |
| `openai_compatible_api_key`  | ⚠️       |                       | Required if using OpenAI-compatible provider                            |
| `openai_compatible_base_url` | ⚠️       |                       | Required if using OpenAI-compatible provider                            |
| `ollama_api_key`             | ❌       |                       | API key for Ollama (optional, often not needed)                         |
| `ollama_base_url`            | ❌       | `localhost:11434/v1`  | Base URL for Ollama instance                                            |
| `reasoning_effort`           | ❌       |                       | OpenAI reasoning effort: `none`, `minimal`, `low`, `medium`, `high`     |
| `anthropic_effort`           | ❌       |                       | Anthropic effort level: `low`, `medium`, `high` (claude-opus-4-5 only)  |
| `thinking_enabled`           | ❌       | `false`               | Enable Anthropic extended thinking (claude-opus-4-5, claude-sonnet-4-5) |
| `thinking_budget`            | ❌       | `10000`               | Token budget for Anthropic extended thinking                            |
| `max_turns`                  | ❌       | `0` (unlimited)       | Maximum turns for autonomous agent review (0 = unlimited)               |
| `update_pr_description`      | ❌       | `true`                | Auto-generate PR descriptions for blank PRs                             |
| `blocking_only`              | ❌       | `false`               | Only generate comments for critical/blocking issues                     |
| `force_full_review`          | ❌       | `false`               | Force full review of all files, ignoring re-review optimizations        |
| `debug`                      | ❌       | `false`               | Enable debug mode for detailed console logs                             |
| `run_on_pr_opened`           | ❌       | `true`                | Run review when PR is opened                                            |
| `run_on_pr_reopened`         | ❌       | `true`                | Run review when PR is reopened                                          |
| `run_on_review_requested`    | ❌       | `true`                | Run review when re-review requested from github-actions[bot]            |
| `run_on_comment_trigger`     | ❌       | `true`                | Run review when comments contain trigger phrase                         |
| `comment_trigger_phrase`     | ❌       | `"@codepress/review"` | Phrase that triggers review in comments                                 |

### Model Aliases (Always Use Latest)

Instead of hardcoding specific model versions, use `-latest` aliases to **automatically get the newest models** without updating your workflow:

```yaml
- uses: quantfive/codepress-review@v4
  with:
    model_provider: "anthropic"
    model_name: "sonnet-latest"  # Always uses the latest Sonnet model
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

When Anthropic releases `claude-sonnet-4-7`, your workflow will automatically use it — no config changes needed.

#### Available Aliases by Provider

| Provider | Alias | Resolves To |
| -------- | ----- | ----------- |
| **OpenAI** | `latest`, `gpt-latest` | Latest GPT model |
| | `gpt-mini-latest` | Latest GPT mini model |
| **Anthropic** | `latest`, `sonnet-latest` | Latest Claude Sonnet |
| | `opus-latest` | Latest Claude Opus |
| | `haiku-latest` | Latest Claude Haiku |
| **Google/Gemini** | `latest`, `gemini-flash-latest` | Latest Gemini Flash |
| | `gemini-pro-latest` | Latest Gemini Pro |
| **Cohere** | `latest`, `command-latest` | Latest Command model |
| **Groq** | `latest`, `llama-latest` | Latest Llama model |
| **DeepSeek** | `latest`, `deepseek-chat-latest` | Latest DeepSeek Chat |
| | `deepseek-reasoner-latest` | Latest DeepSeek Reasoner |
| **xAI** | `latest`, `grok-latest` | Latest Grok model |
| | `grok-mini-latest` | Latest Grok mini |
| **Mistral** | `latest` | `mistral-large-latest` |
| | `mistral-large-latest` | Mistral's own latest alias |
| | `mistral-small-latest` | Mistral's own latest alias |
| **Perplexity** | `latest`, `sonar-latest` | Latest Sonar model |

#### How Dynamic Resolution Works

For most providers, aliases are resolved **dynamically at runtime**:

1. CodePress queries the provider's model list API (e.g., `GET /v1/models`)
2. Filters models matching the family (e.g., all "claude-sonnet-*" models)
3. Sorts by version number and picks the highest
4. Falls back to a static mapping if the API call fails

**Providers with dynamic resolution:** OpenAI, Anthropic, Google/Gemini, Cohere, Groq, DeepSeek, xAI, Ollama

**Providers using static aliases:** Mistral (they maintain their own `-latest` aliases), Perplexity, Fireworks

## Triggering Reviews

Beyond the default behavior of reviewing new PRs, you can configure CodePress to run on-demand or on every push.

### Review on Every Push (Optional)

To trigger reviews whenever new commits are pushed to a PR, add `synchronize` to your trigger types:

```yaml
on:
  pull_request:
    types: [opened, reopened, synchronize] # Added synchronize
```

**Note:** This will run a review on every push to the PR branch, which may increase costs and generate more review comments. Consider your team's workflow and budget when enabling this.

### On-Demand via PR Comments

You can trigger a new review at any time by posting a comment containing `@codepress/review` on the pull request. This feature is **enabled by default** and works automatically when you include `issue_comment` triggers in your workflow.

**Basic setup with comment triggers:**

```yaml
name: CodePress Review

on:
  pull_request:
    types: [opened, reopened]
  issue_comment:
    types: [created]
  workflow_dispatch: # Allows manual triggering from the Actions tab

permissions:
  pull-requests: write
  contents: read
  issues: read # Required to read PR comments

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 50
          ref: ${{ github.event.issue.pull_request && format('refs/pull/{0}/head', github.event.issue.number) || github.ref }}

      - name: CodePress Review
        uses: quantfive/codepress-review@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          model_provider: "openai"
          model_name: "gpt-5.1"
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          # Comment triggers are enabled by default
          # run_on_comment_trigger: true  # Default
          # comment_trigger_phrase: "@codepress/review"  # Default
```

**To disable comment triggers:**

```yaml
- name: CodePress Review
  uses: quantfive/codepress-review@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "openai"
    model_name: "gpt-5.1"
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    run_on_comment_trigger: false # Disable comment triggers
```

**To customize the trigger phrase:**

```yaml
- name: CodePress Review
  uses: quantfive/codepress-review@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "openai"
    model_name: "gpt-5.1"
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    comment_trigger_phrase: "please review" # Custom trigger phrase
```

### Manually from the Actions Tab

With `workflow_dispatch` enabled in your workflow file, you can manually trigger a review for any branch.

**Basic workflow_dispatch:**
```yaml
on:
  workflow_dispatch:
```

**With force_full_review option:**
```yaml
on:
  workflow_dispatch:
    inputs:
      force_full_review:
        description: 'Force full review of all files'
        type: boolean
        default: false

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - uses: quantfive/codepress-review@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          model_provider: "openai"
          model_name: "gpt-5.1"
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          force_full_review: ${{ inputs.force_full_review }}
```

To trigger manually:

1.  Navigate to your repository's **Actions** tab.
2.  Select the **CodePress Review** workflow from the list.
3.  Click the **Run workflow** dropdown.
4.  Choose the branch and optionally check **Force full review of all files**.
5.  Click **Run workflow**.

The action will automatically find the open pull request associated with that branch and run the review.

## Supported Providers

CodePress Review supports **11+ LLM providers** through the [Vercel AI SDK](https://ai-sdk.dev/docs/introduction), including self-hosted options:

### Cloud Providers

| Provider       | Models Available                                   | Notes                         |
| -------------- | -------------------------------------------------- | ----------------------------- |
| **OpenAI**     | `gpt-5.1`, `gpt-5.1-mini`, `o3`, `o4-mini`         | Most popular, reliable        |
| **Anthropic**  | `claude-sonnet-4-5`, `claude-opus-4-5`             | Excellent for code review     |
| **Google**     | `gemini-2.5-pro`, `gemini-2.5-flash`               | Fast and cost-effective       |
| **Cohere**     | `command-r-plus`, `command-r`                      | Strong reasoning capabilities |
| **Mistral**    | `mistral-large-latest`, `mistral-small-latest`     | European AI alternative       |
| **Perplexity** | `llama-3.1-sonar-large-128k-online`                | Web-connected models          |
| **Fireworks**  | `llama-v3p1-70b-instruct`, `mixtral-8x7b-instruct` | Fast inference                |
| **Groq**       | `llama-3.1-70b-versatile`, `mixtral-8x7b-32768`    | Ultra-fast inference          |
| **xAI**        | `grok-beta`                                        | Elon Musk's AI company        |
| **DeepSeek**   | `deepseek-chat`, `deepseek-coder`                  | Specialized coding models     |

### Self-Hosted Options

| Option                | Description                          | Configuration                         |
| --------------------- | ------------------------------------ | ------------------------------------- |
| **OpenAI-Compatible** | Any API that follows OpenAI's format | Requires `openai_compatible_base_url` |
| **Ollama**            | Local LLM instances                  | Defaults to `localhost:11434/v1`      |

## Examples

### OpenAI GPT-4o

```yaml
- name: CodePress Review
  uses: quantfive/codepress-review@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "openai"
    model_name: "gpt-5.1"
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
```

### Anthropic Claude

```yaml
- name: CodePress Review
  uses: quantfive/codepress-review@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "anthropic"
    model_name: "claude-sonnet-4-5"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Google Gemini

```yaml
- name: CodePress Review
  uses: quantfive/codepress-review@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "gemini"
    model_name: "gemini-2.5-pro"
    gemini_api_key: ${{ secrets.GEMINI_API_KEY }}
```

### Groq (Ultra-Fast)

```yaml
- name: CodePress Review
  uses: quantfive/codepress-review@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "groq"
    model_name: "llama-3.1-70b-versatile"
    groq_api_key: ${{ secrets.GROQ_API_KEY }}
```

### DeepSeek (Coding Specialist)

```yaml
- name: CodePress Review
  uses: quantfive/codepress-review@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "deepseek"
    model_name: "deepseek-coder"
    deepseek_api_key: ${{ secrets.DEEPSEEK_API_KEY }}
```

### Cohere Command R+

```yaml
- name: CodePress Review
  uses: quantfive/codepress-review@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "cohere"
    model_name: "command-r-plus"
    cohere_api_key: ${{ secrets.COHERE_API_KEY }}
```

### Self-Hosted OpenAI-Compatible API

```yaml
- name: CodePress Review
  uses: quantfive/codepress-review@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "openai-compatible"
    model_name: "llama-3.1-70b-instruct"
    openai_compatible_api_key: ${{ secrets.OPENAI_COMPATIBLE_API_KEY }}
    openai_compatible_base_url: "https://your-api-endpoint.com/v1"
```

### Local Ollama Instance

```yaml
- name: CodePress Review
  uses: quantfive/codepress-review@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "ollama"
    model_name: "llama3.1:70b"
    # ollama_base_url: "http://localhost:11434/v1"  # Default
    # ollama_api_key: ""  # Often not needed for local instances
```

### All Other Providers

<details>
<summary>Click to expand examples for Mistral, Perplexity, Fireworks, and xAI</summary>

#### Mistral

```yaml
- name: CodePress Review
  uses: quantfive/codepress-review@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "mistral"
    model_name: "mistral-large-latest"
    mistral_api_key: ${{ secrets.MISTRAL_API_KEY }}
```

#### Perplexity (Web-Connected)

```yaml
- name: CodePress Review
  uses: quantfive/codepress-review@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "perplexity"
    model_name: "llama-3.1-sonar-large-128k-online"
    perplexity_api_key: ${{ secrets.PERPLEXITY_API_KEY }}
```

#### Fireworks (Fast Inference)

```yaml
- name: CodePress Review
  uses: quantfive/codepress-review@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "fireworks"
    model_name: "accounts/fireworks/models/llama-v3p1-70b-instruct"
    fireworks_api_key: ${{ secrets.FIREWORKS_API_KEY }}
```

#### xAI Grok

```yaml
- name: CodePress Review
  uses: quantfive/codepress-review@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "xai"
    model_name: "grok-beta"
    xai_api_key: ${{ secrets.XAI_API_KEY }}
```

</details>

### With Debug Mode Enabled

```yaml
- name: CodePress Review (Debug)
  uses: quantfive/codepress-review@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "openai"
    model_name: "gpt-5.1"
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    debug: true
    max_turns: 20
    update_pr_description: false
```

### OpenAI with Reasoning Effort

For OpenAI models that support reasoning (like o3, o4-mini), you can control the reasoning effort:

```yaml
- name: CodePress Review (High Reasoning)
  uses: quantfive/codepress-review@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "openai"
    model_name: "o4-mini"
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    reasoning_effort: "high" # none, minimal, low, medium, high
```

### Anthropic with Extended Thinking

For Anthropic Claude models, you can enable extended thinking for deeper analysis:

```yaml
- name: CodePress Review (Claude with Thinking)
  uses: quantfive/codepress-review@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "anthropic"
    model_name: "claude-sonnet-4-5"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    thinking_enabled: true
    thinking_budget: 20000 # Token budget for thinking
```

### Anthropic with Effort Control

For claude-opus-4-5, you can control the overall effort level:

```yaml
- name: CodePress Review (Claude Opus High Effort)
  uses: quantfive/codepress-review@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "anthropic"
    model_name: "claude-opus-4-5"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    anthropic_effort: "high" # low, medium, high
```

### Blocking-Only Mode (Critical Issues Only)

For high-velocity teams or repositories that only want comments on truly blocking issues, you can enable `blocking_only` mode:

```yaml
- name: CodePress Review (Blocking Only)
  uses: quantfive/codepress-review@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "openai"
    model_name: "gpt-5.1"
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    blocking_only: true
```

**What Blocking-Only Mode Does:**

- ✅ **Only generates "required" severity comments** for critical issues that must be fixed before approval
- ❌ **Skips all non-blocking feedback** (praise, optional suggestions, nits, informational notes)
- 🎯 **Focuses on:** Security vulnerabilities, bugs, critical performance issues, breaking changes
- 📉 **Reduces noise** for teams that want minimal, high-signal feedback
- ⚡ **Faster reviews** with fewer API calls and lower costs

**Perfect for:**

- High-velocity development teams
- Code bases with established style and patterns
- Repositories where you primarily want to catch critical issues
- Cost-conscious environments wanting minimal token usage

## File Filtering and Ignore Patterns

CodePress automatically ignores common files that don't need code review (like `node_modules/`, lock files, build artifacts, etc.) and also supports custom ignore patterns through a `.codepressignore` file.

### Default Ignore Patterns

CodePress ships with comprehensive default ignore patterns for all major programming languages and frameworks:

**Frontend/JavaScript:**

- `node_modules/`, `*.lock`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
- `dist/`, `build/`, `.next/`, `.nuxt/`, `coverage/`
- `*.min.js`, `*.min.css`, `*.bundle.js`, `*.chunk.js`

**Backend Languages:**

- **Python**: `__pycache__/`, `*.pyc`, `venv/`, `.venv/`, `*.egg-info/`, `.pytest_cache/`
- **Java**: `*.class`, `*.jar`, `.gradle/`, `.mvn/`, `target/`
- **C#/.NET**: `*.dll`, `*.exe`, `packages/`, `bin/`, `obj/`
- **Ruby**: `*.gem`, `.bundle/`, `vendor/bundle/`
- **Go**: `vendor/`, `*.test`, `go.sum`
- **Rust**: `target/`, `Cargo.lock`

**General:**

- IDE files: `.vscode/`, `.idea/`, `*.swp`
- Logs: `*.log`, `logs/`
- Environment files: `.env`, `.env.*`
- Cache and temp: `.cache/`, `.tmp/`, `.DS_Store`

### Custom Ignore Patterns

Create a `.codepressignore` file in your repository root to add your own ignore patterns:

```gitignore
# .codepressignore

# Don't review generated API documentation
docs/api/
*.generated.ts

# Skip test files if desired
*.test.ts
__tests__/

# Large data files
*.json
data/

# Specific files
README.md
CHANGELOG.md
```

### Include Previously Ignored Files

Use the `!` prefix to force review of files that would otherwise be ignored by defaults:

```gitignore
# Force review of package-lock.json even though lock files are ignored by default
!package-lock.json

# Review specific config files
!webpack.config.js
```

### Example `.codepressignore`

We provide a [`.codepressignore.example`](.codepressignore.example) file showing common patterns you might want to add.

## How It Works

CodePress Review uses an **autonomous AI agent** that has full control over the review process:

1. **Reads PR Context**: Fetches PR description and existing review comments
2. **Analyzes the Diff**: Reviews all changes with full awareness of the codebase
3. **Gathers Additional Context**: Can read files, search code, and analyze dependencies to verify claims
4. **Posts Inline Comments**: Creates line-level feedback directly via GitHub CLI with severity levels:
   - 🔴 **REQUIRED**: Must fix before approval (bugs, security, breaking changes)
   - 🟡 **OPTIONAL**: Suggested improvement (cleaner code, better patterns)
   - 💡 **NIT**: Minor polish (only if pattern is repeated or misleading)
5. **Submits Formal Review**: Approves, requests changes, or comments with a summary of findings

The agent verifies claims before making them - if it says code is "unused" or "missing", it has searched the codebase to confirm.

## Automatic PR Description Generation

CodePress Review can automatically generate well-structured PR descriptions for pull requests that don't already have one. This feature is **enabled by default** and helps maintain consistent documentation across your project.

### How It Works

When analyzing a PR, CodePress will:

1. **Check Current Description**: Only updates PRs with blank or empty descriptions
2. **Generate Content**: Creates a structured description including:
   - Brief summary of what the PR accomplishes
   - Bulleted list of key changes
   - Notable considerations for reviewers
   - Proper markdown formatting
3. **Smart Updates**: Won't overwrite existing descriptions to preserve manual content

### Example Generated Description

```markdown
## Add User Authentication Service

This PR introduces a new authentication service to handle user login and session management.

**Key Changes:**

- Added AuthService class with JWT token handling
- Integrated authentication middleware for protected routes
- Added user session management and logout functionality
- Updated API endpoints to require authentication

**Review Notes:**

- Please verify the JWT token validation logic
- Ensure proper error handling for invalid credentials
- Check that session cleanup works correctly on logout
```

### Configuration

The feature is controlled by the `update_pr_description` parameter:

```yaml
- name: CodePress Review
  uses: quantfive/codepress-review@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "openai"
    model_name: "gpt-5.1"
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    update_pr_description: "true" # Enable (default)
    # update_pr_description: "false"  # Disable
```

#### Large PR Processing

- Very large PRs may hit token limits or timeout
- Consider using `.codepressignore` to exclude generated files, `.codepressignore` follows `.gitignore` conventions

### Custom Description Guidelines

PR descriptions are generated by the autonomous agent based on its analysis of the diff. The agent will create structured descriptions that include a summary and key changes when the PR description is blank.

## Custom Review Guidelines

CodePress supports two ways to customize review behavior:

| File | Behavior | Use Case |
|------|----------|----------|
| `codepress-review-rules.md` | **Adds** rules to defaults | Add project-specific rules while keeping defaults |
| `custom-codepress-review-prompt.md` | **Replaces** defaults entirely | Full control over review guidelines |

### Adding Project-Specific Rules (Recommended)

Create a `codepress-review-rules.md` file in your repository root to add rules **on top of** the default guidelines:

```markdown
## Security
- All database queries must use parameterized statements
- API keys must never be hardcoded
- User input must be validated before use

## Architecture
- Services should not directly import from other service modules
- All API endpoints must have rate limiting

## Testing
- All public functions require unit tests
- Integration tests required for API endpoints
```

These rules are appended to the default guidelines. **When your rules conflict with the defaults, your project-specific rules take precedence.**

### Replacing All Guidelines

If you need full control, create a `custom-codepress-review-prompt.md` file to **replace** the entire default guidelines:

```markdown
# My Custom Review Guidelines

You are a code reviewer focusing on:

- Security vulnerabilities and best practices
- Performance optimization opportunities
- Code maintainability and readability
- Proper error handling

Use these severity levels:

- **required**: Critical issues that must be fixed
- **optional**: Suggestions for improvement
- **nit**: Minor style or polish issues
- **fyi**: Informational notes
```

### Example Custom Guidelines

#### Security-Focused Review

```markdown
# Security-Focused Code Review

You are a security expert reviewing code for vulnerabilities. Focus on:

## Security Priorities

- Authentication and authorization issues
- Input validation and sanitization
- SQL injection, XSS, and CSRF vulnerabilities
- Sensitive data exposure
- Cryptographic implementations
- Third-party dependency vulnerabilities

## Severity Guidelines

- **required**: Critical security vulnerabilities that expose the system to attack
- **optional**: Security improvements that enhance the overall security posture
- **nit**: Minor security polish (logging, error messages)
- **fyi**: Security-related information for future consideration

Always explain the potential impact of security issues and provide concrete remediation steps.
```

#### Performance-Focused Review

```markdown
# Performance-Focused Code Review

You are a performance optimization expert. Review this code for:

## Performance Areas

- Inefficient algorithms and data structures
- Memory leaks and excessive allocations
- Database query optimization opportunities
- Caching and batching improvements
- Network request optimization
- Unnecessary computations or iterations

## Guidelines

- Provide concrete performance improvements with estimated impact
- Suggest specific optimizations with code examples
- Identify potential bottlenecks and scaling issues
- Focus on measurable improvements

Use **required** for critical performance issues, **optional** for optimizations.
```

#### Beginner-Friendly Review

```markdown
# Beginner-Friendly Code Review

You are a patient mentor reviewing code from a junior developer. Your feedback should be:

## Mentoring Approach

- Educational and encouraging
- Explain the "why" behind suggestions
- Include code examples when helpful
- Focus on learning opportunities
- Provide resources for further learning

## Tone Guidelines

- Use positive, constructive language
- Acknowledge good practices when you see them
- Offer alternatives rather than just pointing out problems
- Encourage best practices without being overwhelming

Prefer **optional** for learning opportunities, **nit** for style, **fyi** for educational notes.
```

## Debugging and Troubleshooting

### Debug Mode

When troubleshooting issues or developing locally, you can enable detailed debug logging:

```yaml
- name: CodePress Review
  uses: quantfive/codepress-review@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "openai"
    model_name: "gpt-5.1"
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    debug: true # Enable detailed logging
```

**Debug mode provides:**

- Detailed agent workflow logs
- Tool calls and their results (bash commands, dependency graphs)
- Turn-by-turn progress tracking
- GitHub CLI command outputs
- Error stack traces and context

**Note:** Debug mode significantly increases log output. Only enable when troubleshooting specific issues. Always disable in production to keep action logs clean.

### Common Issues

#### Reviews Not Appearing

1. Check that the action has `pull-requests: write` permission
2. Verify the correct API key is provided for your model provider
3. Enable debug mode to see detailed error logs

#### Rate Limiting

- CodePress automatically handles GitHub API rate limits with exponential backoff
- For high-volume repositories, consider using a dedicated PAT with higher rate limits
- Debug mode shows rate limit details and retry attempts

## Cost & Performance Caveats

- LLM usage may incur costs depending on provider/model.
- Review time and cost scale with diff size and model selection.

## Fork Safety

If you want to run this bot on PRs from forks, use `pull_request_target` instead of `pull_request` in your workflow trigger. **Warning:** This exposes repository secrets to forked PRs. For maximum safety, use a low-privilege Personal Access Token (PAT) with only `pull-requests: write` and `contents: read` scopes, and store it as a secret (e.g., `REVIEW_BOT_TOKEN`).

Update the workflow:

```yaml
on:
  pull_request_target:
    types: [opened, reopened, synchronize]
```

And set:

```yaml
env:
  GITHUB_TOKEN: ${{ secrets.REVIEW_BOT_TOKEN }}
```

## Version Comparison

### v4 (Current) - Autonomous Agent Architecture

CodePress Review v4 introduces a fully **autonomous agent** that takes complete control of the review process:

- **🤖 Autonomous Actions**: Agent posts comments and submits reviews directly via GitHub CLI
- **✅ Formal PR Reviews**: Submits approve/request-changes/comment decisions with detailed summaries
- **🔍 Smart Verification**: Verifies claims by searching the codebase before commenting
- **📊 Dependency Analysis**: Built-in tools to analyze import/export relationships
- **🎯 Context-Aware**: Reads full files and explores code to understand changes deeply
- **💬 Direct Feedback**: No intermediate formats - comments go straight to GitHub

**Key Benefits of v4:**

- Submits formal PR reviews (approve/request changes) with summaries
- Agent posts comments directly - no parsing or intermediate steps
- Eliminates false positives by verifying claims before making them
- Provides deeper architectural insights through code exploration

### v1 (Legacy) - Static Diff Review

CodePress Review v1 uses a traditional static approach:

- **📝 Diff-Only Analysis**: Reviews only the visible diff chunks without additional context
- **🚀 Faster Processing**: Single-pass review with no additional API calls
- **💰 Lower Cost**: Minimal token usage per review
- **⚠️ Limited Context**: May miss relationships between files or make assumptions about missing code

**When to Use v1:**

- Cost-sensitive environments where minimal token usage is priority
- Simple codebases where diff context is usually sufficient

### Migration Guide

```yaml
# For v4 (recommended - autonomous agent)
uses: quantfive/codepress-review@v4

# For v1 (legacy - static diff review)
uses: quantfive/codepress-review@v1
```

## Technical Architecture

This project uses the [OpenAI Agents SDK](https://github.com/openai/openai-agents-js) with [Vercel AI SDK](https://ai-sdk.dev/docs/introduction) for **universal LLM provider support**. The system:

- **Autonomous Agent**: Single agent with full control over the review process
- **GitHub CLI Integration**: Agent posts comments and reviews directly via `gh` CLI commands
- **Universal Provider Support**: 11+ LLM providers through unified AI SDK interface
- **Self-Hosted Compatibility**: Support for OpenAI-compatible APIs and Ollama instances
- **Agent Tools**:
  - `bash`: Execute shell commands (gh CLI, file reading, code search with ripgrep)
  - `dep_graph`: Analyze import/export relationships between files
- **Severity System**: 🔴 REQUIRED, 🟡 OPTIONAL, 💡 NIT with clear guidelines
- **Formal Reviews**: Agent submits approve/request-changes/comment decisions
- **Turn Budget**: Configurable maximum turns for cost control
- **File-Based Customization**: Additive rules via `codepress-review-rules.md` or full replacement via `custom-codepress-review-prompt.md`
- **Provider Configuration**: Automatic API key detection and provider-specific configuration
