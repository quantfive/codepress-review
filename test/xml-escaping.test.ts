import { escapeXml } from "../src/xml-utils";

describe("escapeXml", () => {
  describe("XML special character escaping", () => {
    it("should escape ampersand (&)", () => {
      expect(escapeXml("foo & bar")).toBe("foo &amp; bar");
      expect(escapeXml("&")).toBe("&amp;");
      expect(escapeXml("&amp;")).toBe("&amp;amp;");
    });

    it("should escape less than (<)", () => {
      expect(escapeXml("foo < bar")).toBe("foo &lt; bar");
      expect(escapeXml("<")).toBe("&lt;");
      expect(escapeXml("<script>")).toBe("&lt;script&gt;");
    });

    it("should escape greater than (>)", () => {
      expect(escapeXml("foo > bar")).toBe("foo &gt; bar");
      expect(escapeXml(">")).toBe("&gt;");
      expect(escapeXml("</script>")).toBe("&lt;/script&gt;");
    });

    it('should escape double quotes (")', () => {
      expect(escapeXml('foo "bar" baz')).toBe("foo &quot;bar&quot; baz");
      expect(escapeXml('"')).toBe("&quot;");
      expect(escapeXml('say "hello"')).toBe("say &quot;hello&quot;");
    });

    it("should escape single quotes (')", () => {
      expect(escapeXml("foo 'bar' baz")).toBe("foo &apos;bar&apos; baz");
      expect(escapeXml("'")).toBe("&apos;");
      expect(escapeXml("don't")).toBe("don&apos;t");
    });
  });

  describe("combined special characters", () => {
    it("should handle multiple special characters", () => {
      expect(escapeXml("foo & bar < \"baz\" > 'qux'")).toBe(
        "foo &amp; bar &lt; &quot;baz&quot; &gt; &apos;qux&apos;",
      );
    });

    it("should handle XML-like content", () => {
      expect(escapeXml('<tag attr="value">content & more</tag>')).toBe(
        "&lt;tag attr=&quot;value&quot;&gt;content &amp; more&lt;/tag&gt;",
      );
    });

    it("should handle malicious XML injection attempts", () => {
      const maliciousXml = '<script>alert("xss")</script>';
      expect(escapeXml(maliciousXml)).toBe(
        "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
      );
    });

    it("should handle XML with attributes containing special characters", () => {
      const xmlWithAttrs = "<element id=\"test & more\" class='value'>";
      expect(escapeXml(xmlWithAttrs)).toBe(
        "&lt;element id=&quot;test &amp; more&quot; class=&apos;value&apos;&gt;",
      );
    });
  });

  describe("edge cases", () => {
    it("should handle null input", () => {
      expect(escapeXml(null)).toBe("");
    });

    it("should handle undefined input", () => {
      expect(escapeXml(undefined)).toBe("");
    });

    it("should handle empty string", () => {
      expect(escapeXml("")).toBe("");
    });

    it("should handle string with only whitespace", () => {
      expect(escapeXml("   ")).toBe("   ");
      expect(escapeXml("\t\n")).toBe("\t\n");
    });

    it("should handle numbers converted to strings", () => {
      expect(escapeXml(123 as any)).toBe("123");
      expect(escapeXml(0 as any)).toBe("0");
    });

    it("should handle boolean values converted to strings", () => {
      expect(escapeXml(true as any)).toBe("true");
      expect(escapeXml(false as any)).toBe("false");
    });
  });

  describe("real-world scenarios", () => {
    it("should handle GitHub comment content", () => {
      const comment =
        "This code looks good! However, I think we should check if `value < 0` and handle the case where `data && data.length > 0`.";
      const expected =
        "This code looks good! However, I think we should check if `value &lt; 0` and handle the case where `data &amp;&amp; data.length &gt; 0`.";
      expect(escapeXml(comment)).toBe(expected);
    });

    it("should handle file paths with special characters", () => {
      const filePath = "src/components/Modal<T>.tsx";
      expect(escapeXml(filePath)).toBe("src/components/Modal&lt;T&gt;.tsx");
    });

    it("should handle code snippets", () => {
      const code = 'if (x > 0 && y < 10) { console.log("success"); }';
      const expected =
        "if (x &gt; 0 &amp;&amp; y &lt; 10) { console.log(&quot;success&quot;); }";
      expect(escapeXml(code)).toBe(expected);
    });

    it("should handle JSON-like content", () => {
      const json = '{"name": "John", "age": 30, "active": true}';
      const expected =
        "{&quot;name&quot;: &quot;John&quot;, &quot;age&quot;: 30, &quot;active&quot;: true}";
      expect(escapeXml(json)).toBe(expected);
    });

    it("should handle SQL queries", () => {
      const sql = "SELECT * FROM users WHERE name = 'John' AND age > 18";
      const expected =
        "SELECT * FROM users WHERE name = &apos;John&apos; AND age &gt; 18";
      expect(escapeXml(sql)).toBe(expected);
    });
  });

  describe("security considerations", () => {
    it("should prevent XML entity injection", () => {
      const maliciousInput =
        "<!DOCTYPE foo [<!ENTITY xxe SYSTEM 'file:///etc/passwd'>]>";
      expect(escapeXml(maliciousInput)).toBe(
        "&lt;!DOCTYPE foo [&lt;!ENTITY xxe SYSTEM &apos;file:///etc/passwd&apos;&gt;]&gt;",
      );
    });

    it("should prevent CDATA injection", () => {
      const cdataInput = "]]><script>alert('xss')</script><![CDATA[";
      expect(escapeXml(cdataInput)).toBe(
        "]]&gt;&lt;script&gt;alert(&apos;xss&apos;)&lt;/script&gt;&lt;![CDATA[",
      );
    });
  });
});
