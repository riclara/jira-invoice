/**
 * Wizard de configuración inicial y gestión de empresas.
 */

import { input, confirm, select } from "@inquirer/prompts";
import chalk from "chalk";
import { saveConfig } from "./store.js";
import { t, setLocale, getLocale } from "./i18n.js";
import type { Locale } from "./i18n.js";
import type { AppConfig, Company, ContactInfo } from "./types.js";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Language selector ────────────────────────────────────────────────────────

async function selectLanguage(): Promise<Locale> {
  const locale = await select<Locale>({
    message: "🌐 Language / Idioma:",
    choices: [
      { name: "English", value: "en" as Locale },
      { name: "Español", value: "es" as Locale },
    ],
  });
  setLocale(locale);
  return locale;
}

// ── Setup wizard (primera ejecución) ────────────────────────────────────────

export async function runSetupWizard(): Promise<AppConfig> {
  console.log();

  // Language selection first (always bilingual)
  const locale = await selectLanguage();

  const s = t();

  console.log();
  console.log(chalk.blue("┌─────────────────────────────────────────┐"));
  console.log(chalk.blue("│") + chalk.bold.white(`  ${s.setupTitle}`) + chalk.blue("              │"));
  console.log(chalk.blue("│") + chalk.dim(`  ${s.setupSubtitle}`) + chalk.blue("  │"));
  console.log(chalk.blue("└─────────────────────────────────────────┘"));
  console.log();

  // Datos personales (FROM)
  console.log(chalk.bold(s.setupUserData));
  console.log();
  const user: ContactInfo = {
    name: await input({ message: s.fullName }),
    email: await input({ message: s.email }),
    addr1: await input({ message: s.addressLine1 }),
    addr2: await input({ message: s.addressLine2City }),
  };

  console.log();
  console.log(chalk.bold(s.setupFirstCompany));
  console.log();
  const company = await promptCompany();

  const config: AppConfig = { locale, user, companies: [company] };
  saveConfig(config);

  console.log();
  console.log(chalk.green("✓") + " " + s.setupConfigSaved + chalk.cyan("~/.invoice/config.json"));
  console.log();

  return config;
}

// ── Agregar empresa ─────────────────────────────────────────────────────────

async function promptCompany(): Promise<Company> {
  const s = t();
  const name = await input({ message: s.companyName });
  const addr1 = await input({ message: s.addressLine1 });
  const addr2 = await input({ message: s.addressLine2 });
  const addr3 = await input({ message: s.addressLine3Country });
  const currency = await input({ message: s.currency, default: "USD" });
  const rateStr = await input({
    message: s.hourlyRate(currency),
    validate: (v) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || s.invalidNumber,
  });
  const hasLimit = await confirm({ message: s.hasHourLimit, default: true });
  let maxHoursPerDay: number | null = null;
  if (hasLimit) {
    const maxStr = await input({
      message: s.maxHoursPerDay,
      default: "8",
      validate: (v) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || s.invalidNumber,
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
  const s = t();
  console.log();
  console.log(chalk.bold(s.newCompany));
  console.log();
  const company = await promptCompany();
  config.companies.push(company);
  saveConfig(config);
  console.log();
  console.log(chalk.green("✓") + s.companyAdded(chalk.bold(company.name)));
  return company;
}

// ── Seleccionar empresa ─────────────────────────────────────────────────────

const ADD_NEW = "__add_new__";
const EDIT = "__edit__";
const EDIT_USER = "__edit_user__";
const CHANGE_LANG = "__change_lang__";

export async function selectCompany(config: AppConfig): Promise<{ company: Company; config: AppConfig }> {
  const s = t();
  const choices = [
    ...config.companies.map((c) => ({
      name: `${c.name} (${c.rate} ${c.currency ?? "USD"}/h${c.maxHoursPerDay ? s.maxPerDay(c.maxHoursPerDay) : ""})`,
      value: c.id,
    })),
    { name: chalk.blue(s.addNewCompany), value: ADD_NEW },
    { name: chalk.yellow(s.editCompany), value: EDIT },
    { name: chalk.yellow(s.editMyData), value: EDIT_USER },
    { name: chalk.cyan(s.changeLanguage), value: CHANGE_LANG },
  ];

  const selected = await select({
    message: s.selectCompany,
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

  if (selected === CHANGE_LANG) {
    const locale = await selectLanguage();
    config.locale = locale;
    saveConfig(config);
    return selectCompany(config);
  }

  const company = config.companies.find((c) => c.id === selected)!;
  return { company, config };
}

// ── Editar datos del usuario ────────────────────────────────────────────────

async function editUserWizard(config: AppConfig): Promise<void> {
  const s = t();
  console.log();
  console.log(chalk.bold(s.editingUserData) + chalk.dim(s.keepCurrentValue));
  console.log();

  config.user.name = await input({ message: s.fullName, default: config.user.name });
  config.user.email = await input({ message: s.email, default: config.user.email });
  config.user.addr1 = await input({ message: s.addressLine1, default: config.user.addr1 });
  config.user.addr2 = await input({ message: s.addressLine2City, default: config.user.addr2 });

  saveConfig(config);
  console.log();
  console.log(chalk.green("✓") + s.dataUpdated);
}

// ── Editar empresa ──────────────────────────────────────────────────────────

async function editCompanyWizard(config: AppConfig): Promise<Company> {
  const s = t();
  const companyChoices = config.companies.map((c) => ({
    name: c.name,
    value: c.id,
  }));

  const companyId = await select({
    message: s.whichCompanyEdit,
    choices: companyChoices,
  });

  const company = config.companies.find((c) => c.id === companyId)!;
  console.log();
  console.log(chalk.bold(s.editingCompany(company.name)) + chalk.dim(s.keepCurrentValue));
  console.log();

  company.name = await input({ message: s.companyNameShort, default: company.name });
  company.id = slugify(company.name);
  company.addr1 = await input({ message: s.addressLine1, default: company.addr1 });
  company.addr2 = await input({ message: s.addressLine2, default: company.addr2 });
  company.addr3 = await input({ message: s.addressLine3Country, default: company.addr3 });
  company.currency = await input({ message: s.currency, default: company.currency ?? "USD" });
  const rateStr = await input({
    message: s.hourlyRate(company.currency),
    default: String(company.rate),
    validate: (v) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || s.invalidNumber,
  });
  company.rate = parseFloat(rateStr);

  const hasLimit = await confirm({
    message: s.hasHourLimit,
    default: company.maxHoursPerDay !== null,
  });
  if (hasLimit) {
    const maxStr = await input({
      message: s.maxHoursPerDay,
      default: String(company.maxHoursPerDay ?? 8),
      validate: (v) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || s.invalidNumber,
    });
    company.maxHoursPerDay = parseFloat(maxStr);
  } else {
    company.maxHoursPerDay = null;
  }

  saveConfig(config);
  console.log();
  console.log(chalk.green("✓") + s.companyUpdated(chalk.bold(company.name)));
  return company;
}
