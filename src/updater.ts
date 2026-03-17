/**
 * Verifica si hay una versión más reciente del paquete en npm.
 * El check se ejecuta en background y cachea el resultado por 24 horas.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import chalk from "chalk";
import { t } from "./i18n.js";

// ── Constants ───────────────────────────────────────────────────────────────

const CACHE_DIR = join(homedir(), ".invoice");
const CACHE_FILE = join(CACHE_DIR, "update-check.json");
const REGISTRY_URL = "https://registry.npmjs.org/jira-invoice/latest";
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 horas
const FETCH_TIMEOUT_MS = 5000;

// ── Types ───────────────────────────────────────────────────────────────────

interface UpdateCache {
  lastCheck: number;
  latestVersion: string;
}

// ── Helpers (exportados para testing) ───────────────────────────────────────

export function isNewer(latest: string, current: string): boolean {
  const a = latest.split(".").map(Number);
  const b = current.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) > (b[i] ?? 0)) return true;
    if ((a[i] ?? 0) < (b[i] ?? 0)) return false;
  }
  return false;
}

export function shouldCheck(cache: UpdateCache | null): boolean {
  if (!cache) return true;
  return Date.now() - cache.lastCheck > CHECK_INTERVAL_MS;
}

function readCache(): UpdateCache | null {
  try {
    if (!existsSync(CACHE_FILE)) return null;
    return JSON.parse(readFileSync(CACHE_FILE, "utf-8")) as UpdateCache;
  } catch {
    return null;
  }
}

function writeCache(latestVersion: string): void {
  try {
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify({ lastCheck: Date.now(), latestVersion }));
  } catch {
    // Ignorar errores de escritura
  }
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(REGISTRY_URL, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Inicia la verificación de actualización.
 * Retorna la versión más reciente o null si no se pudo verificar.
 */
export async function startUpdateCheck(): Promise<string | null> {
  try {
    const cache = readCache();
    if (!shouldCheck(cache)) {
      return cache!.latestVersion;
    }
    const latest = await fetchLatestVersion();
    if (latest) writeCache(latest);
    return latest;
  } catch {
    return null;
  }
}

/**
 * Muestra un mensaje si hay una versión más reciente disponible.
 */
export function showUpdateMessage(currentVersion: string, latestVersion: string | null): void {
  if (!latestVersion) return;
  if (!isNewer(latestVersion, currentVersion)) return;

  const s = t();
  console.log();
  console.log(
    chalk.yellow(s.newVersionAvailable) +
    chalk.dim(currentVersion) +
    chalk.yellow(" → ") +
    chalk.bold.green(latestVersion)
  );
  console.log(chalk.dim(s.updateCommand) + chalk.cyan("npm update -g jira-invoice"));
  console.log();
}
