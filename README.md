<img height="50" alt="codepress-logo-larger" src="https://github.com/user-attachments/assets/d74bcba3-a2ee-435e-85cf-f3c6813815f4" />

# CodePress Review


A turnkey GitHub Action for automatic, inline code review on every Pull Request using LLMs (OpenAI, Anthropic, Google Gemini, etc.).

## Features

- 🤖 **AI-Powered Reviews**: Use GPT-4, Claude, or Gemini to power your PRs
- 🔑 **BYOK + OS**: 100% open source. Install as a github action, and use your own key
- 💬 **Inline Comments**: Posts line-level feedback directly on PRs
- 📄 **Smart PR Descriptions**: Automatically generates structured PR descriptions for blank PRs
- 🔄 **Provider Agnostic**: Easily switch between OpenAI, Anthropic, Google
- 📝 **Smart Chunking**: Handles large diffs efficiently
- 🛡️ **Robust**: Built-in retries, rate limiting, and error handling
- ⚡ **Zero Setup**: Just add to your github action workflows
- 🎯 **Customizable**: Use custom review guidelines via configuration file

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
      - name: CodePress Review
        uses: quantfive/codepress-review@v2
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          model_provider: "openai"
          model_name: "o4-mini"
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          # All trigger configurations use sensible defaults
          # + synchronize event runs automatically when included in workflow
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

| Input                     | Required | Default               | Description                                                  |
| ------------------------- | -------- | --------------------- | ------------------------------------------------------------ |
| `github_token`            | ✅       | `${{ github.token }}` | GitHub token for API access                                  |
| `model_provider`          | ✅       | `openai`              | AI provider: `openai`, `anthropic`, `gemini`                 |
| `model_name`              | ✅       | `gpt-4o`              | Model name (see examples below)                              |
| `openai_api_key`          | ⚠️       |                       | Required if using OpenAI                                     |
| `anthropic_api_key`       | ⚠️       |                       | Required if using Anthropic                                  |
| `gemini_api_key`          | ⚠️       |                       | Required if using Google                                     |
| `max_turns`               | ❌       | `12`                  | Maximum turns for interactive agent review                   |
| `update_pr_description`   | ❌       | `true`                | Auto-generate PR descriptions for blank PRs                  |
| `debug`                   | ❌       | `false`               | Enable debug mode for detailed console logs                  |
| `run_on_pr_opened`        | ❌       | `true`                | Run review when PR is opened                                 |
| `run_on_pr_reopened`      | ❌       | `true`                | Run review when PR is reopened                               |
| `run_on_review_requested` | ❌       | `true`                | Run review when re-review requested from github-actions[bot] |
| `run_on_comment_trigger`  | ❌       | `true`                | Run review when comments contain trigger phrase              |
| `comment_trigger_phrase`  | ❌       | `"@codepress/review"` | Phrase that triggers review in comments                      |

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
          fetch-depth: 0
          ref: ${{ github.event.issue.pull_request && format('refs/pull/{0}/head', github.event.issue.number) || github.ref }}

      - name: CodePress Review
        uses: quantfive/codepress-review@v2
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          model_provider: "openai"
          model_name: "gpt-4o"
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          # Comment triggers are enabled by default
          # run_on_comment_trigger: true  # Default
          # comment_trigger_phrase: "@codepress/review"  # Default
```

**To disable comment triggers:**

```yaml
- name: CodePress Review
  uses: quantfive/codepress-review@v2
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "openai"
    model_name: "gpt-4o"
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    run_on_comment_trigger: false  # Disable comment triggers
```

**To customize the trigger phrase:**

```yaml
- name: CodePress Review
  uses: quantfive/codepress-review@v2
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "openai"
    model_name: "gpt-4o"
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    comment_trigger_phrase: "please review"  # Custom trigger phrase
```

### Manually from the Actions Tab

With `workflow_dispatch` enabled in your workflow file (as shown above), you can manually trigger a review for any branch:

1.  Navigate to your repository's **Actions** tab.
2.  Select the **CodePress Review** workflow from the list.
3.  Click the **Run workflow** dropdown.
4.  Choose the branch you want to review and click **Run workflow**.

The action will automatically find the open pull request associated with that branch and run the review.

## Examples

### OpenAI GPT-4o

```yaml
- name: CodePress Review
  uses: quantfive/codepress-review@v2
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "openai"
    model_name: "o4-mini"
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
```

### With Debug Mode Enabled

```yaml
- name: CodePress Review (Debug)
  uses: quantfive/codepress-review@v2
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "openai"
    model_name: "gpt-4o"
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    debug: true
    max_turns: 20
    update_pr_description: false
```

### Anthropic Claude

```yaml
- name: CodePress Review
  uses: quantfive/codepress-review@v2
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "anthropic"
    model_name: "claude-4-sonnet-20250514"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Google Gemini

```yaml
- name: CodePress Review
  uses: quantfive/codepress-review@v2
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "gemini"
    model_name: "gemini-2.5-pro-preview-06-05"
    gemini_api_key: ${{ secrets.GEMINI_API_KEY }}
```

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
  uses: quantfive/codepress-review@v2
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "openai"
    model_name: "gpt-4o"
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    update_pr_description: "true" # Enable (default)
    # update_pr_description: "false"  # Disable
