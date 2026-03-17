/**
 * Persistencia de configuración en ~/.invoice/config.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AppConfig } from "./types.js";

const CONFIG_DIR = join(homedir(), ".invoice");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export function configExists(): boolean {
  return existsSync(CONFIG_FILE);
}

export function loadConfig(): AppConfig {
  const raw = readFileSync(CONFIG_FILE, "utf-8");
  return JSON.parse(raw) as AppConfig;
}

export function saveConfig(config: AppConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}
