# CodePress Review - Trigger Configuration

## Overview

CodePress Review v2+ includes built-in trigger logic, making it much easier to configure when your AI reviews should run. Instead of maintaining complex workflow conditions, you can now simply configure the action inputs to control when reviews are triggered.

## Migration from v1

### Before (v1 - Complex Workflow)

```yaml
# Old approach - complex workflow logic
jobs:
  ai-review:
    runs-on: ubuntu-latest
    env:
      IS_PR_OPENED_OR_REOPENED: ${{ github.event_name == 'pull_request' && (github.event.action == 'opened' || github.event.action == 'reopened') }}
      IS_REVIEW_REQUESTED_FROM_BOT: ${{ github.event_name == 'pull_request' && github.event.action == 'review_requested' && github.event.requested_reviewer.login == 'github-actions[bot]' }}
      IS_MANUAL_DISPATCH: ${{ github.event_name == 'workflow_dispatch' }}
      IS_COMMENT_TRIGGER: ${{ github.event_name == 'issue_comment' && github.event.issue.pull_request && contains(github.event.comment.body, '@codepress/review') }}
    if: |
      ${{
        env.IS_PR_OPENED_OR_REOPENED == 'true' ||
        env.IS_REVIEW_REQUESTED_FROM_BOT == 'true' ||
        env.IS_MANUAL_DISPATCH == 'true' ||
        env.IS_COMMENT_TRIGGER == 'true'
      }}
    steps:
      - uses: quantfive/codepress-review@v1
```

### After (v2+ - Simple Configuration)

```yaml
# New approach - just works with sensible defaults!
jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - name: CodePress Review
        uses: quantfive/codepress-review@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          model_provider: "openai"
          model_name: "o4-mini"
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          # All trigger configurations use sensible defaults
```

## Configuration Options

| Input                     | Description                                                     | Default               | Example         |
| ------------------------- | --------------------------------------------------------------- | --------------------- | --------------- |
| `run_on_pr_opened`        | Run review when PR is opened                                    | `true`                | `true`/`false`  |
| `run_on_pr_reopened`      | Run review when PR is reopened                                  | `true`                | `true`/`false`  |
| `run_on_review_requested` | Run review when re-review is requested from github-actions[bot] | `true`                | `true`/`false`  |
| `run_on_comment_trigger`  | Run review when comments contain trigger phrase                 | `true`                | `true`/`false`  |
| `comment_trigger_phrase`  | Phrase that triggers review in comments                         | `"@codepress/review"` | `"@bot review"` |

## Workflow Event Requirements

Your workflow must still listen to GitHub events (this is a GitHub Actions requirement), but you can now use a **simple, universal setup** that covers all possible triggers:

```yaml
# Simple universal setup - works for all configurations
on:
  pull_request:
    types: [opened, reopened, review_requested, synchronize]
  issue_comment:
    types: [created]
  workflow_dispatch:
```

**Event Types Explained:**

- `opened` - Review when PR is first created
- `reopened` - Review when PR is reopened
- `review_requested` - Review when re-review requested from github-actions[bot]
- `synchronize` - Review when new commits are pushed to PR (optional - remove if you don't want reviews on every commit)
- `issue_comment` - Review when comments contain trigger phrase
- `workflow_dispatch` - Allow manual triggering

**Why can't we eliminate this?** GitHub needs to know which events should start your workflow before it runs any code. The `on:` section is GitHub's event subscription system - without it, your workflow never starts.

**The good news:** You can use the same `on:` section for any configuration. Our action handles all the smart filtering internally.

## What We've Achieved vs. Alternatives

### ✅ What We Built (Best Approach)

```yaml
# User's workflow - incredibly simple!
on:
  pull_request:
    types: [opened, reopened, review_requested, synchronize]
  issue_comment:
    types: [created]
  workflow_dispatch:

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - uses: quantfive/codepress-review@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          model_provider: "openai"
          model_name: "o4-mini"
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          # That's it! Everything else uses great defaults
```

### ❌ Alternative: Composite Actions (More Complex)

```yaml
# We could create a composite action, but users would still need:
on:
  pull_request:
  # ... same events
jobs:
  ai-review:
    uses: quantfive/codepress-review/.github/workflows/review.yml@v2
    # This is actually more complex for users
```

### ❌ Alternative: Multiple Actions (Confusing)

```yaml
# We could create separate actions per trigger type, but then:
- uses: quantfive/codepress-review-pr@v2 # For PR events
- uses: quantfive/codepress-review-comment@v2 # For comments
# This would be much worse UX
```

**Our approach is optimal** - minimal workflow complexity with maximum flexibility through action inputs.

## Common Configurations

### Conservative (Default)

Only run on PR events and manual comment triggers:

```yaml
run_on_pr_opened: true
run_on_pr_reopened: true
run_on_review_requested: true
run_on_comment_trigger: true
```

### Review on Every Commit

Add `synchronize` to your workflow events to review every commit:

```yaml
# In your workflow's on: section
pull_request:
  types: [opened, reopened, review_requested, synchronize]
```

### Comment-Only

Only run when explicitly requested:

```yaml
run_on_pr_opened: false
run_on_pr_reopened: false
run_on_review_requested: true
run_on_comment_trigger: true
```

## How It Works

1. **Event Capture**: Your workflow listens to GitHub events as usual
2. **Smart Filtering**: The action internally checks the event details against your configuration
3. **Early Exit**: If the current event doesn't match your trigger settings, the action exits gracefully with a log message
4. **Execution**: If the event matches, the action proceeds with the AI review

## Benefits

- ✅ **Simpler workflows** - No complex conditions in YAML
- ✅ **Centralized logic** - All trigger logic is maintained in the action
- ✅ **Easy updates** - Action updates automatically improve trigger logic
- ✅ **Clear configuration** - Self-documenting input parameters
- ✅ **Flexible** - Easy to enable/disable specific triggers

## Debug Mode

Enable debug mode to see detailed logs about trigger decisions:

```yaml
debug: true
```

This will log messages like:

- `"Running review: PR was opened"`
- `"Skipping review: PR opened trigger is disabled"`
- `"Running review: Comment contains trigger phrase: @codepress/review"`