```

#### Large PR Processing

- Very large PRs may hit token limits or timeout
- Consider using `.codepressignore` to exclude generated files, `.codepressignore` follows `.gitignore` conventions

### Custom Description Guidelines

You can customize PR description generation by modifying the summary guidelines in your `custom-codepress-summary-prompt.md` file. The AI will use your custom instructions when generating descriptions.

## Custom Review Guidelines

You can customize the review behavior by creating a `custom-codepress-review-prompt.md` file in the root of your repository. If this file exists, CodePress will use your custom guidelines instead of the default ones.

### Creating Custom Guidelines

Create a file named `custom-codepress-review-prompt.md` in your repository root:

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

### Custom Summarization Guidelines

You can also customize the initial diff summarization by creating a `custom-codepress-summary-prompt.md` file in your repository root. This allows you to tailor how CodePress analyzes and summarizes your pull requests.

#### Creating Custom Summary Guidelines

Create a file named `custom-codepress-summary-prompt.md` in your repository root:

```markdown
# Custom PR Summary Guidelines

You are analyzing a complete pull request. Focus on:

## Analysis Priorities

- API design and breaking changes
- Cross-service dependencies
- Database migration impacts
- Performance implications at scale
- Security considerations in architectural changes

## Classification Guidelines

- Classify the PR type accurately: feature | bugfix | refactor | docs | test | chore | dependency-bump | mixed
- Identify key architectural concerns that reviewers should be aware of
- Highlight any risks that span multiple files or components

## Output Focus

- Provide concise, actionable insights for individual chunk reviewers
- Flag cross-cutting concerns that might not be obvious from individual file changes
- Emphasize testing strategies for complex changes
```

## Debugging and Troubleshooting

### Debug Mode

When troubleshooting issues or developing locally, you can enable detailed debug logging:

```yaml
- name: CodePress Review
  uses: quantfive/codepress-review@v2
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    model_provider: "openai"
    model_name: "gpt-4o"
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    debug: true # Enable detailed logging
```

**Debug mode provides:**

- Detailed processing logs for each diff chunk
- Raw AI model responses before parsing
- Rate limiting and retry information
- GitHub API call details
- Agent interaction logs (v2 only)
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

### v2 (Current) - Interactive Agent Architecture

CodePress Review v2 introduces a sophisticated **interactive agent system** powered by OpenAI's agents framework:

- **🤖 Interactive Tools**: Agent can fetch additional file context, analyze dependencies, and explore code relationships
- **🔍 Smart Context Gathering**: When reviewing diffs, the agent can request full file contents or specific code snippets for better understanding
- **📊 Dependency Analysis**: Built-in tools to analyze import/export relationships and project structure
- **🎯 Context-Aware Reviews**: No more false positives from missing context - the agent sees the full picture
- **⚡ Adaptive Processing**: Agent determines when additional context is needed and fetches it automatically

**Key Benefits of v2:**

- Eliminates incorrect comments about "missing" code that exists outside diff chunks
- Provides more accurate reviews by understanding full file context
- Reduces false positives for unused imports, missing migrations, etc.
- Offers deeper architectural insights through dependency analysis

### v1 (Legacy) - Static Diff Review

CodePress Review v1 uses a traditional static approach:

- **📝 Diff-Only Analysis**: Reviews only the visible diff chunks without additional context
- **🚀 Faster Processing**: Single-pass review with no additional API calls
- **💰 Lower Cost**: Minimal token usage per review
- **⚠️ Limited Context**: May miss relationships between files or make assumptions about missing code

**When to Use v1:**

- Cost-sensitive environments where minimal token usage is priority
- Simple codebases where diff context is usually sufficient
- Legacy workflows that don't require advanced context analysis

### Migration Guide

To use v1 instead of v2, simply change the version in your workflow:

```yaml
# For v2 (recommended - interactive agent)
uses: quantfive/codepress-review@v2

# For v1 (legacy - static diff review)
uses: quantfive/codepress-review@v1
```

**Note:** v2 is the recommended version for most use cases due to its superior accuracy and context awareness.

## Technical Architecture

This project uses the [Vercel AI SDK](https://ai-sdk.dev/docs/introduction) (`ai` package) for all LLM providers. The system:

- **Clean TypeScript Functions**: System prompts managed in `src/system-prompt.ts`
- **Proper Message Structure**: Uses system prompt for guidelines + user prompt for diff content
- **Preserved Response Format**: Always includes XML `<responseFormat>` regardless of custom prompts
- **Structured XML Output**: Parses XML responses for rich comment formatting
- **Severity System**: `required`, `optional`, `nit`, `fyi` with emoji indicators
- **Hunk-Based Processing**: Each diff hunk processed individually for focused reviews
- **Line Resolution**: Handles line number mapping from diff context
- **File-Based Customization**: Custom review guidelines from `custom-codepress-review-prompt.md` and summary guidelines from `custom-codepress-summary-prompt.md`
- **Interactive Agent Tools** (v2): `fetch_file`, `fetch_snippet`, and `dep_graph` for enhanced context gathering
