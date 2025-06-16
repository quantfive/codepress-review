"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const diff_parser_1 = require("../src/diff-parser");
describe("splitDiff", () => {
    it("should correctly parse a simple diff", () => {
        const diffText = `
diff --git a/file1.txt b/file1.txt
index 0000000..1111111
--- a/file1.txt
+++ b/file1.txt
@@ -1,1 +1,2 @@
-hello
+hello world
+another line
`;
        const chunks = (0, diff_parser_1.splitDiff)(diffText);
        expect(chunks).toHaveLength(1);
        expect(chunks[0].fileName).toBe("file1.txt");
        expect(chunks[0].hunk.newStart).toBe(1);
        expect(chunks[0].hunk.newLines).toBe(2);
    });
    it("should handle multiple files in a diff", () => {
        const diffText = `
diff --git a/file1.txt b/file1.txt
index 0000000..1111111
--- a/file1.txt
+++ b/file1.txt
@@ -1,1 +1,1 @@
-foo
+bar
diff --git a/file2.txt b/file2.txt
index 0000000..2222222
--- a/file2.txt
+++ b/file2.txt
@@ -1,1 +1,1 @@
-one
+two
`;
        const chunks = (0, diff_parser_1.splitDiff)(diffText);
        expect(chunks).toHaveLength(2);
        expect(chunks[0].fileName).toBe("file1.txt");
        expect(chunks[1].fileName).toBe("file2.txt");
    });
    it("should return an empty array for an empty diff", () => {
        const diffText = "";
        const chunks = (0, diff_parser_1.splitDiff)(diffText);
        expect(chunks).toHaveLength(0);
    });
});
//# sourceMappingURL=diff-parser.test.js.map