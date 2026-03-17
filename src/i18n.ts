/**
 * Internacionalización (i18n) para el CLI.
 * Soporta español e inglés.
 */

export type Locale = "es" | "en";

let currentLocale: Locale = "es";

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

// ── Translation keys ───────────────────────────────────────────────────────

interface Translations {
  // Header
  headerSubtitle: string;

  // Setup wizard
  setupTitle: string;
  setupSubtitle: string;
  setupUserData: string;
  setupFirstCompany: string;
  setupConfigSaved: string;

  // User fields
  fullName: string;
  email: string;
  addressLine1: string;
  addressLine2City: string;
  addressLine2: string;
  addressLine3Country: string;

  // Company fields
  companyName: string;
  companyNameShort: string;
  currency: string;
  hourlyRate: (cur: string) => string;
  hasHourLimit: string;
  maxHoursPerDay: string;
  invalidNumber: string;

  // Company management
  newCompany: string;
  companyAdded: (name: string) => string;
  companyUpdated: (name: string) => string;
  selectCompany: string;
  addNewCompany: string;
  editCompany: string;
  editMyData: string;
  whichCompanyEdit: string;
  editingCompany: (name: string) => string;
  keepCurrentValue: string;
  editingUserData: string;
  dataUpdated: string;
  changeLanguage: string;
  selectLanguage: string;

  // Company display
  maxPerDay: (h: number) => string;

  // CSV selector
  csvFilterPrompt: (dir: string) => string;

  // Preview
  colNum: string;
  colDate: string;
  colTicket: string;
  colTask: string;
  colWorked: string;
  colHours: string;
  colSubtotal: string;

  // Edit loop
  editRowPrompt: string;
  invalidRow: (max: number) => string;
  editingRow: (num: number, ticket: string, desc: string) => string;
  datePrompt: string;
  ticketPrompt: string;
  descriptionPrompt: string;
  hoursPrompt: string;
  rowUpdated: string;

  // Warnings
  daysBelowLimit: (count: number, max: number) => string;

  // Interactive flow
  company: string;
  readingCsv: string;
  entriesFound: (count: number, format: string) => string;
  ratePrompt: (cur: string) => string;
  preview: string;
  invoiceDatePrompt: string;
  invoiceNumberPrompt: string;
  includeWorkedHours: string;
  savePdfPrompt: string;

  // Summary
  summaryCompany: string;
  summaryInvoiceNum: string;
  summaryDate: string;
  summaryRate: string;
  summaryTotalHours: string;
  summaryTotalAmount: string;
  summaryFile: string;

  // Confirmation & generation
  generateInvoice: string;
  cancelled: string;
  generatingPdf: string;
  invoiceGenerated: string;
  labelHours: string;
  labelAmount: string;
  labelFile: string;

  // Direct mode errors
  noConfig: string;
  companyNotFound: (id: string) => string;
  availableCompanies: (ids: string) => string;
  multipleCompanies: string;

  // Exit
  exiting: string;

  // Help text
  cliDescription: string;
  generateDescription: string;
  csvArgument: string;
  optRate: string;
  optDate: string;
  optNumber: string;
  optOutput: string;
  optCompany: string;
  helpAfterText: string;

  // Updater
  newVersionAvailable: string;
  updateCommand: string;

  // Parser
  unrecognizedMonth: (mon: string) => string;
}

// ── Spanish translations ───────────────────────────────────────────────────

