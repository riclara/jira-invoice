import { describe, it, expect } from "vitest";
import {
  parseDate,
  parseHours,
  weekdays,
  applyDailyCap,
  parsePivot,
  parseDateCol,
} from "./parser.js";
import type { WorkEntry } from "./types.js";

// ── parseDate ───────────────────────────────────────────────────────────────

describe("parseDate", () => {
  it("parsea una fecha estándar DD/Mon/YY", () => {
    const d = parseDate("05/Jan/26");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(5);
  });

  it("parsea todos los meses correctamente", () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 0; i < months.length; i++) {
      const d = parseDate(`15/${months[i]}/25`);
      expect(d.getMonth()).toBe(i);
    }
  });

  it("maneja whitespace", () => {
    const d = parseDate("  05/Jan/26  ");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getDate()).toBe(5);
  });

  it("lanza error con mes inválido", () => {
    expect(() => parseDate("05/Xyz/26")).toThrow("Mes no reconocido");
  });

  it("parsea año 00 como 2000", () => {
    const d = parseDate("01/Jan/00");
    expect(d.getFullYear()).toBe(2000);
  });

  it("parsea año 99 como 2099", () => {
    const d = parseDate("31/Dec/99");
    expect(d.getFullYear()).toBe(2099);
  });
});

// ── parseHours ──────────────────────────────────────────────────────────────

describe("parseHours", () => {
  it("parsea horas simples", () => {
    expect(parseHours("2h")).toBe(2);
  });

  it("parsea minutos", () => {
    expect(parseHours("30m")).toBe(0.5);
  });

  it("parsea combinación horas y minutos", () => {
    expect(parseHours("2h30m")).toBe(2.5);
  });

  it("parsea horas decimales", () => {
    expect(parseHours("1.5h")).toBe(1.5);
  });

  it("retorna 0 para string vacío", () => {
    expect(parseHours("")).toBe(0);
  });

  it("retorna 0 para whitespace", () => {
    expect(parseHours("   ")).toBe(0);
  });

  it("retorna 0 para 0h", () => {
    expect(parseHours("0h")).toBe(0);
  });

  it("retorna 0 para 0m", () => {
    expect(parseHours("0m")).toBe(0);
  });

  it("parsea horas grandes", () => {
    expect(parseHours("12h45m")).toBe(12.75);
  });
});

// ── weekdays ────────────────────────────────────────────────────────────────

describe("weekdays", () => {
  it("retorna 5 días para una semana laboral (Lun-Vie)", () => {
    // 2026-01-05 es lunes, 2026-01-09 es viernes
    const days = weekdays(new Date(2026, 0, 5), new Date(2026, 0, 9));
    expect(days).toHaveLength(5);
  });

  it("retorna 0 días para un fin de semana", () => {
    // 2026-01-10 es sábado, 2026-01-11 es domingo
    const days = weekdays(new Date(2026, 0, 10), new Date(2026, 0, 11));
    expect(days).toHaveLength(0);
  });

  it("retorna 1 día para un solo día hábil", () => {
    const days = weekdays(new Date(2026, 0, 5), new Date(2026, 0, 5));
    expect(days).toHaveLength(1);
  });

  it("retorna 0 para un solo día de fin de semana", () => {
    const days = weekdays(new Date(2026, 0, 10), new Date(2026, 0, 10));
    expect(days).toHaveLength(0);
  });

  it("retorna 10 días para dos semanas laborales", () => {
    // 2026-01-05 (lun) a 2026-01-16 (vie)
    const days = weekdays(new Date(2026, 0, 5), new Date(2026, 0, 16));
    expect(days).toHaveLength(10);
  });

  it("excluye fines de semana en un rango largo", () => {
    // 2026-01-05 (lun) a 2026-01-11 (dom) = 5 días hábiles
    const days = weekdays(new Date(2026, 0, 5), new Date(2026, 0, 11));
    expect(days).toHaveLength(5);
    for (const d of days) {
      expect(d.getDay()).toBeGreaterThanOrEqual(1);
      expect(d.getDay()).toBeLessThanOrEqual(5);
    }
  });

  it("retorna array vacío si start > end", () => {
    const days = weekdays(new Date(2026, 0, 9), new Date(2026, 0, 5));
    expect(days).toHaveLength(0);
  });
});

// ── applyDailyCap ───────────────────────────────────────────────────────────

describe("applyDailyCap", () => {
  const makeEntry = (date: Date, hours: number): WorkEntry => ({
    date,
    ticket: "[TEST-1]",
    desc: "Test",
    hours,
    rawHours: hours,
  });

  it("retorna entries sin cambio si maxHoursPerDay es null", () => {
    const entries = [makeEntry(new Date(2026, 0, 5), 10)];
    const result = applyDailyCap(entries, null);
    expect(result[0].hours).toBe(10);
  });

  it("limita un entry que excede el cap", () => {
    const entries = [makeEntry(new Date(2026, 0, 5), 10)];
    const result = applyDailyCap(entries, 8);
    expect(result[0].hours).toBe(8);
    expect(result[0].rawHours).toBe(10);
  });

  it("no modifica entries bajo el cap", () => {
    const entries = [makeEntry(new Date(2026, 0, 5), 6)];
    const result = applyDailyCap(entries, 8);
    expect(result[0].hours).toBe(6);
  });

  it("escala proporcionalmente múltiples entries del mismo día", () => {
    const d = new Date(2026, 0, 5);
    const entries = [
      makeEntry(d, 6),
      makeEntry(d, 4),
    ];
    const result = applyDailyCap(entries, 8);
    // Total raw = 10, cap = 8, scale = 0.8
    expect(result[0].hours).toBeCloseTo(4.8);
    expect(result[1].hours).toBeCloseTo(3.2);
    expect(result[0].hours + result[1].hours).toBeCloseTo(8);
  });

  it("solo afecta el día que excede el cap", () => {
    const d1 = new Date(2026, 0, 5);
    const d2 = new Date(2026, 0, 6);
    const entries = [
      makeEntry(d1, 10), // excede
      makeEntry(d2, 6),  // no excede
    ];
    const result = applyDailyCap(entries, 8);
    expect(result[0].hours).toBe(8);
    expect(result[1].hours).toBe(6);
  });

  it("maneja entries con 0 horas sin div/0", () => {
    const d = new Date(2026, 0, 5);
    const entries = [
      makeEntry(d, 0),
      makeEntry(d, 0),
    ];
    const result = applyDailyCap(entries, 8);
    expect(result[0].hours).toBe(0);
    expect(result[1].hours).toBe(0);
  });
});

