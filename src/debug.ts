let debugMode = false;

export function setDebugMode(enabled: boolean): void {
  debugMode = enabled;
}

export function debugLog(...args: any[]): void {
  if (debugMode) {
    console.log(...args);
  }
}

export function debugError(...args: any[]): void {
  if (debugMode) {
    console.error(...args);
  }
}

export function debugWarn(...args: any[]): void {
  if (debugMode) {
    console.warn(...args);
  }
}

export function isDebugEnabled(): boolean {
  return debugMode;
}
