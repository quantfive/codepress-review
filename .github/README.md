# GitHub Actions Workflows

## Build Branch Strategy

This repository uses a separate `build` branch to keep the main branch clean while still providing built artifacts for GitHub Actions.

### How it works:

1. **Main Branch**: Contains source code only. The `dist/` folder is gitignored.
2. **Build Branch**: Automatically updated via GitHub Actions with the compiled `dist/` folder.

### Workflows:

- **`build-branch.yml`**: Triggers on pushes to main. Builds the project and pushes the `dist/` folder to the `build` branch.
- **`codepress-review.yml`**: The main action workflow that runs on pull requests.

### Using the Action:

When this action is published to the GitHub Marketplace, users will reference the `build` branch:

```yaml
- name: CodePress Review
  uses: quantfive/codepress-review@v1 # or @v1 if you tag the build branch
```

### Local Development:

- The pre-commit hook runs `npm run build` to validate the build works
- The `dist/` folder is not committed to your local main branch
- All built artifacts are automatically handled by the CI/CD pipeline
