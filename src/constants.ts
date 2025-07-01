/**
 * CodePress review identifiers and constants
 */
export const CODEPRESS_REVIEW_TAG = "CodePress Review" as const;

/**
 * Check if a review or comment is from CodePress
 */
export function isCodePressReview(content: string | null | undefined): boolean {
  return content?.includes(CODEPRESS_REVIEW_TAG) ?? false;
}

/**
 * Check if a review object is from CodePress
 */
export function isCodePressReviewObject(review: {
  body?: string | null;
}): boolean {
  return isCodePressReview(review.body);
}

/**
 * Check if a comment object is from CodePress
 */
export function isCodePressCommentObject(comment: {
  body?: string | null;
}): boolean {
  return isCodePressReview(comment.body);
}

/**
 * Default ignore patterns that ship with CodePress.
 * Users can override these by creating their own .codepressignore file.
 */
export const DEFAULT_IGNORE_PATTERNS = [
  // Dependencies and lock files
  "node_modules/",
  "*.lock",
  "yarn.lock",
  "package-lock.json",
  "pnpm-lock.yaml",
  "composer.lock",
  "Pipfile.lock",
  "poetry.lock",
  "Gemfile.lock",
  "go.sum",
  "cargo.lock",

  // Build outputs and artifacts
  "dist/",
  "build/",
  "out/",
  "target/",
  "bin/",
  "obj/",
  ".next/",
  ".nuxt/",
  ".vuepress/dist/",
  ".docusaurus/",
  "coverage/",
  "*.min.js",
  "*.min.css",

  // Cache and temporary files
  ".cache/",
  ".tmp/",
  "tmp/",
  "temp/",
  "*.tmp",
  "*.temp",
  ".DS_Store",
  "Thumbs.db",

  // IDE and editor files
  ".vscode/",
  ".idea/",
  "*.swp",
  "*.swo",
  "*~",
  ".project",
  ".classpath",

  // Logs
  "*.log",
  "logs/",
  "npm-debug.log*",
  "yarn-debug.log*",
  "yarn-error.log*",

  // Environment and config files (often contain secrets)
  ".env",
  ".env.*",
  "*.key",
  "*.pem",
  "*.p12",
  "*.pfx",
  "config.json",
  "secrets.json",

  // Frontend specific
  "public/assets/",
  "static/assets/",
  "assets/vendor/",
  "vendor/",
  "*.bundle.js",
  "*.chunk.js",

  // Backend specific
  "__pycache__/",
  "*.pyc",
  "*.pyo",
  "*.pyd",
  ".pytest_cache/",
  ".tox/",
  "venv/",
  ".venv/",
  "env/",
  ".env/",
  "virtualenv/",
  ".virtualenv/",
  "site-packages/",
  "*.egg-info/",
  ".mypy_cache/",
  ".ruff_cache/",

  // Java/JVM
  "*.class",
  "*.jar",
  "*.war",
  "*.ear",
  "*.sar",
  "*.rar",
  ".gradle/",
  "gradle/",
  ".mvn/",
  "mvnw",
  "mvnw.cmd",

  // .NET
  "*.dll",
  "*.exe",
  "*.pdb",
  "*.user",
  "*.cache",
  "packages/",
  "TestResults/",

  // Ruby
  "*.gem",
  ".bundle/",
  "vendor/bundle/",
  ".yardoc/",
  "_yardoc/",
  "doc/",
  ".sass-cache/",

  // Go
  "vendor/",
  "*.test",
  "*.prof",

  // Rust
  "target/",
  "Cargo.lock",

  // Database files
  "*.db",
  "*.sqlite",
  "*.sqlite3",

  // Compressed files
  "*.zip",
  "*.tar.gz",
  "*.tgz",
  "*.rar",
  "*.7z",

  // Documentation build outputs
  "_book/",
  "_site/",
  ".jekyll-cache/",
  ".jekyll-metadata",
  ".docusaurus/",
  "docs/.vuepress/dist/",
];
