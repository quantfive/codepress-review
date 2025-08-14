"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_IGNORE_PATTERNS = exports.CODEPRESS_REVIEW_TAG = void 0;
exports.isCodePressReview = isCodePressReview;
exports.isCodePressReviewObject = isCodePressReviewObject;
exports.isCodePressCommentObject = isCodePressCommentObject;
/**
 * CodePress review identifiers and constants
 */
exports.CODEPRESS_REVIEW_TAG = "CodePress Review";
/**
 * Check if a review or comment is from CodePress
 */
function isCodePressReview(content) {
    return content?.includes(exports.CODEPRESS_REVIEW_TAG) ?? false;
}
/**
 * Check if a review object is from CodePress
 */
function isCodePressReviewObject(review) {
    return isCodePressReview(review.body);
}
/**
 * Check if a comment object is from CodePress
 */
function isCodePressCommentObject(comment) {
    return isCodePressReview(comment.body);
}
/**
 * Default ignore patterns that ship with CodePress.
 * Users can override these by creating their own .codepressignore file.
 */
exports.DEFAULT_IGNORE_PATTERNS = [
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
//# sourceMappingURL=constants.js.map