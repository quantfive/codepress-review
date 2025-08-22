"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = require("../src/debug");
// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
describe("Debug functionality", () => {
    let mockConsoleLog;
    let mockConsoleError;
    let mockConsoleWarn;
    beforeEach(() => {
        // Reset debug mode before each test
        (0, debug_1.setDebugMode)(false);
        // Mock console methods
        mockConsoleLog = jest.spyOn(console, "log").mockImplementation(() => { });
        mockConsoleError = jest
            .spyOn(console, "error")
            .mockImplementation(() => { });
        mockConsoleWarn = jest.spyOn(console, "warn").mockImplementation(() => { });
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
            (0, debug_1.setDebugMode)(true);
            expect((0, debug_1.isDebugEnabled)()).toBe(true);
        });
        it("should set debug mode to false", () => {
            (0, debug_1.setDebugMode)(false);
            expect((0, debug_1.isDebugEnabled)()).toBe(false);
        });
        it("should default debug mode to false", () => {
            expect((0, debug_1.isDebugEnabled)()).toBe(false);
        });
    });
    describe("debugLog", () => {
        it("should call console.log when debug mode is enabled", () => {
            (0, debug_1.setDebugMode)(true);
            (0, debug_1.debugLog)("test message", { key: "value" });
            expect(mockConsoleLog).toHaveBeenCalledWith("test message", {
                key: "value",
            });
            expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        });
        it("should not call console.log when debug mode is disabled", () => {
            (0, debug_1.setDebugMode)(false);
            (0, debug_1.debugLog)("test message", { key: "value" });
            expect(mockConsoleLog).not.toHaveBeenCalled();
        });
        it("should handle multiple arguments", () => {
            (0, debug_1.setDebugMode)(true);
            (0, debug_1.debugLog)("message", 123, true, { key: "value" });
            expect(mockConsoleLog).toHaveBeenCalledWith("message", 123, true, {
                key: "value",
            });
        });
        it("should handle no arguments", () => {
            (0, debug_1.setDebugMode)(true);
            (0, debug_1.debugLog)();
            expect(mockConsoleLog).toHaveBeenCalledWith();
        });
    });
    describe("debugError", () => {
        it("should call console.error when debug mode is enabled", () => {
            (0, debug_1.setDebugMode)(true);
            (0, debug_1.debugError)("error message", new Error("test error"));
            expect(mockConsoleError).toHaveBeenCalledWith("error message", new Error("test error"));
            expect(mockConsoleError).toHaveBeenCalledTimes(1);
        });
        it("should not call console.error when debug mode is disabled", () => {
            (0, debug_1.setDebugMode)(false);
            (0, debug_1.debugError)("error message", new Error("test error"));
            expect(mockConsoleError).not.toHaveBeenCalled();
        });
        it("should handle multiple arguments", () => {
            (0, debug_1.setDebugMode)(true);
            const error = new Error("test");
            (0, debug_1.debugError)("Error occurred:", error, { context: "test" });
            expect(mockConsoleError).toHaveBeenCalledWith("Error occurred:", error, {
                context: "test",
            });
        });
    });
    describe("debugWarn", () => {
        it("should call console.warn when debug mode is enabled", () => {
            (0, debug_1.setDebugMode)(true);
            (0, debug_1.debugWarn)("warning message", { warning: "test" });
            expect(mockConsoleWarn).toHaveBeenCalledWith("warning message", {
                warning: "test",
            });
            expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
        });
        it("should not call console.warn when debug mode is disabled", () => {
            (0, debug_1.setDebugMode)(false);
            (0, debug_1.debugWarn)("warning message", { warning: "test" });
            expect(mockConsoleWarn).not.toHaveBeenCalled();
        });
        it("should handle multiple arguments", () => {
            (0, debug_1.setDebugMode)(true);
            (0, debug_1.debugWarn)("Warning:", "rate limit hit", { retryAfter: 60 });
            expect(mockConsoleWarn).toHaveBeenCalledWith("Warning:", "rate limit hit", { retryAfter: 60 });
        });
    });
    describe("isDebugEnabled", () => {
        it("should return true when debug mode is enabled", () => {
            (0, debug_1.setDebugMode)(true);
            expect((0, debug_1.isDebugEnabled)()).toBe(true);
        });
        it("should return false when debug mode is disabled", () => {
            (0, debug_1.setDebugMode)(false);
            expect((0, debug_1.isDebugEnabled)()).toBe(false);
        });
    });
    describe("debug mode state persistence", () => {
        it("should maintain debug mode state across multiple calls", () => {
            (0, debug_1.setDebugMode)(true);
            (0, debug_1.debugLog)("message 1");
            (0, debug_1.debugLog)("message 2");
            (0, debug_1.debugError)("error 1");
            (0, debug_1.debugWarn)("warning 1");
            expect(mockConsoleLog).toHaveBeenCalledTimes(2);
            expect(mockConsoleError).toHaveBeenCalledTimes(1);
            expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
        });
        it("should switch debug mode on and off correctly", () => {
            // Start disabled
            (0, debug_1.setDebugMode)(false);
            (0, debug_1.debugLog)("disabled message");
            expect(mockConsoleLog).not.toHaveBeenCalled();
            // Enable
            (0, debug_1.setDebugMode)(true);
            (0, debug_1.debugLog)("enabled message");
            expect(mockConsoleLog).toHaveBeenCalledWith("enabled message");
            // Disable again
            (0, debug_1.setDebugMode)(false);
            (0, debug_1.debugLog)("disabled again");
            expect(mockConsoleLog).toHaveBeenCalledTimes(1); // Still only called once
        });
    });
});
//# sourceMappingURL=debug.test.js.map