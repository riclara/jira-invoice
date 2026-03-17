# Invoice Generator - Guía de desarrollo

## Arquitectura

CLI en TypeScript/Node.js que genera facturas PDF a partir de CSVs exportados de Jira Logged Time. Dos modos de uso: **interactivo** (prompts paso a paso) y **directo** (flags en la CLI).

### Módulos y responsabilidades

```
src/index.ts    → Entry point con shebang (#!/usr/bin/env node), solo importa y llama main()
src/cli.ts      → Lógica CLI: modo interactivo (prompts) y modo directo (commander)
src/parser.ts   → Parseo de CSV: detección de formato, encoding, horas, dedup, límite diario
src/renderer.ts → Generación de PDF con pdfmake: layout declarativo del invoice
src/store.ts    → Persistencia de config en ~/.invoice/config.json
src/setup.ts    → Wizard de primera ejecución, gestión de empresas y datos del usuario
src/types.ts    → Interfaces compartidas (WorkEntry, Company, AppConfig, ContactInfo)
```

### Grafo de dependencias

```
index.ts → cli.ts → parser.ts
                  → renderer.ts → types.ts
                  → store.ts → types.ts
                  → setup.ts → store.ts → types.ts
                  → types.ts
```

### Dependencias externas

| Paquete | Uso |
|---|---|
| `pdfmake` | Generación de PDF declarativa (tablas, estilos, fuentes Roboto embebidas) |
| `commander` | Parsing de argumentos CLI para modo directo |
| `@inquirer/prompts` | Prompts interactivos (`input`, `confirm`, `select`, `search`) |
| `csv-parse` | Parseo de CSV (sync) |
| `chalk` | Colores en terminal |
| `cli-table3` | Tablas ASCII para preview y resumen |
| `ora` | Spinners de carga |

## Configuración

La config se persiste en `~/.invoice/config.json` con esta estructura:

```json
{
  "user": { "name": "...", "email": "...", "addr1": "...", "addr2": "..." },
  "companies": [{
    "id": "empresa-slug",
    "name": "Empresa SA",
    "addr1": "...", "addr2": "...", "addr3": "...",
    "rate": 30.20,
    "currency": "USD",
    "maxHoursPerDay": 8.0
  }]
}
```

- `maxHoursPerDay`: `number | null`. Si es `null`, no hay límite y `hours === rawHours`.
- `currency`: string libre (ej: "USD", "EUR", "CRC"). Se muestra en la CLI y en el PDF.
- `id`: slug auto-generado del nombre de la empresa (usado en modo directo con `--company`).

## Flujo interactivo completo

```
1. printHeader()
2. getConfig() — si no existe ~/.invoice/config.json → runSetupWizard()
3. selectCompany() — selector con opciones:
   - [empresas configuradas]
   - + Agregar nueva empresa    → addCompanyWizard()
   - ✏ Editar empresa           → editCompanyWizard() (selecciona cuál, edita campos)
   - ✏ Editar mis datos         → editUserWizard() → vuelve al selector
4. selectCsvFile() — navegación de directorios + filtro por texto con @inquirer/search
5. parse(csvPath, maxHoursPerDay) — detecta formato, parsea, aplica límite diario
6. Confirmar tarifa (default: rate de la empresa)
7. printPreview() — tabla con columna extra "Trabajadas" si hay límite
8. editLoop() — editar filas por número (fecha, ticket, desc, horas)
9. Fecha del invoice (enter = fecha actual con formato "Month DD, YYYY")
10. Número de invoice (default: INV-YYYY-MMDD)
11. Si hay límite: ¿incluir columna horas trabajadas en PDF?
12. Ruta output (default: invoice_DDMonYY_to_DDMonYY.pdf junto al CSV)
13. Resumen en tabla
14. Confirmación → render() → PDF generado
```

## Flujo modo directo

```bash
invoice generate <csv> [--rate N] [--date "..."] [--number "..."] [--output "..."] [--company <id>]
```

- Requiere que `~/.invoice/config.json` exista (si no, error con instrucción de correr `invoice` primero)
- Si hay una sola empresa la usa automáticamente, si hay varias requiere `--company`
- No tiene preview, edición ni confirmación

## Convenciones

- **ESM**: `"type": "module"` en package.json, imports con `.js` extension
- **Strict mode**: `"strict": true` en tsconfig
- **Target**: ES2022, module: Node16
- **Naming**: camelCase para variables/funciones, PascalCase para tipos/interfaces
- **Idioma**: UI y comentarios en español, código en inglés
- **Moneda**: dinámico por empresa (campo `currency`), no hardcodeado

## Scripts

```bash
npm run dev    # Ejecuta con tsx (sin compilar)
npm run build  # Compila con tsc a dist/
npm start      # Ejecuta dist/index.js compilado
```

## Cómo agregar un nuevo formato CSV

1. En `src/parser.ts`, crear una función `parseNuevoFormato(text: string): WorkEntry[]`
2. Actualizar `CsvFormat` en `src/types.ts` agregando el nuevo literal
3. Actualizar la detección en `parse()` al final de `parser.ts`
4. Cada WorkEntry debe tener `rawHours` = horas originales, `hours` = horas (se limitan después por `applyDailyCap` si hay máximo diario)

## Cómo modificar el layout del PDF

El PDF se define declarativamente en `src/renderer.ts` usando pdfmake. 4 secciones en `content`:

1. **Header** — tabla con fondo DARK_NAVY, "INVOICE" + número
2. **Info section** — tabla 3 columnas: FROM (user), BILL TO (company), metadata (fecha, periodo, tarifa)
3. **Work log** — tabla con zebra striping. Si `showRawHours=true`, agrega columna WORKED y renombra HRS a BILLED
4. **Totals** — total horas y monto con la moneda de la empresa

Paleta de colores definida como constantes al inicio del archivo.

Fuentes Roboto cargadas vía `pdfmake/build/vfs_fonts` usando `createRequire` (CJS desde ESM).

Referencia de pdfmake: https://pdfmake.github.io/docs/

## Cómo agregar un campo a Company

1. Agregar el campo en `Company` interface en `src/types.ts`
2. Agregarlo en `promptCompany()` en `src/setup.ts` (creación)
3. Agregarlo en `editCompanyWizard()` en `src/setup.ts` (edición)
4. Usar `company.campo ?? valorDefault` en donde se consuma (para compatibilidad con configs existentes)
5. Actualizar el display en `selectCompany()` si aplica

## Cómo agregar un campo al usuario

1. Agregar el campo en `ContactInfo` interface en `src/types.ts`
2. Agregarlo en `runSetupWizard()` en `src/setup.ts` (primera ejecución)
3. Agregarlo en `editUserWizard()` en `src/setup.ts` (edición)
4. Si se muestra en el PDF, actualizar `src/renderer.ts` (sección fromStack)
