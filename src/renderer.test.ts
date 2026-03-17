import { describe, it, expect, afterEach } from "vitest";
import { formatDate, formatDateLong, fmtMoney, render } from "./renderer.js";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ── formatDate ──────────────────────────────────────────────────────────────

describe("formatDate", () => {
  it("formatea fecha como DD/Mon/YY", () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe("05/Jan/26");
  });

  it("formatea último día del año", () => {
    expect(formatDate(new Date(2026, 11, 31))).toBe("31/Dec/26");
  });

  it("padding con cero para días < 10", () => {
    expect(formatDate(new Date(2026, 5, 1))).toBe("01/Jun/26");
  });

  it("formatea todos los meses", () => {
    const expected = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 0; i < 12; i++) {
      expect(formatDate(new Date(2026, i, 15))).toContain(expected[i]);
    }
  });
});

// ── formatDateLong ──────────────────────────────────────────────────────────

describe("formatDateLong", () => {
  it("formatea como Mon DD", () => {
    expect(formatDateLong(new Date(2026, 0, 5))).toBe("Jan 05");
  });

  it("padding con cero", () => {
    expect(formatDateLong(new Date(2026, 11, 1))).toBe("Dec 01");
  });
});

// ── fmtMoney ────────────────────────────────────────────────────────────────

describe("fmtMoney", () => {
  it("formatea con separador de miles y 2 decimales", () => {
    expect(fmtMoney(1234.56)).toBe("1,234.56");
  });

  it("formatea cero", () => {
    expect(fmtMoney(0)).toBe("0.00");
  });

  it("formatea millones", () => {
    expect(fmtMoney(1000000)).toBe("1,000,000.00");
  });

  it("agrega decimales faltantes", () => {
    expect(fmtMoney(0.1)).toBe("0.10");
  });

  it("redondea a 2 decimales", () => {
    expect(fmtMoney(1.999)).toBe("2.00");
  });
});

// ── render (integración) ────────────────────────────────────────────────────

describe("render", () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) {
      try {
        rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
    }
  });

  it("genera PDF sin error y retorna totales correctos", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "invoice-test-"));
    const outPath = join(tmpDir, "test-invoice.pdf");

    const entries = [
      { date: new Date(2026, 0, 5), ticket: "[PROJ-1]", desc: "Task A", hours: 4, rawHours: 4 },
      { date: new Date(2026, 0, 6), ticket: "[PROJ-2]", desc: "Task B", hours: 6, rawHours: 6 },
    ];

    const from = { name: "Test User", email: "test@test.com", addr1: "Addr 1", addr2: "Addr 2" };
    const to = { id: "test-co", name: "Test Co", addr1: "Co Addr 1", addr2: "Co Addr 2", addr3: "Co Addr 3", rate: 50, currency: "USD", maxHoursPerDay: null };

    const result = await render(entries, 50, "January 05, 2026", "INV-2026-0105", outPath, from, to, false, "USD");

    expect(result.totalHours).toBe(10);
    expect(result.totalAmount).toBe(500);

    const stat = statSync(outPath);
    expect(stat.size).toBeGreaterThan(0);
  });

  it("genera PDF con columna rawHours", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "invoice-test-"));
    const outPath = join(tmpDir, "test-invoice-raw.pdf");

    const entries = [
      { date: new Date(2026, 0, 5), ticket: "[PROJ-1]", desc: "Task A", hours: 8, rawHours: 10 },
    ];

    const from = { name: "Test User", email: "test@test.com", addr1: "Addr 1", addr2: "Addr 2" };
    const to = { id: "test-co", name: "Test Co", addr1: "Co Addr 1", addr2: "Co Addr 2", addr3: "Co Addr 3", rate: 30, currency: "EUR", maxHoursPerDay: 8 };

    const result = await render(entries, 30, "January 05, 2026", "INV-2026-0105", outPath, from, to, true, "EUR");

    expect(result.totalHours).toBe(8);
    expect(result.totalAmount).toBe(240);
  });
});
