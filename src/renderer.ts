/**
 * Genera el PDF del invoice a partir de WorkEntry list usando pdfmake.
 */

import { createWriteStream } from "node:fs";
import PdfPrinter from "pdfmake";
import type { TDocumentDefinitions, Content, TableCell } from "pdfmake/interfaces.js";
import type { WorkEntry, ContactInfo } from "./types.js";

// ── Palette ─────────────────────────────────────────────────────────────────
const DARK_NAVY = "#0F172A";
const ACCENT_BLUE = "#3B82F6";
const LIGHT_BLUE = "#EFF6FF";
const GRAY_TEXT = "#64748B";
const LIGHT_GRAY = "#F8FAFC";
const BORDER_GRAY = "#E2E8F0";
const WHITE = "#FFFFFF";

// ── Font setup ──────────────────────────────────────────────────────────────
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const vfsFonts = require("pdfmake/build/vfs_fonts");

const printer = new PdfPrinter({
  Roboto: {
    normal: Buffer.from(vfsFonts["Roboto-Regular.ttf"], "base64"),
    bold: Buffer.from(vfsFonts["Roboto-Medium.ttf"], "base64"),
    italics: Buffer.from(vfsFonts["Roboto-Italic.ttf"], "base64"),
    bolditalics: Buffer.from(vfsFonts["Roboto-MediumItalic.ttf"], "base64"),
  },
});

// ── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mon = MONTH_NAMES[d.getMonth()];
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}/${mon}/${yy}`;
}

function formatDateLong(d: Date): string {
  const mon = MONTH_NAMES[d.getMonth()];
  return `${mon} ${String(d.getDate()).padStart(2, "0")}`;
}

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Bill-to info type (accepts both BillToInfo and Company) ─────────────────

interface BillTo {
  name: string;
  addr1: string;
  addr2: string;
  addr3: string;
}

// ── Render ───────────────────────────────────────────────────────────────────

export async function render(
  entries: WorkEntry[],
  rate: number,
  invoiceDate: string,
  invoiceNumber: string,
  outputPath: string,
  from: ContactInfo,
  to: BillTo,
  showRawHours = false,
  currency = "USD",
): Promise<{ totalHours: number; totalAmount: number }> {
  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const totalAmount = totalHours * rate;
  const billing = `${formatDateLong(entries[0].date)} – ${formatDateLong(entries[entries.length - 1].date)}, ${entries[entries.length - 1].date.getFullYear()}`;

  // ── Header ──────────────────────────────────────────────────────────────
  const header: Content = {
    table: {
      widths: ["*", "auto"],
      body: [[
        { text: "INVOICE", fontSize: 22, bold: true, color: WHITE },
        { text: `#${invoiceNumber}`, fontSize: 10, color: "#93C5FD", alignment: "right" as const },
      ]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      fillColor: () => DARK_NAVY,
      paddingLeft: () => 28,
      paddingRight: () => 20,
      paddingTop: () => 18,
      paddingBottom: () => 18,
    },
  };

  // ── From / To / Meta ────────────────────────────────────────────────────
  const fromStack: Content = {
    stack: [
      { text: "FROM", fontSize: 7.5, bold: true, color: ACCENT_BLUE },
      { text: from.name, fontSize: 11, bold: true, color: DARK_NAVY, margin: [0, 2, 0, 0] },
      { text: from.email, fontSize: 8, color: GRAY_TEXT },
      { text: from.addr1, fontSize: 8, color: GRAY_TEXT },
      { text: from.addr2, fontSize: 8, color: GRAY_TEXT },
    ],
  };

  const toStack: Content = {
    stack: [
      { text: "BILL TO", fontSize: 7.5, bold: true, color: ACCENT_BLUE },
      { text: to.name, fontSize: 11, bold: true, color: DARK_NAVY, margin: [0, 2, 0, 0] },
      { text: to.addr1, fontSize: 8, color: GRAY_TEXT },
      { text: to.addr2, fontSize: 8, color: GRAY_TEXT },
      { text: to.addr3, fontSize: 8, color: GRAY_TEXT },
    ],
  };

  const metaStack: Content = {
    stack: [
      { text: "Invoice Date", fontSize: 8, color: GRAY_TEXT, alignment: "right" as const },
      { text: invoiceDate, fontSize: 8.5, bold: true, color: DARK_NAVY, alignment: "right" as const },
      { text: " ", fontSize: 4 },
      { text: "Billing Period", fontSize: 8, color: GRAY_TEXT, alignment: "right" as const },
      { text: billing, fontSize: 8.5, bold: true, color: DARK_NAVY, alignment: "right" as const },
      { text: " ", fontSize: 4 },
      { text: "Hourly Rate", fontSize: 8, color: GRAY_TEXT, alignment: "right" as const },
      { text: `${currency} ${rate.toFixed(2)}`, fontSize: 8.5, bold: true, color: DARK_NAVY, alignment: "right" as const },
    ],
  };

  const infoSection: Content = {
    table: {
      widths: ["33%", "34%", "33%"],
      body: [[fromStack as TableCell, toStack as TableCell, metaStack as TableCell]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      fillColor: () => LIGHT_GRAY,
      paddingLeft: () => 18,
      paddingRight: () => 18,
      paddingTop: () => 18,
      paddingBottom: () => 18,
    },
  };

  // ── Work log table ──────────────────────────────────────────────────────
  let tableHeader: TableCell[];
  let tableWidths: (number | string)[];
  let tableRows: TableCell[][];

  if (showRawHours) {
    tableHeader = [
      { text: "DATE", fontSize: 8, bold: true, color: WHITE },
      { text: "TASK SUMMARY", fontSize: 8, bold: true, color: WHITE },
      { text: "WORKED", fontSize: 8, bold: true, color: WHITE, alignment: "center" as const },
      { text: "BILLED", fontSize: 8, bold: true, color: WHITE, alignment: "center" as const },
      { text: "SUBTOTAL", fontSize: 8, bold: true, color: WHITE, alignment: "right" as const },
    ];
    tableWidths = [60, "*", 50, 50, 80];
    tableRows = entries.map((e) => [
      { text: formatDate(e.date), fontSize: 8, bold: true, color: DARK_NAVY },
      {
        text: [
          { text: e.ticket, color: ACCENT_BLUE, bold: true, fontSize: 8 },
          { text: `  ${e.desc}`, color: "#334155", fontSize: 8 },
        ],
      } as TableCell,
      { text: `${e.rawHours.toFixed(1)} h`, fontSize: 8.5, color: GRAY_TEXT, alignment: "center" as const },
      { text: `${e.hours.toFixed(1)} h`, fontSize: 8.5, bold: true, color: DARK_NAVY, alignment: "center" as const },
      { text: `$${fmtMoney(e.hours * rate)}`, fontSize: 8.5, bold: true, color: DARK_NAVY, alignment: "right" as const },
    ]);
  } else {
    tableHeader = [
      { text: "DATE", fontSize: 8, bold: true, color: WHITE },
      { text: "TASK SUMMARY", fontSize: 8, bold: true, color: WHITE },
      { text: "HRS", fontSize: 8, bold: true, color: WHITE, alignment: "center" as const },
      { text: "SUBTOTAL", fontSize: 8, bold: true, color: WHITE, alignment: "right" as const },
    ];
    tableWidths = [60, "*", 50, 85];
    tableRows = entries.map((e) => [
      { text: formatDate(e.date), fontSize: 8, bold: true, color: DARK_NAVY },
      {
        text: [
          { text: e.ticket, color: ACCENT_BLUE, bold: true, fontSize: 8 },
          { text: `  ${e.desc}`, color: "#334155", fontSize: 8 },
        ],
      } as TableCell,
      { text: `${e.hours.toFixed(1)} h`, fontSize: 8.5, bold: true, color: DARK_NAVY, alignment: "center" as const },
      { text: `$${fmtMoney(e.hours * rate)}`, fontSize: 8.5, bold: true, color: DARK_NAVY, alignment: "right" as const },
    ]);
  }

  const colCount = showRawHours ? 5 : 4;
  const lastCol = colCount - 1;

  const workLog: Content = {
    table: {
      headerRows: 1,
      widths: tableWidths,
      body: [tableHeader, ...tableRows],
    },
    layout: {
      fillColor: (rowIndex: number) => {
        if (rowIndex === 0) return DARK_NAVY;
        return rowIndex % 2 === 0 ? LIGHT_GRAY : WHITE;
      },
      hLineWidth: (i: number, node: { table: { body: unknown[][] } }) =>
        i === 0 || i === node.table.body.length ? 0 : 0.5,
      hLineColor: () => BORDER_GRAY,
      vLineWidth: () => 0,
      paddingLeft: (col: number) => (col === 0 ? 14 : 10),
      paddingRight: (col: number) => (col === lastCol ? 14 : 6),
      paddingTop: () => 6,
      paddingBottom: () => 6,
    },
    margin: [0, 10, 0, 0],
  };

  // ── Totals ──────────────────────────────────────────────────────────────
  const totals: Content = {
    table: {
      widths: ["*", "auto"],
      body: [
        [
          { text: "", border: [false, false, false, false] },
          {
            text: `Total Billable Hours:   ${totalHours.toFixed(1)} h`,
            fontSize: 9,
            color: GRAY_TEXT,
            alignment: "right" as const,
          },
        ],
        [
          { text: "TOTAL AMOUNT DUE", fontSize: 11, bold: true, color: WHITE },
          {
            text: `${currency} ${fmtMoney(totalAmount)}`,
            fontSize: 13,
            bold: true,
            color: WHITE,
            alignment: "right" as const,
          },
        ],
      ],
    },
    layout: {
      fillColor: (rowIndex: number) => (rowIndex === 0 ? LIGHT_BLUE : DARK_NAVY),
      hLineWidth: (i: number) => (i === 0 ? 1.5 : 0),
      hLineColor: () => ACCENT_BLUE,
      vLineWidth: () => 0,
      paddingLeft: () => 18,
      paddingRight: () => 18,
      paddingTop: () => 9,
      paddingBottom: () => 9,
    },
  };

  // ── Document ────────────────────────────────────────────────────────────
  const docDefinition: TDocumentDefinitions = {
    pageSize: "LETTER",
    pageMargins: [32, 29, 32, 29],
    defaultStyle: { font: "Roboto" },
    content: [header, infoSection, workLog, totals],
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  const stream = createWriteStream(outputPath);
  pdfDoc.pipe(stream);
  pdfDoc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return { totalHours, totalAmount };
}
