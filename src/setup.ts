/**
 * Wizard de configuración inicial y gestión de empresas.
 */

import { input, confirm, select } from "@inquirer/prompts";
import chalk from "chalk";
import { saveConfig } from "./store.js";
import type { AppConfig, Company, ContactInfo } from "./types.js";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Setup wizard (primera ejecución) ────────────────────────────────────────

export async function runSetupWizard(): Promise<AppConfig> {
  console.log();
  console.log(chalk.blue("┌─────────────────────────────────────────┐"));
  console.log(chalk.blue("│") + chalk.bold.white("  ⚙️  Configuración inicial") + chalk.blue("              │"));
  console.log(chalk.blue("│") + chalk.dim("  Se guardará en ~/.invoice/config.json") + chalk.blue("  │"));
  console.log(chalk.blue("└─────────────────────────────────────────┘"));
  console.log();

  // Datos personales (FROM)
  console.log(chalk.bold("Tus datos (emisor de la factura):"));
  console.log();
  const user: ContactInfo = {
    name: await input({ message: "Nombre completo:" }),
    email: await input({ message: "Email:" }),
    addr1: await input({ message: "Dirección línea 1:" }),
    addr2: await input({ message: "Dirección línea 2 (ciudad, país):" }),
  };

  console.log();
  console.log(chalk.bold("Primera empresa (receptor):"));
  console.log();
  const company = await promptCompany();

  const config: AppConfig = { user, companies: [company] };
  saveConfig(config);

  console.log();
  console.log(chalk.green("✓") + " Configuración guardada en " + chalk.cyan("~/.invoice/config.json"));
  console.log();

  return config;
}

// ── Agregar empresa ─────────────────────────────────────────────────────────

async function promptCompany(): Promise<Company> {
  const name = await input({ message: "Nombre de la empresa:" });
  const addr1 = await input({ message: "Dirección línea 1:" });
  const addr2 = await input({ message: "Dirección línea 2:" });
  const addr3 = await input({ message: "Dirección línea 3 (país):" });
  const currency = await input({ message: "Moneda:", default: "USD" });
  const rateStr = await input({
    message: `Tarifa por hora (${currency}):`,
    validate: (v) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || "Ingresa un número válido",
  });
  const hasLimit = await confirm({ message: "¿Tiene límite de horas por día?", default: true });
  let maxHoursPerDay: number | null = null;
  if (hasLimit) {
    const maxStr = await input({
      message: "Máximo de horas por día:",
      default: "8",
      validate: (v) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || "Ingresa un número válido",
    });
    maxHoursPerDay = parseFloat(maxStr);
  }

  return {
    id: slugify(name),
    name,
    addr1,
    addr2,
    addr3,
    rate: parseFloat(rateStr),
    currency,
    maxHoursPerDay,
  };
}

export async function addCompanyWizard(config: AppConfig): Promise<Company> {
  console.log();
  console.log(chalk.bold("Nueva empresa:"));
  console.log();
  const company = await promptCompany();
  config.companies.push(company);
  saveConfig(config);
  console.log();
  console.log(chalk.green("✓") + ` Empresa ${chalk.bold(company.name)} agregada`);
  return company;
}

// ── Seleccionar empresa ─────────────────────────────────────────────────────

const ADD_NEW = "__add_new__";
const EDIT = "__edit__";
const EDIT_USER = "__edit_user__";

export async function selectCompany(config: AppConfig): Promise<{ company: Company; config: AppConfig }> {
  const choices = [
    ...config.companies.map((c) => ({
      name: `${c.name} (${c.rate} ${c.currency ?? "USD"}/h${c.maxHoursPerDay ? `, max ${c.maxHoursPerDay}h/día` : ""})`,
      value: c.id,
    })),
    { name: chalk.blue("+ Agregar nueva empresa"), value: ADD_NEW },
    { name: chalk.yellow("✏  Editar empresa"), value: EDIT },
    { name: chalk.yellow("✏  Editar mis datos"), value: EDIT_USER },
  ];

  const selected = await select({
    message: "🏢  Selecciona la empresa:",
    choices,
  });

  if (selected === ADD_NEW) {
    const company = await addCompanyWizard(config);
    return { company, config };
  }

  if (selected === EDIT) {
    const company = await editCompanyWizard(config);
    return { company, config };
  }

  if (selected === EDIT_USER) {
    await editUserWizard(config);
    return selectCompany(config);
  }

  const company = config.companies.find((c) => c.id === selected)!;
  return { company, config };
}

// ── Editar datos del usuario ────────────────────────────────────────────────

async function editUserWizard(config: AppConfig): Promise<void> {
  console.log();
  console.log(chalk.bold("Editando tus datos") + chalk.dim(" (enter para mantener valor actual)"));
  console.log();

  config.user.name = await input({ message: "Nombre completo:", default: config.user.name });
  config.user.email = await input({ message: "Email:", default: config.user.email });
  config.user.addr1 = await input({ message: "Dirección línea 1:", default: config.user.addr1 });
  config.user.addr2 = await input({ message: "Dirección línea 2 (ciudad, país):", default: config.user.addr2 });

  saveConfig(config);
  console.log();
  console.log(chalk.green("✓") + " Datos actualizados");
}

// ── Editar empresa ──────────────────────────────────────────────────────────

async function editCompanyWizard(config: AppConfig): Promise<Company> {
  const companyChoices = config.companies.map((c) => ({
    name: c.name,
    value: c.id,
  }));

  const companyId = await select({
    message: "¿Cuál empresa deseas editar?",
    choices: companyChoices,
  });

  const company = config.companies.find((c) => c.id === companyId)!;
  console.log();
  console.log(chalk.bold(`Editando ${company.name}`) + chalk.dim(" (enter para mantener valor actual)"));
  console.log();

  company.name = await input({ message: "Nombre:", default: company.name });
  company.id = slugify(company.name);
  company.addr1 = await input({ message: "Dirección línea 1:", default: company.addr1 });
  company.addr2 = await input({ message: "Dirección línea 2:", default: company.addr2 });
  company.addr3 = await input({ message: "Dirección línea 3 (país):", default: company.addr3 });
  company.currency = await input({ message: "Moneda:", default: company.currency ?? "USD" });
  const rateStr = await input({
    message: `Tarifa por hora (${company.currency}):`,
    default: String(company.rate),
    validate: (v) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || "Ingresa un número válido",
  });
  company.rate = parseFloat(rateStr);

  const hasLimit = await confirm({
    message: "¿Tiene límite de horas por día?",
    default: company.maxHoursPerDay !== null,
  });
  if (hasLimit) {
    const maxStr = await input({
      message: "Máximo de horas por día:",
      default: String(company.maxHoursPerDay ?? 8),
      validate: (v) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || "Ingresa un número válido",
    });
    company.maxHoursPerDay = parseFloat(maxStr);
  } else {
    company.maxHoursPerDay = null;
  }

  saveConfig(config);
  console.log();
  console.log(chalk.green("✓") + ` Empresa ${chalk.bold(company.name)} actualizada`);
  return company;
}
