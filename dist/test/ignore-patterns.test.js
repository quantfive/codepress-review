"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ignore_1 = __importDefault(require("ignore"));
const constants_1 = require("../src/constants");
describe("Ignore Patterns", () => {
    describe("Default Ignore Patterns", () => {
        let ig;
        beforeEach(() => {
            ig = (0, ignore_1.default)().add(constants_1.DEFAULT_IGNORE_PATTERNS);
        });
        test("should ignore common lock files", () => {
            expect(ig.ignores("yarn.lock")).toBe(true);
            expect(ig.ignores("package-lock.json")).toBe(true);
            expect(ig.ignores("pnpm-lock.yaml")).toBe(true);
            expect(ig.ignores("composer.lock")).toBe(true);
            expect(ig.ignores("Pipfile.lock")).toBe(true);
            expect(ig.ignores("poetry.lock")).toBe(true);
            expect(ig.ignores("Gemfile.lock")).toBe(true);
            expect(ig.ignores("go.sum")).toBe(true);
            expect(ig.ignores("Cargo.lock")).toBe(true);
        });
        test("should ignore node_modules and dependencies", () => {
            expect(ig.ignores("node_modules/")).toBe(true);
            expect(ig.ignores("node_modules/react/index.js")).toBe(true);
            expect(ig.ignores("vendor/")).toBe(true);
            expect(ig.ignores("vendor/bundle/gem.rb")).toBe(true);
        });
        test("should ignore build outputs and artifacts", () => {
            expect(ig.ignores("dist/")).toBe(true);
            expect(ig.ignores("dist/bundle.js")).toBe(true);
            expect(ig.ignores("build/")).toBe(true);
            expect(ig.ignores("build/app.js")).toBe(true);
            expect(ig.ignores("out/")).toBe(true);
            expect(ig.ignores("target/")).toBe(true);
            expect(ig.ignores("bin/")).toBe(true);
            expect(ig.ignores("obj/")).toBe(true);
            expect(ig.ignores(".next/")).toBe(true);
            expect(ig.ignores(".nuxt/")).toBe(true);
            expect(ig.ignores("coverage/")).toBe(true);
        });
        test("should ignore minified files", () => {
            expect(ig.ignores("app.min.js")).toBe(true);
            expect(ig.ignores("styles.min.css")).toBe(true);
            expect(ig.ignores("bundle.min.js")).toBe(true);
            expect(ig.ignores("vendor.chunk.js")).toBe(true);
            expect(ig.ignores("main.bundle.js")).toBe(true);
        });
        test("should ignore Python-specific files", () => {
            expect(ig.ignores("__pycache__/")).toBe(true);
            expect(ig.ignores("__pycache__/module.pyc")).toBe(true);
            expect(ig.ignores("script.pyc")).toBe(true);
            expect(ig.ignores("module.pyo")).toBe(true);
            expect(ig.ignores("extension.pyd")).toBe(true);
            expect(ig.ignores(".pytest_cache/")).toBe(true);
            expect(ig.ignores(".tox/")).toBe(true);
            expect(ig.ignores("venv/")).toBe(true);
            expect(ig.ignores(".venv/")).toBe(true);
            expect(ig.ignores("virtualenv/")).toBe(true);
            expect(ig.ignores("site-packages/")).toBe(true);
            expect(ig.ignores("mypackage.egg-info/")).toBe(true);
            expect(ig.ignores(".mypy_cache/")).toBe(true);
            expect(ig.ignores(".ruff_cache/")).toBe(true);
        });
        test("should ignore Java/JVM files", () => {
            expect(ig.ignores("App.class")).toBe(true);
            expect(ig.ignores("library.jar")).toBe(true);
            expect(ig.ignores("app.war")).toBe(true);
            expect(ig.ignores("service.ear")).toBe(true);
            expect(ig.ignores(".gradle/")).toBe(true);
            expect(ig.ignores("gradle/")).toBe(true);
            expect(ig.ignores(".mvn/")).toBe(true);
            expect(ig.ignores("mvnw")).toBe(true);
            expect(ig.ignores("mvnw.cmd")).toBe(true);
        });
        test("should ignore .NET files", () => {
            expect(ig.ignores("assembly.dll")).toBe(true);
            expect(ig.ignores("program.exe")).toBe(true);
            expect(ig.ignores("debug.pdb")).toBe(true);
            expect(ig.ignores("project.user")).toBe(true);
            expect(ig.ignores("temp.cache")).toBe(true);
            expect(ig.ignores("packages/")).toBe(true);
            expect(ig.ignores("TestResults/")).toBe(true);
        });
        test("should NOT ignore regular source files", () => {
            expect(ig.ignores("src/index.ts")).toBe(false);
            expect(ig.ignores("components/Button.tsx")).toBe(false);
            expect(ig.ignores("utils/helper.js")).toBe(false);
            expect(ig.ignores("styles/main.css")).toBe(false);
            expect(ig.ignores("README.md")).toBe(false);
            expect(ig.ignores("package.json")).toBe(false);
            expect(ig.ignores("tsconfig.json")).toBe(false);
            expect(ig.ignores("webpack.config.js")).toBe(false);
        });
    });
    describe("User Unignore Patterns", () => {
        test("should allow users to unignore default patterns with ! prefix", () => {
            const userPatterns = ["!yarn.lock"];
            const allPatterns = [...constants_1.DEFAULT_IGNORE_PATTERNS, ...userPatterns];
            const ig = (0, ignore_1.default)().add(allPatterns);
            // yarn.lock should now be included (not ignored)
            expect(ig.ignores("yarn.lock")).toBe(false);
            // Other lock files should still be ignored
            expect(ig.ignores("package-lock.json")).toBe(true);
            expect(ig.ignores("pnpm-lock.yaml")).toBe(true);
            expect(ig.ignores("node_modules/")).toBe(true);
        });
        test("should allow multiple unignore patterns", () => {
            const userPatterns = [
                "!yarn.lock",
                "!package-lock.json",
                "!webpack.config.js",
            ];
            const allPatterns = [...constants_1.DEFAULT_IGNORE_PATTERNS, ...userPatterns];
            const ig = (0, ignore_1.default)().add(allPatterns);
            // These should now be included
            expect(ig.ignores("yarn.lock")).toBe(false);
            expect(ig.ignores("package-lock.json")).toBe(false);
            expect(ig.ignores("webpack.config.js")).toBe(false);
            // Others should still be ignored
            expect(ig.ignores("pnpm-lock.yaml")).toBe(true);
            expect(ig.ignores("node_modules/")).toBe(true);
            expect(ig.ignores("dist/")).toBe(true);
        });
        test("should allow users to add additional ignore patterns", () => {
            const userPatterns = [
                "!yarn.lock", // unignore yarn.lock
                "*.test.ts", // ignore test files
                "docs/api/", // ignore API docs
                "README.md", // ignore README
            ];
            const allPatterns = [...constants_1.DEFAULT_IGNORE_PATTERNS, ...userPatterns];
            const ig = (0, ignore_1.default)().add(allPatterns);
            // yarn.lock should be included now
            expect(ig.ignores("yarn.lock")).toBe(false);
            // User's additional patterns should be ignored
            expect(ig.ignores("src/component.test.ts")).toBe(true);
            expect(ig.ignores("docs/api/endpoints.md")).toBe(true);
            expect(ig.ignores("README.md")).toBe(true);
            // Defaults should still work
            expect(ig.ignores("node_modules/react")).toBe(true);
            expect(ig.ignores("dist/bundle.js")).toBe(true);
        });
        test("should demonstrate real-world usage - review yarn.lock but ignore tests", () => {
            const userPatterns = [
                "!yarn.lock", // Include yarn.lock in reviews
                "*.test.ts", // Ignore test files
                "docs/", // Ignore documentation
            ];
            const allPatterns = [...constants_1.DEFAULT_IGNORE_PATTERNS, ...userPatterns];
            const ig = (0, ignore_1.default)().add(allPatterns);
            // yarn.lock should now be reviewed
            expect(ig.ignores("yarn.lock")).toBe(false);
            // User's custom ignores work
            expect(ig.ignores("src/component.test.ts")).toBe(true);
            expect(ig.ignores("docs/readme.md")).toBe(true);
            // Other defaults still ignored
            expect(ig.ignores("package-lock.json")).toBe(true); // Other locks still ignored
            expect(ig.ignores("node_modules/react")).toBe(true);
            expect(ig.ignores("dist/bundle.js")).toBe(true);
        });
    });
    describe("Pattern Precedence", () => {
        test("should respect pattern order (later patterns override earlier ones)", () => {
            const patterns = [
                "*.js", // Ignore all JS files
                "!important.js", // But include this one
            ];
            const ig = (0, ignore_1.default)().add(patterns);
            expect(ig.ignores("app.js")).toBe(true); // Normal JS file ignored
            expect(ig.ignores("important.js")).toBe(false); // Specifically unignored
            expect(ig.ignores("src/utils.js")).toBe(true); // JS files in subdirs ignored
        });
        test("should handle user patterns overriding defaults", () => {
            const userPatterns = [
                "*.generated.ts", // Ignore generated files by pattern
                "!important.generated.ts", // But include this one
                "docs/", // Ignore docs directory
            ];
            const allPatterns = [...constants_1.DEFAULT_IGNORE_PATTERNS, ...userPatterns];
            const ig = (0, ignore_1.default)().add(allPatterns);
            // Default patterns still work
            expect(ig.ignores("node_modules/react/")).toBe(true);
            expect(ig.ignores("dist/bundle.js")).toBe(true);
            // User's custom patterns work
            expect(ig.ignores("src/api.generated.ts")).toBe(true);
            expect(ig.ignores("important.generated.ts")).toBe(false); // Unignored
            expect(ig.ignores("docs/")).toBe(true);
            expect(ig.ignores("docs/readme.md")).toBe(true);
            // Regular source files still not ignored
            expect(ig.ignores("src/index.ts")).toBe(false);
            expect(ig.ignores("src/component.ts")).toBe(false);
        });
    });
});
//# sourceMappingURL=ignore-patterns.test.js.map