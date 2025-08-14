"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDebugMode = setDebugMode;
exports.debugLog = debugLog;
exports.debugError = debugError;
exports.debugWarn = debugWarn;
exports.isDebugEnabled = isDebugEnabled;
let debugMode = false;
function setDebugMode(enabled) {
    debugMode = enabled;
}
function debugLog(...args) {
    if (debugMode) {
        console.log(...args);
    }
}
function debugError(...args) {
    if (debugMode) {
        console.error(...args);
    }
}
function debugWarn(...args) {
    if (debugMode) {
        console.warn(...args);
    }
}
function isDebugEnabled() {
    return debugMode;
}
//# sourceMappingURL=debug.js.map