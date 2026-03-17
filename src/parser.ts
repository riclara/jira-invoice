/**
 * Parsea CSVs exportados de Jira Logged Time.
 * Soporta dos formatos:
 *   - pivot:    una columna por fecha  (ej. 05/Jan/26, 06/Jan/26 ...)
 *   - date_col: columna 'Date' con rangos (ej. 19/Jan/26 to 30/Jan/26)
 */

import { readFileSync } from "node:fs";
import { parse as csvParse } from "csv-parse/sync";
import type { WorkEntry, CsvFormat } from "./types.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

const DATE_RE = /^\d{2}\/\w{3}\/\d{2}$/;

export function parseDate(s: string): Date {
  const [dd, mon, yy] = s.trim().split("/");
  const month = MONTHS[mon];
  if (month === undefined) throw new Error(`Mes no reconocido: ${mon}`);
  return new Date(2000 + parseInt(yy), month, parseInt(dd));
}

export function parseHours(raw: string): number {
  if (!raw || !raw.trim()) return 0;
  let total = 0;
  const hMatch = raw.match(/(\d+(?:\.\d+)?)h/);
  if (hMatch) total += parseFloat(hMatch[1]);
  const mMatch = raw.match(/(\d+)m/);
  if (mMatch) total += parseInt(mMatch[1]) / 60;
  return total;
}

export function weekdays(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const d = new Date(start);
  while (d <= end) {
    if (d.getDay() >= 1 && d.getDay() <= 5) {
      days.push(new Date(d));
    }
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export function applyDailyCap(entries: WorkEntry[], maxHoursPerDay: number | null): WorkEntry[] {
  if (maxHoursPerDay === null) return entries;

  const byDate = new Map<string, number[]>();
  for (let i = 0; i < entries.length; i++) {
    const key = entries[i].date.toISOString().slice(0, 10);
    const indices = byDate.get(key) ?? [];
    indices.push(i);
    byDate.set(key, indices);
  }

  const result = [...entries];
  for (const indices of byDate.values()) {
    const total = indices.reduce((sum, i) => sum + result[i].rawHours, 0);
    if (total > maxHoursPerDay) {
      const scale = maxHoursPerDay / total;
      for (const i of indices) {
        result[i] = {
          ...result[i],
          hours: Math.round(result[i].rawHours * scale * 100) / 100,
        };
      }
    }
  }
  return result;
}

// ── Encoding detection ──────────────────────────────────────────────────────

function readFileWithEncoding(path: string): string {
  const buf = readFileSync(path);

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  } catch {
    // Not valid UTF-8
  }

  return buf.toString("latin1");
}

// ── Format detection ────────────────────────────────────────────────────────

function getHeaders(text: string): string[] {
  const firstLine = text.split("\n")[0] ?? "";
  const rows = csvParse(firstLine, { columns: false }) as string[][];
  return rows[0] ?? [];
}

// ── Parsers ─────────────────────────────────────────────────────────────────

export function parsePivot(text: string): WorkEntry[] {
  const rows = csvParse(text, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0]);
  const dateCols = headers.filter((h) => DATE_RE.test(h.trim()));

  const entries: WorkEntry[] = [];
  for (const row of rows) {
    const key = (row["Key"] ?? "").trim();
    const issue = (row["Issue"] ?? "").trim();
    if (!key) continue;

    for (const dcol of dateCols) {
      const hrs = parseHours(row[dcol] ?? "");
      if (hrs > 0) {
        entries.push({
          date: parseDate(dcol),
          ticket: `[${key}]`,
          desc: issue,
          hours: hrs,
          rawHours: hrs,
        });
      }
    }
  }

  entries.sort((a, b) => a.date.getTime() - b.date.getTime() || a.ticket.localeCompare(b.ticket));
  return entries;
}

export function parseDateCol(text: string): WorkEntry[] {
  const rows = csvParse(text, { columns: true, skip_empty_lines: true }) as Record<string, string>[];

  const singleDays = new Set<string>();
  for (const row of rows) {
    const ds = (row["Date"] ?? "").trim();
    if (ds && !ds.includes(" to ") && ds.includes("/")) {
      try {
        singleDays.add(parseDate(ds).toISOString().slice(0, 10));
      } catch {
        // skip invalid dates
      }
    }
  }

  const raw: WorkEntry[] = [];
  for (const row of rows) {
    const key = (row["Key"] ?? "").trim();
    const desc = (row["Issue"] ?? "").trim();
    const ds = (row["Date"] ?? "").trim();
    const logged = (row["Logged"] ?? "").trim();
    if (!key || !ds) continue;

    const ticket = `[${key}]`;
    if (ds.includes(" to ")) {
      const parts = ds.split(" to ");
      const allDays = weekdays(parseDate(parts[0]), parseDate(parts[1]));
      const days = allDays.filter((d) => !singleDays.has(d.toISOString().slice(0, 10)));
      if (days.length === 0) continue;
      const hpd = parseHours(logged) / days.length;
      for (const d of days) {
        raw.push({ date: d, ticket, desc, hours: hpd, rawHours: hpd });
      }
    } else {
      const hrs = parseHours(logged);
      raw.push({ date: parseDate(ds), ticket, desc, hours: hrs, rawHours: hrs });
    }
  }

  // Dedup: single-day entries take priority over range-expanded ones
  const seen = new Set<string>();
  const entries: WorkEntry[] = [];

  for (const e of raw) {
    const dateKey = e.date.toISOString().slice(0, 10);
    if (singleDays.has(dateKey)) {
      const k = `${dateKey}|${e.ticket}`;
      if (!seen.has(k)) {
        entries.push(e);
        seen.add(k);
      }
    }
  }

  for (const e of raw) {
    const dateKey = e.date.toISOString().slice(0, 10);
    if (!singleDays.has(dateKey)) {
      const k = `${dateKey}|${e.ticket}`;
      if (!seen.has(k)) {
        entries.push(e);
        seen.add(k);
      }
    }
  }

  entries.sort((a, b) => a.date.getTime() - b.date.getTime() || a.ticket.localeCompare(b.ticket));
  return entries;
}

// ── Public API ──────────────────────────────────────────────────────────────

export function parse(path: string, maxHoursPerDay: number | null): { entries: WorkEntry[]; format: CsvFormat } {
  const text = readFileWithEncoding(path);
  const headers = getHeaders(text);
  const format: CsvFormat = headers.some((h) => DATE_RE.test(h.trim())) ? "pivot" : "date_col";
  const entries = format === "pivot" ? parsePivot(text) : parseDateCol(text);
  return { entries: applyDailyCap(entries, maxHoursPerDay), format };
}
