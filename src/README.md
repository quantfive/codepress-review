# AI Review Service

A modular TypeScript application for AI-powered code review that posts comments to GitHub pull requests.

## Architecture

The application has been refactored into a modular structure for better maintainability:

### Core Modules

- **`types.ts`** - Central type definitions for the entire application
- **`config.ts`** - Configuration handling and environment variable management
- **`diff-parser.ts`** - Diff parsing and splitting logic
- **`xml-parser.ts`** - XML response parsing and line number resolution
- **`ai-client.ts`** - AI model interaction and retry logic
- **`github-client.ts`** - GitHub API interactions
- **`review-service.ts`** - Main orchestration service
- **`ai-review.ts`** - Entry point and CLI interface

### Key Improvements

1. **Separation of Concerns**: Each module has a single responsibility
2. **Type Safety**: Centralized type definitions with proper interfaces
3. **Configuration Management**: Centralized environment variable handling
4. **Error Handling**: Consistent error handling patterns
5. **Testability**: Modular design makes unit testing easier
6. **Maintainability**: Smaller, focused modules are easier to understand and modify

### Usage

```bash
ts-node src/ai-review.ts --diff <diff-file> --pr <pr-number>
```

### Environment Variables

- `MODEL_PROVIDER`: AI model provider (openai, anthropic, gemini)
- `MODEL_NAME`: Specific model name
- `OPENAI_API_KEY`: OpenAI API key (if using OpenAI)
- `ANTHROPIC_API_KEY`: Anthropic API key (if using Anthropic)
- `GEMINI_API_KEY`: Google Gemini API key (if using Gemini)
- `GITHUB_TOKEN`: GitHub personal access token
- `GITHUB_REPOSITORY`: Repository in format "owner/repo"
- `CUSTOM_PROMPT`: Optional custom prompt for AI review

### Extension Points

The modular architecture makes it easy to:

- Add new AI providers by extending the `ai-client.ts`
- Customize XML parsing logic in `xml-parser.ts`
- Add new output formats by extending `github-client.ts`
- Modify diff processing in `diff-parser.ts`
- Add new configuration sources in `config.ts`

### Development

When making changes to the source code:

1. **Build the project**: `npm run build`
2. **Check types**: `npm run type-check`
3. **Lint code**: `npm run lint`
4. **Verify dist is up-to-date**: `npm run check-dist`

**Important**: The `dist/` folder is committed to the repository for GitHub Actions compatibility. Always run `npm run build` after making changes and commit the updated `dist/` files.

### Build Process

The build process:

1. Compiles TypeScript to JavaScript (`tsc`)
2. Bundles everything into a single file using `ncc`
3. Generates source maps for debugging
4. Creates `dist/index.js` which is the entry point for the GitHub Action
