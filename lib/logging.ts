// Simple in-memory + console logger.
// expo-file-system is not a project dependency; keeping the same exported API
// so callers don't need to change.

const MAX_ENTRIES = 200;
const logBuffer: string[] = [];

function formatEntry(level: string, message: string, error?: unknown): string {
  const timestamp = new Date().toISOString();
  const detail =
    error instanceof Error ? `\n  ${error.stack ?? error.message}` : '';
  return `[${timestamp}] [${level}] ${message}${detail}`;
}

function push(entry: string) {
  logBuffer.push(entry);
  if (logBuffer.length > MAX_ENTRIES) logBuffer.shift();
}

export async function logError(message: string, error?: unknown) {
  const entry = formatEntry('ERROR', message, error);
  push(entry);
  console.error(entry);
}

export async function logWarn(message: string) {
  const entry = formatEntry('WARN', message);
  push(entry);
  console.warn(entry);
}

export async function logInfo(message: string) {
  const entry = formatEntry('INFO', message);
  push(entry);
  console.log(entry);
}

export async function readLog(): Promise<string> {
  return logBuffer.join('\n');
}

export async function clearLog() {
  logBuffer.length = 0;
}
