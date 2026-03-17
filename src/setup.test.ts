import { describe, it, expect } from "vitest";
import { slugify } from "./setup.js";

describe("slugify", () => {
  it("convierte nombre con espacios a kebab-case", () => {
    expect(slugify("Acme Corp")).toBe("acme-corp");
  });

  it("maneja caracteres especiales", () => {
    expect(slugify("Company & Sons!")).toBe("company-sons");
  });

  it("convierte a minúsculas", () => {
    expect(slugify("UPPER CASE")).toBe("upper-case");
  });

  it("retorna slug sin cambios si ya es válido", () => {
    expect(slugify("already-slug")).toBe("already-slug");
  });

  it("elimina guiones al inicio y final", () => {
    expect(slugify("---leading---")).toBe("leading");
  });

  it("maneja espacios extremos", () => {
    expect(slugify("  spaces  ")).toBe("spaces");
  });

  it("colapsa múltiples separadores", () => {
    expect(slugify("a   b   c")).toBe("a-b-c");
  });

  it("maneja paréntesis", () => {
    expect(slugify("My Company (USA)")).toBe("my-company-usa");
  });

  it("maneja acentos como separadores", () => {
    expect(slugify("café résumé")).toBe("caf-r-sum");
  });
});