const es: Translations = {
  headerSubtitle: "Genera invoices PDF desde CSV de Jira",

  setupTitle: "⚙️  Configuración inicial",
  setupSubtitle: "Se guardará en ~/.invoice/config.json",
  setupUserData: "Tus datos (emisor de la factura):",
  setupFirstCompany: "Primera empresa (receptor):",
  setupConfigSaved: "Configuración guardada en ",

  fullName: "Nombre completo:",
  email: "Email:",
  addressLine1: "Dirección línea 1:",
  addressLine2City: "Dirección línea 2 (ciudad, país):",
  addressLine2: "Dirección línea 2:",
  addressLine3Country: "Dirección línea 3 (país):",

  companyName: "Nombre de la empresa:",
  companyNameShort: "Nombre:",
  currency: "Moneda:",
  hourlyRate: (cur) => `Tarifa por hora (${cur}):`,
  hasHourLimit: "¿Tiene límite de horas por día?",
  maxHoursPerDay: "Máximo de horas por día:",
  invalidNumber: "Ingresa un número válido",

  newCompany: "Nueva empresa:",
  companyAdded: (name) => ` Empresa ${name} agregada`,
  companyUpdated: (name) => ` Empresa ${name} actualizada`,
  selectCompany: "🏢  Selecciona la empresa:",
  addNewCompany: "+ Agregar nueva empresa",
  editCompany: "✏  Editar empresa",
  editMyData: "✏  Editar mis datos",
  whichCompanyEdit: "¿Cuál empresa deseas editar?",
  editingCompany: (name) => `Editando ${name}`,
  keepCurrentValue: " (enter para mantener valor actual)",
  editingUserData: "Editando tus datos",
  dataUpdated: " Datos actualizados",
  changeLanguage: "🌐 Cambiar idioma / Change language",
  selectLanguage: "🌐 Language / Idioma:",

  maxPerDay: (h) => `, max ${h}h/día`,

  csvFilterPrompt: (dir) => `📂 ${dir} — escribe para filtrar:`,

  colNum: "  #",
  colDate: "Fecha",
  colTicket: "Ticket",
  colTask: "Tarea",
  colWorked: "Trabajadas",
  colHours: "Horas",
  colSubtotal: "Subtotal",

  editRowPrompt: "✏️  Editar fila # (o enter para continuar):",
  invalidRow: (max) => `  Fila inválida. Usa 1-${max}`,
  editingRow: (num, ticket, desc) => `  Editando fila ${num}: ${ticket} ${desc}`,
  datePrompt: "  Fecha (dd/Mon/yy):",
  ticketPrompt: "  Ticket:",
  descriptionPrompt: "  Descripción:",
  hoursPrompt: "  Horas:",
  rowUpdated: "  ✓ Fila actualizada",

  daysBelowLimit: (count, max) => `⚠  ${count} día(s) con menos de ${max}h facturables`,

  company: "Empresa",
  readingCsv: "Leyendo CSV...",
  entriesFound: (count, format) => `${count} entradas encontradas (${format} format)`,
  ratePrompt: (cur) => `💵  Tarifa por hora (${cur}):`,
  preview: "─── Vista previa ───────────────────────────────────────",
  invoiceDatePrompt: "📅  Fecha del invoice (enter = hoy):",
  invoiceNumberPrompt: "🔢  Número de invoice:",
  includeWorkedHours: "📊  ¿Incluir columna de horas trabajadas en el PDF?",
  savePdfPrompt: "💾  Guardar PDF en:",

  summaryCompany: "Empresa",
  summaryInvoiceNum: "Invoice #",
  summaryDate: "Fecha",
  summaryRate: "Tarifa",
  summaryTotalHours: "Total horas",
  summaryTotalAmount: "Total monto",
  summaryFile: "Archivo",

  generateInvoice: "¿Generar invoice?",
  cancelled: "Cancelado.",
  generatingPdf: "Generando PDF...",
  invoiceGenerated: "Invoice generado exitosamente",
  labelHours: "Horas:",
  labelAmount: "Monto:",
  labelFile: "Archivo:",

  noConfig: "No hay configuración. Ejecuta `invoice` primero para configurar.",
  companyNotFound: (id) => `Empresa no encontrada: ${id}`,
  availableCompanies: (ids) => `Empresas disponibles: ${ids}`,
  multipleCompanies: "Hay múltiples empresas. Usa --company <id> para especificar.",

  exiting: "Saliendo...",

  cliDescription: "Genera invoices PDF a partir de CSVs exportados de Jira Logged Time.",
  generateDescription: "Genera invoice directamente (sin prompts interactivos)",
  csvArgument: "CSV exportado de Jira",
  optRate: "Tarifa por hora (default: tarifa de la empresa)",
  optDate: "Fecha del invoice (default: hoy)",
  optNumber: "Número de invoice",
  optOutput: "Ruta del PDF de salida",
  optCompany: "ID de la empresa",
  helpAfterText: `
Modos de uso:
  invoice                   Modo interactivo con prompts paso a paso
  invoice generate f.csv    Modo directo sin prompts

Ejemplos:
  $ invoice                              Inicia el wizard interactivo
  $ invoice generate reporte.csv         Genera con defaults de la empresa
  $ invoice generate r.csv --rate 50     Usa tarifa personalizada
  $ invoice generate r.csv --company x   Especifica empresa por ID
`,

  newVersionAvailable: "⚡ Nueva versión disponible: ",
  updateCommand: "   Ejecuta: ",

  unrecognizedMonth: (mon) => `Mes no reconocido: ${mon}`,
};

// ── English translations ───────────────────────────────────────────────────

