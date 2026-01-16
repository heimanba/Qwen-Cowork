import type { ClaudeSettingsEnv } from "../types.js";
import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// Environment variable keys for Qwen/OpenAI compatible configuration
// These can be configured via ~/.qwen/settings.json or environment variables
const QWEN_SETTINGS_ENV_KEYS = [
  "ANTHROPIC_AUTH_TOKEN",   // Legacy: for backward compatibility
  "ANTHROPIC_BASE_URL",     // Legacy: for backward compatibility
  "ANTHROPIC_MODEL",        // Legacy: for backward compatibility
  "OPENAI_API_KEY",         // OpenAI-compatible API key
  "OPENAI_BASE_URL",        // OpenAI-compatible base URL
  "OPENAI_MODEL",           // OpenAI-compatible model name
  "QWEN_API_KEY",           // Qwen-specific API key
  "QWEN_BASE_URL",          // Qwen-specific base URL
  "QWEN_MODEL",             // Qwen-specific model name
  "API_TIMEOUT_MS",
  "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"
] as const;

export function loadClaudeSettingsEnv(): ClaudeSettingsEnv {
  // Try loading from Qwen settings first
  try {
    const qwenSettingsPath = join(homedir(), ".qwen", "settings.json");
    const raw = readFileSync(qwenSettingsPath, "utf8");
    const parsed = JSON.parse(raw) as { env?: Record<string, unknown> };
    if (parsed.env) {
      for (const [key, value] of Object.entries(parsed.env)) {
        if (process.env[key] === undefined && value !== undefined && value !== null) {
          process.env[key] = String(value);
        }
      }
    }
  } catch {
    // Ignore missing or invalid Qwen settings file
  }

  // Fallback to Claude settings for backward compatibility
  try {
    const settingsPath = join(homedir(), ".claude", "settings.json");
    const raw = readFileSync(settingsPath, "utf8");
    const parsed = JSON.parse(raw) as { env?: Record<string, unknown> };
    if (parsed.env) {
      for (const [key, value] of Object.entries(parsed.env)) {
        if (process.env[key] === undefined && value !== undefined && value !== null) {
          process.env[key] = String(value);
        }
      }
    }
  } catch {
    // Ignore missing or invalid Claude settings file
  }

  const env = {} as ClaudeSettingsEnv;
  for (const key of QWEN_SETTINGS_ENV_KEYS) {
    (env as Record<string, string>)[key] = process.env[key] ?? "";
  }
  return env;
}

export const qwenCodeEnv = loadClaudeSettingsEnv();
// Alias for backward compatibility
export const claudeCodeEnv = qwenCodeEnv;
