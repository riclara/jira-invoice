export interface WorkEntry {
  date: Date;
  ticket: string;
  desc: string;
  hours: number;      // horas facturables (limitadas si hay máximo diario)
  rawHours: number;   // horas originales del CSV
}

export type CsvFormat = "pivot" | "date_col";

export interface ContactInfo {
  name: string;
  email: string;
  addr1: string;
  addr2: string;
}

export interface BillToInfo {
  name: string;
  addr1: string;
  addr2: string;
  addr3: string;
}

export interface Company {
  id: string;
  name: string;
  addr1: string;
  addr2: string;
  addr3: string;
  rate: number;
  currency: string;
  maxHoursPerDay: number | null;
}

export interface AppConfig {
  user: ContactInfo;
  companies: Company[];
}
