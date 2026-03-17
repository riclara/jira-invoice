/**
 * CLI interactivo para generar invoices PDF desde CSV de Jira.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { Command } from "commander";

const require = createRequire(import.meta.url);
const { version: PKG_VERSION } = require("../package.json");
import { input, confirm, search } from "@inquirer/prompts";
import chalk from "chalk";
import Table from "cli-table3";
import ora from "ora";
import { parse } from "./parser.js";
import { render } from "./renderer.js";
import { configExists, loadConfig } from "./store.js";
import { runSetupWizard, selectCompany } from "./setup.js";
import type { WorkEntry, AppConfig, Company } from "./types.js";

// ── CSV file selector (árbol + filtro por texto) ─────────────────────────────

const GO_UP = "__GO_UP__";

function listDir(dir: string): { label: string; value: string; isDir: boolean }[] {
  const items: { label: string; value: string; isDir: boolean }[] = [];

  // Parent directory
  const parent = resolve(dir, "..");
  if (parent !== dir) {
    items.push({ label: "📁 ..", value: GO_UP, isDir: true });
  }

  try {
    const entries = readdirSync(dir, { withFileTypes: true })
      .filter((e) => !e.name.startsWith("."))
      .filter((e) => e.isDirectory() || e.name.endsWith(".csv"))
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        items.push({ label: `📁 ${e.name}/`, value: full, isDir: true });
      } else {
        items.push({ label: `   ${e.name}`, value: full, isDir: false });
      }
    }
  } catch {
    // permission errors
  }

  return items;
}

async function selectCsvFile(startDir?: string): Promise<string> {
  let cwd = startDir ?? process.cwd();

  while (true) {
    const shortCwd = cwd.replace(process.env.HOME ?? "", "~");
    const items = listDir(cwd);

    const selected = await search<string>({
      message: `📂 ${chalk.dim(shortCwd)} — escribe para filtrar:`,
      source: (term) => {
        const q = (term ?? "").toLowerCase();
        if (!q) {
          return items.map((it) => ({
            name: it.isDir ? chalk.yellow(it.label) : chalk.white(it.label),
            value: it.value,
          }));
        }
        // Strip icon prefix for matching
        return items
          .filter((it) => it.label.toLowerCase().includes(q))
          .map((it) => ({
            name: it.isDir ? chalk.yellow(it.label) : chalk.white(it.label),
            value: it.value,
          }));
      },
    });

    if (selected === GO_UP) {
      cwd = resolve(cwd, "..");
      continue;
    }

    try {
      if (statSync(selected).isDirectory()) {
        cwd = selected;
        continue;
      }
    } catch {
      // fallthrough
    }

    return selected;
  }
}

// ── Header ──────────────────────────────────────────────────────────────────

function printHeader(): void {
  console.log();
  console.log(chalk.blue("┌─────────────────────────────────────────┐"));
  console.log(chalk.blue("│") + chalk.bold.white("  ⚡ Invoice Generator") + chalk.blue("                   │"));
  console.log(chalk.blue("│") + chalk.dim("  Genera invoices PDF desde CSV de Jira") + chalk.blue("  │"));
  console.log(chalk.blue("└─────────────────────────────────────────┘"));
  console.log();
}

// ── Preview table ───────────────────────────────────────────────────────────

function printPreview(entries: WorkEntry[], rate: number, hasLimit: boolean): void {
  const head = hasLimit
    ? [
        chalk.bold.white("  #"),
        chalk.bold.white("Fecha"),
        chalk.bold.white("Ticket"),
        chalk.bold.white("Tarea"),
        chalk.bold.white("Trabajadas"),
        chalk.bold.white("Horas"),
        chalk.bold.white("Subtotal"),
      ]
    : [
        chalk.bold.white("  #"),
        chalk.bold.white("Fecha"),
        chalk.bold.white("Ticket"),
        chalk.bold.white("Tarea"),
        chalk.bold.white("Horas"),
        chalk.bold.white("Subtotal"),
      ];

  const colWidths = hasLimit
    ? [5, 14, 13, 36, 12, 9, 12]
    : [5, 14, 13, 50, 9, 12];

  const t = new Table({ head, colWidths, style: { head: [], border: ["blue"] } });

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const desc = e.desc.length > (hasLimit ? 28 : 42)
      ? e.desc.slice(0, hasLimit ? 28 : 42) + "…"
      : e.desc;

    const row = hasLimit
      ? [
          chalk.dim(String(i + 1)),
          chalk.bold.cyan(formatDate(e.date)),
          chalk.bold.blue(e.ticket),
          desc,
          chalk.dim(`${e.rawHours.toFixed(1)} h`),
          chalk.yellow(`${e.hours.toFixed(1)} h`),
          chalk.bold.green(`$${fmtMoney(e.hours * rate)}`),
        ]
      : [
          chalk.dim(String(i + 1)),
          chalk.bold.cyan(formatDate(e.date)),
          chalk.bold.blue(e.ticket),
          desc,
          chalk.yellow(`${e.hours.toFixed(1)} h`),
          chalk.bold.green(`$${fmtMoney(e.hours * rate)}`),
        ];

    t.push(row);
  }

  const totalH = entries.reduce((s, e) => s + e.hours, 0);
  const totalA = totalH * rate;
  const emptyPad = hasLimit ? ["", "", "", ""] : ["", "", ""];
  t.push([
    ...emptyPad,
    chalk.bold(`${totalH.toFixed(1)} h`),
    chalk.bold.green(`$${fmtMoney(totalA)}`),
  ]);

  console.log(t.toString());
  console.log();
}

// ── Edit row ────────────────────────────────────────────────────────────────

async function editLoop(entries: WorkEntry[], rate: number, hasLimit: boolean): Promise<WorkEntry[]> {
  const result = [...entries];

  while (true) {
    const rowStr = await input({
      message: "✏️  Editar fila # (o enter para continuar):",
      default: "",
    });

    if (!rowStr.trim()) break;

    const idx = parseInt(rowStr) - 1;
    if (isNaN(idx) || idx < 0 || idx >= result.length) {
      console.log(chalk.red(`  Fila inválida. Usa 1-${result.length}`));
      continue;
    }

    const e = result[idx];
    console.log();
    console.log(chalk.dim(`  Editando fila ${idx + 1}: ${e.ticket} ${e.desc}`));

    const newDateStr = await input({
      message: "  Fecha (dd/Mon/yy):",
      default: formatDate(e.date),
    });
    const newTicket = await input({
      message: "  Ticket:",
      default: e.ticket,
    });
    const newDesc = await input({
      message: "  Descripción:",
      default: e.desc,
    });
    const newHoursStr = await input({
      message: "  Horas:",
      default: e.hours.toFixed(1),
      validate: (v) => (!isNaN(parseFloat(v)) && parseFloat(v) >= 0) || "Número inválido",
    });

    // Parse the date
    const [dd, mon, yy] = newDateStr.split("/");
    const MONTHS: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    const newDate = new Date(2000 + parseInt(yy), MONTHS[mon] ?? 0, parseInt(dd));
    const newHours = parseFloat(newHoursStr);

    result[idx] = {
      date: newDate,
      ticket: newTicket,
      desc: newDesc,
      hours: newHours,
      rawHours: e.rawHours,
    };

    console.log(chalk.green("  ✓ Fila actualizada"));
    console.log();
    printPreview(result, rate, hasLimit);
  }

  return result;
}

// ── Warnings ────────────────────────────────────────────────────────────────

function checkWarnings(entries: WorkEntry[], maxHoursPerDay: number | null): void {
  if (maxHoursPerDay === null) return;

  const byDay = new Map<string, number>();
  for (const e of entries) {
    const key = e.date.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + e.hours);
  }

  const capped: string[] = [];
  for (const [d, h] of byDay) {
    if (Math.abs(h - maxHoursPerDay) > 0.05 && h < maxHoursPerDay) {
      capped.push(d);
    }
  }

  if (capped.length > 0) {
    console.log(chalk.yellow(`⚠  ${capped.length} día(s) con menos de ${maxHoursPerDay}h facturables`));
    for (const d of capped.sort()) {
      console.log(chalk.dim(`   • ${d}: ${byDay.get(d)!.toFixed(2)} h`));
    }
    console.log();
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  return `${dd}/${MONTH_NAMES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
}

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function defaultDateStr(): string {
  const now = new Date();
  return `${MONTH_LONG[now.getMonth()]} ${String(now.getDate()).padStart(2, "0")}, ${now.getFullYear()}`;
}

// ── Load or setup config ────────────────────────────────────────────────────

async function getConfig(): Promise<AppConfig> {
  if (configExists()) {
    return loadConfig();
  }
  return runSetupWizard();
}

// ── Interactive mode ────────────────────────────────────────────────────────

async function runInteractive(): Promise<void> {
  printHeader();

  // 1. Config
  let config = await getConfig();

  // 2. Select company
  const { company, config: updatedConfig } = await selectCompany(config);
  config = updatedConfig;
  const hasLimit = company.maxHoursPerDay !== null;

  console.log();
  const cur = company.currency ?? "USD";
  console.log(`${chalk.green("✓")} Empresa: ${chalk.bold(company.name)} (${company.rate} ${cur}/h${hasLimit ? `, max ${company.maxHoursPerDay}h/día` : ""})`);

  // 3. CSV path
  const csvPath = await selectCsvFile();

  // 4. Parse
  console.log();
  const spinner = ora({ text: chalk.blue("Leyendo CSV..."), color: "blue" }).start();
  const { entries: parsedEntries, format } = parse(csvPath, company.maxHoursPerDay);
  spinner.succeed(`${chalk.bold(String(parsedEntries.length))} entradas encontradas ${chalk.dim(`(${format} format)`)}`);
  console.log();

  // 5. Rate
  const rateStr = await input({
    message: `💵  Tarifa por hora (${cur}):`,
    default: company.rate.toFixed(2),
    validate: (v) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || "Ingresa un número válido",
  });
  const rate = parseFloat(rateStr);

  // 6. Preview
  console.log();
  console.log(chalk.dim.blue("─── Vista previa ───────────────────────────────────────"));
  console.log();
  printPreview(parsedEntries, rate, hasLimit);
  checkWarnings(parsedEntries, company.maxHoursPerDay);

  // 7. Edit loop
  const entries = await editLoop(parsedEntries, rate, hasLimit);

  // 8. Invoice date (vacío = fecha actual)
  const invDateInput = await input({
    message: "📅  Fecha del invoice (enter = hoy):",
    default: "",
  });
  const invDate = invDateInput.trim() || defaultDateStr();

  // 9. Invoice number
  const endDt = entries[entries.length - 1].date;
  const defaultNum = `INV-${endDt.getFullYear()}-${String(endDt.getMonth() + 1).padStart(2, "0")}${String(endDt.getDate()).padStart(2, "0")}`;
  const invNum = await input({
    message: "🔢  Número de invoice:",
    default: defaultNum,
  });

  // 10. Show raw hours in PDF?
  let showRawHours = false;
  if (hasLimit) {
    showRawHours = await confirm({
      message: "📊  ¿Incluir columna de horas trabajadas en el PDF?",
      default: false,
    });
  }

  // 11. Output path
  const startDt = entries[0].date;
  const fmtDt = (d: Date) => `${String(d.getDate()).padStart(2, "0")}${MONTH_NAMES[d.getMonth()]}${String(d.getFullYear()).slice(2)}`;
  const defaultOut = join(dirname(csvPath), `invoice_${fmtDt(startDt)}_to_${fmtDt(endDt)}.pdf`);
  const outPath = await input({
    message: "💾  Guardar PDF en:",
    default: defaultOut,
  });

  // 12. Summary
  console.log();
  const totalH = entries.reduce((s, e) => s + e.hours, 0);
  const summary = new Table({ style: { head: [], border: ["blue"] } });
  summary.push(
    { Empresa: company.name },
    { "Invoice #": invNum },
    { Fecha: invDate },
    { Tarifa: `${cur} ${rate.toFixed(2)}/h` },
    { "Total horas": `${totalH.toFixed(1)} h` },
    { "Total monto": `${cur} ${fmtMoney(totalH * rate)}` },
    { Archivo: outPath },
  );
  console.log(summary.toString());
  console.log();

  // 13. Confirm
  const ok = await confirm({ message: "¿Generar invoice?", default: true });
  if (!ok) {
    console.log(chalk.dim("Cancelado."));
    process.exit(0);
  }

  // 14. Generate
  console.log();
  const genSpinner = ora({ text: chalk.blue("Generando PDF..."), color: "blue" }).start();
  const { totalHours, totalAmount } = await render(
    entries, rate, invDate, invNum, outPath,
    config.user, company, showRawHours, cur,
  );
  genSpinner.succeed(chalk.bold.green("Invoice generado exitosamente"));
  console.log();
  console.log(`  ${chalk.dim("Horas:")}  ${chalk.bold(`${totalHours.toFixed(1)} h`)}`);
  console.log(`  ${chalk.dim("Monto:")}  ${chalk.bold.green(`${cur} ${fmtMoney(totalAmount)}`)}`);
  console.log(`  ${chalk.dim("Archivo:")} ${chalk.cyan(outPath)}`);
  console.log();
}

// ── Direct mode ─────────────────────────────────────────────────────────────

async function runDirect(csv: string, opts: { rate?: string; date?: string; number?: string; output?: string; company?: string }): Promise<void> {
  if (!configExists()) {
    console.log(chalk.red("No hay configuración. Ejecuta `invoice` primero para configurar."));
    process.exit(1);
  }

  const config = loadConfig();
  let company: Company;

  if (opts.company) {
    const found = config.companies.find((c) => c.id === opts.company);
    if (!found) {
      console.log(chalk.red(`Empresa no encontrada: ${opts.company}`));
      console.log(chalk.dim(`Empresas disponibles: ${config.companies.map((c) => c.id).join(", ")}`));
      process.exit(1);
    }
    company = found;
  } else if (config.companies.length === 1) {
    company = config.companies[0];
  } else {
    console.log(chalk.red("Hay múltiples empresas. Usa --company <id> para especificar."));
    console.log(chalk.dim(`Empresas disponibles: ${config.companies.map((c) => c.id).join(", ")}`));
    process.exit(1);
  }

  const rate = opts.rate ? parseFloat(opts.rate) : company.rate;
  const { entries } = parse(csv, company.maxHoursPerDay);
  const endDt = entries[entries.length - 1].date;
  const startDt = entries[0].date;
  const fmtDt = (d: Date) => `${String(d.getDate()).padStart(2, "0")}${MONTH_NAMES[d.getMonth()]}${String(d.getFullYear()).slice(2)}`;
  const invDate = opts.date || defaultDateStr();
  const invNum = opts.number ?? `INV-${endDt.getFullYear()}-${String(endDt.getMonth() + 1).padStart(2, "0")}${String(endDt.getDate()).padStart(2, "0")}`;
  const outPath = opts.output ?? `invoice_${fmtDt(startDt)}_to_${fmtDt(endDt)}.pdf`;
  const cur = company.currency ?? "USD";

  const { totalHours, totalAmount } = await render(
    entries, rate, invDate, invNum, outPath,
    config.user, company, false, cur,
  );
  console.log(`${chalk.green("✓")} ${chalk.bold(outPath)}  ${chalk.dim(`${totalHours.toFixed(1)} h · ${cur} ${fmtMoney(totalAmount)}`)}`);
}

// ── Entry point ─────────────────────────────────────────────────────────────

export async function main(): Promise<void> {
  const program = new Command();
  program
    .name("invoice")
    .description("Genera invoices PDF a partir de CSVs exportados de Jira Logged Time.")
    .version(PKG_VERSION)
    .addHelpText("after", `
Modos de uso:
  invoice                   Modo interactivo con prompts paso a paso
  invoice generate f.csv    Modo directo sin prompts

Ejemplos:
  $ invoice                              Inicia el wizard interactivo
  $ invoice generate reporte.csv         Genera con defaults de la empresa
  $ invoice generate r.csv --rate 50     Usa tarifa personalizada
  $ invoice generate r.csv --company x   Especifica empresa por ID
`)
    .action(async () => {
      try {
        await runInteractive();
      } catch (err) {
        if (err instanceof Error && err.message.includes("User force closed")) {
          console.log(chalk.dim("\nSaliendo..."));
          process.exit(0);
        }
        throw err;
      }
    });

  program
    .command("generate")
    .description("Genera invoice directamente (sin prompts interactivos)")
    .argument("<csv>", "CSV exportado de Jira")
    .option("--rate <number>", "Tarifa por hora (default: tarifa de la empresa)")
    .option("--date <string>", "Fecha del invoice (default: hoy)")
    .option("--number <string>", "Número de invoice")
    .option("--output <string>", "Ruta del PDF de salida")
    .option("--company <id>", "ID de la empresa")
    .action(runDirect);

  await program.parseAsync();
}
