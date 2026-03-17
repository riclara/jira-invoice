import { describe, it, expect } from "vitest";
import { isNewer, shouldCheck } from "./updater.js";

// ── isNewer ─────────────────────────────────────────────────────────────────

describe("isNewer", () => {
  it("retorna true si minor es mayor", () => {
    expect(isNewer("1.1.0", "1.0.0")).toBe(true);
  });

  it("retorna false si versiones son iguales", () => {
    expect(isNewer("1.0.0", "1.0.0")).toBe(false);
  });

  it("retorna false si latest es menor", () => {
    expect(isNewer("0.9.0", "1.0.0")).toBe(false);
  });

  it("retorna true si major es mayor", () => {
    expect(isNewer("2.0.0", "1.9.9")).toBe(true);
  });

  it("retorna true si patch es mayor", () => {
    expect(isNewer("1.0.1", "1.0.0")).toBe(true);
  });

  it("retorna false si patch es menor", () => {
    expect(isNewer("1.0.0", "1.0.1")).toBe(false);
  });

  it("maneja versiones con un solo segmento", () => {
    expect(isNewer("2", "1")).toBe(true);
  });
});

// ── shouldCheck ─────────────────────────────────────────────────────────────

describe("shouldCheck", () => {
  it("retorna true si no hay cache", () => {
    expect(shouldCheck(null)).toBe(true);
  });

  it("retorna false si cache es reciente (< 24h)", () => {
    const cache = { lastCheck: Date.now() - 1000, latestVersion: "1.0.0" };
    expect(shouldCheck(cache)).toBe(false);
  });

  it("retorna true si cache tiene más de 24h", () => {
    const cache = { lastCheck: Date.now() - 25 * 60 * 60 * 1000, latestVersion: "1.0.0" };
    expect(shouldCheck(cache)).toBe(true);
  });

  it("retorna false si cache tiene exactamente 24h", () => {
    const cache = { lastCheck: Date.now() - 24 * 60 * 60 * 1000, latestVersion: "1.0.0" };
    expect(shouldCheck(cache)).toBe(false);
  });
});
