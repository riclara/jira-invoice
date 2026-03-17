import { describe, it, expect, beforeEach } from "vitest";
import { t, setLocale, getLocale } from "./i18n.js";

describe("i18n", () => {
  beforeEach(() => {
    setLocale("es"); // reset to default
  });

  describe("getLocale / setLocale", () => {
    it("default locale is es", () => {
      expect(getLocale()).toBe("es");
    });

    it("changes locale to en", () => {
      setLocale("en");
      expect(getLocale()).toBe("en");
    });

    it("changes locale back to es", () => {
      setLocale("en");
      setLocale("es");
      expect(getLocale()).toBe("es");
    });
  });

  describe("t()", () => {
    it("returns Spanish translations by default", () => {
      const s = t();
      expect(s.headerSubtitle).toBe("Genera invoices PDF desde CSV de Jira");
      expect(s.generateInvoice).toBe("¿Generar invoice?");
      expect(s.cancelled).toBe("Cancelado.");
    });

    it("returns English translations when locale is en", () => {
      setLocale("en");
      const s = t();
      expect(s.headerSubtitle).toBe("Generate PDF invoices from Jira CSV");
      expect(s.generateInvoice).toBe("Generate invoice?");
      expect(s.cancelled).toBe("Cancelled.");
    });

    it("dynamic strings work in Spanish", () => {
      const s = t();
      expect(s.hourlyRate("EUR")).toBe("Tarifa por hora (EUR):");
      expect(s.companyNotFound("acme")).toBe("Empresa no encontrada: acme");
      expect(s.daysBelowLimit(3, 8)).toBe("⚠  3 día(s) con menos de 8h facturables");
    });

    it("dynamic strings work in English", () => {
      setLocale("en");
      const s = t();
      expect(s.hourlyRate("EUR")).toBe("Hourly rate (EUR):");
      expect(s.companyNotFound("acme")).toBe("Company not found: acme");
      expect(s.daysBelowLimit(3, 8)).toBe("⚠  3 day(s) with less than 8h billable");
    });

    it("both locales have all the same keys", () => {
      const esKeys = Object.keys(t());
      setLocale("en");
      const enKeys = Object.keys(t());
      expect(esKeys.sort()).toEqual(enKeys.sort());
    });

    it("language selector strings are bilingual in both locales", () => {
      expect(t().changeLanguage).toContain("Cambiar idioma");
      expect(t().changeLanguage).toContain("Change language");
      setLocale("en");
      expect(t().changeLanguage).toContain("Cambiar idioma");
      expect(t().changeLanguage).toContain("Change language");
    });
  });
});
