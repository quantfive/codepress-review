import { normalizeIndentation, callWithRetry } from "../src/ai-client";

// Mock the ai library for APICallError
jest.mock("ai", () => ({
  APICallError: {
    isInstance: jest.fn((error) => error?.isAPICallError === true),
  },
}));

describe("AI Client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("normalizeIndentation", () => {
    it("should remove common leading whitespace", () => {
      const input = `
        line 1
        line 2
        line 3
      `;
      const result = normalizeIndentation(input);
      expect(result).toBe("line 1\nline 2\nline 3");
    });

    it("should handle empty string", () => {
      expect(normalizeIndentation("")).toBe("");
    });

    it("should handle string with only whitespace", () => {
      expect(normalizeIndentation("   \n   \n   ")).toBe("");
    });

    it("should preserve relative indentation", () => {
      const input = `
        function test() {
          return 1;
        }
      `;
      const result = normalizeIndentation(input);
      expect(result).toBe("function test() {\n  return 1;\n}");
    });
  });

  describe("callWithRetry", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return result on first success", async () => {
      const fn = jest.fn().mockResolvedValue("success");
      const resultPromise = callWithRetry(fn, "test");
      await jest.runAllTimersAsync();
      const result = await resultPromise;
      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should retry on failure and eventually succeed", async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error("fail 1"))
        .mockResolvedValue("success");

      const resultPromise = callWithRetry(fn, "test");
      await jest.runAllTimersAsync();
      const result = await resultPromise;
      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should throw after max retries", async () => {
      jest.useRealTimers(); // Use real timers for this test due to node:timers/promises
      const fn = jest.fn().mockRejectedValue(new Error("always fails"));

      await expect(callWithRetry(fn, "test")).rejects.toThrow("[test] Failed after 3 retries");
      expect(fn).toHaveBeenCalledTimes(3);
    }, 20000); // Increase timeout to 20 seconds

    it("should not retry non-retryable API errors", async () => {
      const { APICallError } = require("ai");
      const nonRetryableError = { isAPICallError: true, isRetryable: false };
      APICallError.isInstance.mockReturnValue(true);

      const fn = jest.fn().mockRejectedValue(nonRetryableError);

      await expect(callWithRetry(fn, "test")).rejects.toBe(nonRetryableError);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