const en: Translations = {
  headerSubtitle: "Generate PDF invoices from Jira CSV",

  setupTitle: "⚙️  Initial Setup",
  setupSubtitle: "Will be saved to ~/.invoice/config.json",
  setupUserData: "Your info (invoice sender):",
  setupFirstCompany: "First company (recipient):",
  setupConfigSaved: "Configuration saved to ",

  fullName: "Full name:",
  email: "Email:",
  addressLine1: "Address line 1:",
  addressLine2City: "Address line 2 (city, country):",
  addressLine2: "Address line 2:",
  addressLine3Country: "Address line 3 (country):",

  companyName: "Company name:",
  companyNameShort: "Name:",
  currency: "Currency:",
  hourlyRate: (cur) => `Hourly rate (${cur}):`,
  hasHourLimit: "Has daily hour limit?",
  maxHoursPerDay: "Max hours per day:",
  invalidNumber: "Enter a valid number",

  newCompany: "New company:",
  companyAdded: (name) => ` Company ${name} added`,
  companyUpdated: (name) => ` Company ${name} updated`,
  selectCompany: "🏢  Select company:",
  addNewCompany: "+ Add new company",
  editCompany: "✏  Edit company",
  editMyData: "✏  Edit my info",
  whichCompanyEdit: "Which company do you want to edit?",
  editingCompany: (name) => `Editing ${name}`,
  keepCurrentValue: " (press enter to keep current value)",
  editingUserData: "Editing your info",
  dataUpdated: " Data updated",
  changeLanguage: "🌐 Cambiar idioma / Change language",
  selectLanguage: "🌐 Language / Idioma:",

  maxPerDay: (h) => `, max ${h}h/day`,

  csvFilterPrompt: (dir) => `📂 ${dir} — type to filter:`,

  colNum: "  #",
  colDate: "Date",
  colTicket: "Ticket",
  colTask: "Task",
  colWorked: "Worked",
  colHours: "Hours",
  colSubtotal: "Subtotal",

  editRowPrompt: "✏️  Edit row # (or press enter to continue):",
  invalidRow: (max) => `  Invalid row. Use 1-${max}`,
  editingRow: (num, ticket, desc) => `  Editing row ${num}: ${ticket} ${desc}`,
  datePrompt: "  Date (dd/Mon/yy):",
  ticketPrompt: "  Ticket:",
  descriptionPrompt: "  Description:",
  hoursPrompt: "  Hours:",
  rowUpdated: "  ✓ Row updated",

  daysBelowLimit: (count, max) => `⚠  ${count} day(s) with less than ${max}h billable`,

  company: "Company",
  readingCsv: "Reading CSV...",
  entriesFound: (count, format) => `${count} entries found (${format} format)`,
  ratePrompt: (cur) => `💵  Hourly rate (${cur}):`,
  preview: "─── Preview ────────────────────────────────────────────",
  invoiceDatePrompt: "📅  Invoice date (press enter = today):",
  invoiceNumberPrompt: "🔢  Invoice number:",
  includeWorkedHours: "📊  Include worked hours column in the PDF?",
  savePdfPrompt: "💾  Save PDF to:",

  summaryCompany: "Company",
  summaryInvoiceNum: "Invoice #",
  summaryDate: "Date",
  summaryRate: "Rate",
  summaryTotalHours: "Total hours",
  summaryTotalAmount: "Total amount",
  summaryFile: "File",

  generateInvoice: "Generate invoice?",
  cancelled: "Cancelled.",
  generatingPdf: "Generating PDF...",
  invoiceGenerated: "Invoice generated successfully",
  labelHours: "Hours:",
  labelAmount: "Amount:",
  labelFile: "File:",

  noConfig: "No configuration found. Run `invoice` first to set up.",
  companyNotFound: (id) => `Company not found: ${id}`,
  availableCompanies: (ids) => `Available companies: ${ids}`,
  multipleCompanies: "Multiple companies found. Use --company <id> to specify.",

  exiting: "Exiting...",

  cliDescription: "Generate PDF invoices from Jira Logged Time CSV exports.",
  generateDescription: "Generate invoice directly (no interactive prompts)",
  csvArgument: "Jira CSV export file",
  optRate: "Hourly rate (default: company rate)",
  optDate: "Invoice date (default: today)",
  optNumber: "Invoice number",
  optOutput: "Output PDF path",
  optCompany: "Company ID",
  helpAfterText: `
Usage modes:
  invoice                   Interactive mode with step-by-step prompts
  invoice generate f.csv    Direct mode without prompts

Examples:
  $ invoice                              Start the interactive wizard
  $ invoice generate report.csv          Generate with company defaults
  $ invoice generate r.csv --rate 50     Use a custom hourly rate
  $ invoice generate r.csv --company x   Specify company by ID
`,

  newVersionAvailable: "⚡ New version available: ",
  updateCommand: "   Run: ",

  unrecognizedMonth: (mon) => `Unrecognized month: ${mon}`,
};

// ── Translation accessor ───────────────────────────────────────────────────

const locales: Record<Locale, Translations> = { es, en };

export function t(): Translations {
  return locales[currentLocale];
}
