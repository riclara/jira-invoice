# Invoice Generator

> **[Version en espanol](README.es.md)**

Interactive CLI to generate PDF invoices from Jira Logged Time reports.

## Requirements

- Node.js >= 18

## Installation

```bash
npm install -g jira-invoice
```

This installs two commands: `jira-invoice` and its alias `invoice`.

### From source

```bash
git clone https://github.com/riclara/jira-invoice.git
cd jira-invoice
npm install
npm run build
npm link
```

## Initial setup

The first time you run `invoice`, a wizard will ask for:
1. Your personal details (name, email, address)
2. Your first company's details (name, address, currency, rate, hour limit)

Configuration is saved to `~/.invoice/config.json`.

## Usage

### Interactive mode (recommended)
```bash
invoice
```
Full flow:
1. Select company (with options to add/edit company or edit your personal data)
2. Select the Jira CSV file (directory navigation with text filtering)
3. Confirm hourly rate
4. Preview with option to edit rows
5. Invoice date (enter = today)
6. Invoice number
7. If the company has an hour limit: option to include "worked hours" column in the PDF
8. Output PDF path
9. Summary and confirmation
10. Generate PDF

### Direct mode
```bash
invoice generate report.csv
invoice generate report.csv --company acme-corp --rate 30.20
invoice generate report.csv --date "April 14, 2026" --output ~/invoices/inv.pdf
```

### Direct mode options

| Option | Description |
|--------|-------------|
| `--rate <number>` | Hourly rate (default: company's rate) |
| `--date <string>` | Invoice date (default: today) |
| `--number <string>` | Invoice number |
| `--output <string>` | Output PDF path |
| `--company <id>` | Company ID (required if more than one) |

### Help
```bash
invoice --help
invoice generate --help
```

## Multi-company

You can have multiple companies configured, each with its own currency, rate, and hour limit.

When running `invoice` in interactive mode, the selector lets you:
- Select an existing company
- Add a new company
- Edit an existing company
- Edit your personal data (issuer)

In direct mode, use `--company <id>` to specify the company.

## Currency

Each company has its own currency (e.g., USD, EUR, CRC). It's configured when creating or editing the company and is used throughout the CLI and in the generated PDF.

## Hour limit

Each company can have a daily hour limit (e.g., 8h). If set:
- CSV hours are limited to the daily maximum (scaled proportionally if the day's total exceeds it)
- The preview shows "Worked" and "Hours" columns
- You can optionally include both columns in the PDF

If no limit is set, CSV hours are used as-is.

## Row editing

In the preview you can edit any row before generating the PDF:
- Enter the row number
- Modify date, ticket, description, or hours
- The table updates instantly
- Press enter without a number to continue

## Supported CSV formats

| Format | Description |
|--------|-------------|
| `pivot` | One column per date (exported with calendar view in Jira) |
| `date_col` | `Date` column with dates or ranges (`19/Jan/26 to 30/Jan/26`) |

Format is detected automatically.

## PDF filename

The file is generated with the format: `invoice_DDMonYY_to_DDMonYY.pdf`

Example: `invoice_05Jan26_to_16Jan26.pdf`

## Development

```bash
npm run dev    # Run without compiling (uses tsx)
npm run build  # Compile to JavaScript
npm start      # Run the compiled version
```

## Project structure

```
invoice-generator/
├── src/
│   ├── index.ts      ← Entry point (shebang + main())
│   ├── cli.ts        ← CLI interface (interactive + direct)
│   ├── parser.ts     ← CSV parsing (pivot and date_col formats)
│   ├── renderer.ts   ← PDF generation with pdfmake
│   ├── store.ts      ← Config persistence in ~/.invoice/
│   ├── setup.ts      ← Setup wizard, company and user data management
│   └── types.ts      ← TypeScript interfaces
├── dist/             ← Compiled output
├── CLAUDE.md         ← Development guide (architecture, flows, how to extend)
├── package.json
├── tsconfig.json
└── README.md
```
