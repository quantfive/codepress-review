import {
  setDebugMode,
  debugLog,
  debugError,
  debugWarn,
  isDebugEnabled,
} from "../src/debug";

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe("Debug functionality", () => {
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;
  let mockConsoleWarn: jest.SpyInstance;

  beforeEach(() => {
    // Reset debug mode before each test
    setDebugMode(false);

    // Mock console methods
    mockConsoleLog = jest.spyOn(console, "log").mockImplementation(() => {});
    mockConsoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockConsoleWarn = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    jest.restoreAllMocks();
  });

  describe("setDebugMode", () => {
    it("should set debug mode to true", () => {
      setDebugMode(true);
      expect(isDebugEnabled()).toBe(true);
    });

    it("should set debug mode to false", () => {
      setDebugMode(false);
      expect(isDebugEnabled()).toBe(false);
    });

    it("should default debug mode to false", () => {
      expect(isDebugEnabled()).toBe(false);
    });
  });

  describe("debugLog", () => {
    it("should call console.log when debug mode is enabled", () => {
      setDebugMode(true);
      debugLog("test message", { key: "value" });

      expect(mockConsoleLog).toHaveBeenCalledWith("test message", {
        key: "value",
      });
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    });

    it("should not call console.log when debug mode is disabled", () => {
      setDebugMode(false);
      debugLog("test message", { key: "value" });

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it("should handle multiple arguments", () => {
      setDebugMode(true);
      debugLog("message", 123, true, { key: "value" });

      expect(mockConsoleLog).toHaveBeenCalledWith("message", 123, true, {
        key: "value",
      });
    });

    it("should handle no arguments", () => {
      setDebugMode(true);
      debugLog();

      expect(mockConsoleLog).toHaveBeenCalledWith();
    });
  });

  describe("debugError", () => {
    it("should call console.error when debug mode is enabled", () => {
      setDebugMode(true);
      debugError("error message", new Error("test error"));

      expect(mockConsoleError).toHaveBeenCalledWith(
        "error message",
        new Error("test error"),
      );
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
    });

    it("should not call console.error when debug mode is disabled", () => {
      setDebugMode(false);
      debugError("error message", new Error("test error"));

      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it("should handle multiple arguments", () => {
      setDebugMode(true);
      const error = new Error("test");
      debugError("Error occurred:", error, { context: "test" });

      expect(mockConsoleError).toHaveBeenCalledWith("Error occurred:", error, {
        context: "test",
      });
    });
  });

  describe("debugWarn", () => {
    it("should call console.warn when debug mode is enabled", () => {
      setDebugMode(true);
      debugWarn("warning message", { warning: "test" });

      expect(mockConsoleWarn).toHaveBeenCalledWith("warning message", {
        warning: "test",
      });
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
    });

    it("should not call console.warn when debug mode is disabled", () => {
      setDebugMode(false);
      debugWarn("warning message", { warning: "test" });

      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    it("should handle multiple arguments", () => {
      setDebugMode(true);
      debugWarn("Warning:", "rate limit hit", { retryAfter: 60 });

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        "Warning:",
        "rate limit hit",
        { retryAfter: 60 },
      );
    });
  });

  describe("isDebugEnabled", () => {
    it("should return true when debug mode is enabled", () => {
      setDebugMode(true);
      expect(isDebugEnabled()).toBe(true);
    });

    it("should return false when debug mode is disabled", () => {
      setDebugMode(false);
      expect(isDebugEnabled()).toBe(false);
    });
  });

  describe("debug mode state persistence", () => {
    it("should maintain debug mode state across multiple calls", () => {
      setDebugMode(true);

      debugLog("message 1");
      debugLog("message 2");
      debugError("error 1");
      debugWarn("warning 1");

      expect(mockConsoleLog).toHaveBeenCalledTimes(2);
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
    });

    it("should switch debug mode on and off correctly", () => {
      // Start disabled
      setDebugMode(false);
      debugLog("disabled message");
      expect(mockConsoleLog).not.toHaveBeenCalled();

      // Enable
      setDebugMode(true);
      debugLog("enabled message");
      expect(mockConsoleLog).toHaveBeenCalledWith("enabled message");

      // Disable again
      setDebugMode(false);
      debugLog("disabled again");
      expect(mockConsoleLog).toHaveBeenCalledTimes(1); // Still only called once
    });
  });
});