// ── parsePivot ──────────────────────────────────────────────────────────────

describe("parsePivot", () => {
  it("parsea CSV pivot con tickets y fechas", () => {
    const csv = `Key,Issue,05/Jan/26,06/Jan/26,07/Jan/26
PROJ-1,Implementar login,2h,3h,0h
PROJ-2,Fix bug header,1h,0h,4h`;

    const entries = parsePivot(csv);
    expect(entries).toHaveLength(4); // 2+1+0 + 1+0+1 = 4 entries con horas > 0
    expect(entries[0].ticket).toBe("[PROJ-1]");
    expect(entries[0].hours).toBe(2);
  });

  it("no genera entries para 0 horas", () => {
    const csv = `Key,Issue,05/Jan/26
PROJ-1,Test,0h`;

    const entries = parsePivot(csv);
    expect(entries).toHaveLength(0);
  });

  it("retorna array vacío para CSV sin datos", () => {
    const csv = `Key,Issue,05/Jan/26`;
    const entries = parsePivot(csv);
    expect(entries).toHaveLength(0);
  });

  it("ordena por fecha y luego por ticket", () => {
    const csv = `Key,Issue,06/Jan/26,05/Jan/26
PROJ-2,Task B,1h,2h
PROJ-1,Task A,3h,4h`;

    const entries = parsePivot(csv);
    // Primer entry debe ser el de 05/Jan (fecha más antigua)
    expect(entries[0].date.getDate()).toBe(5);
    // Entre misma fecha, ordena por ticket
    expect(entries[0].ticket).toBe("[PROJ-1]");
    expect(entries[1].ticket).toBe("[PROJ-2]");
  });

  it("ignora filas sin Key", () => {
    const csv = `Key,Issue,05/Jan/26
,Sin ticket,2h
PROJ-1,Con ticket,3h`;

    const entries = parsePivot(csv);
    expect(entries).toHaveLength(1);
    expect(entries[0].ticket).toBe("[PROJ-1]");
  });
});

// ── parseDateCol ────────────────────────────────────────────────────────────

describe("parseDateCol", () => {
  it("parsea entries de un solo día", () => {
    const csv = `Key,Issue,Date,Logged
PROJ-1,Task A,05/Jan/26,4h`;

    const entries = parseDateCol(csv);
    expect(entries).toHaveLength(1);
    expect(entries[0].ticket).toBe("[PROJ-1]");
    expect(entries[0].hours).toBe(4);
  });

  it("expande rangos a días hábiles", () => {
    // 05/Jan/26 (lun) to 09/Jan/26 (vie) = 5 días hábiles
    const csv = `Key,Issue,Date,Logged
PROJ-1,Task A,05/Jan/26 to 09/Jan/26,10h`;

    const entries = parseDateCol(csv);
    expect(entries).toHaveLength(5);
    // 10h / 5 días = 2h por día
    for (const e of entries) {
      expect(e.hours).toBe(2);
    }
  });

  it("excluye fines de semana en rangos", () => {
    // 05/Jan/26 (lun) to 11/Jan/26 (dom) = 5 días hábiles (excluye sáb y dom)
    const csv = `Key,Issue,Date,Logged
PROJ-1,Task A,05/Jan/26 to 11/Jan/26,10h`;

    const entries = parseDateCol(csv);
    expect(entries).toHaveLength(5);
  });

  it("prioriza entries de un solo día sobre rangos expandidos (dedup)", () => {
    const csv = `Key,Issue,Date,Logged
PROJ-1,Task A,05/Jan/26,8h
PROJ-1,Task A,05/Jan/26 to 09/Jan/26,10h`;

    const entries = parseDateCol(csv);
    // El entry del 05/Jan debe tener 8h (del single-day), no 2h (del rango)
    const jan5 = entries.find((e) => e.date.getDate() === 5);
    expect(jan5?.hours).toBe(8);
  });

  it("retorna array vacío para CSV sin datos", () => {
    const csv = `Key,Issue,Date,Logged`;
    const entries = parseDateCol(csv);
    expect(entries).toHaveLength(0);
  });

  it("ordena por fecha y luego por ticket", () => {
    const csv = `Key,Issue,Date,Logged
PROJ-2,Task B,06/Jan/26,3h
PROJ-1,Task A,05/Jan/26,2h`;

    const entries = parseDateCol(csv);
    expect(entries[0].date.getDate()).toBe(5);
    expect(entries[0].ticket).toBe("[PROJ-1]");
  });
});
