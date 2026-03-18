# Invoice Generator

> **[English version](README.md)**
> [Post del blog en español](https://ricardolara.dev/es/blog/build-your-own-cli/)
> [Post del blog en inglés](https://ricardolara.dev/blog/build-your-own-cli/)

CLI interactivo para generar invoices PDF desde reportes de Jira Logged Time.

## Requisitos

- Node.js >= 18

## Instalacion

```bash
npm install -g jira-invoice
```

Esto instala dos comandos: `jira-invoice` y su alias `invoice`.

### Desde el codigo fuente

```bash
git clone https://github.com/riclara/jira-invoice.git
cd jira-invoice
npm install
npm run build
npm link
```

## Configuracion inicial

La primera vez que ejecutes `invoice`, un wizard te pedira:
1. Tus datos personales (nombre, email, direccion)
2. Los datos de tu primera empresa (nombre, direccion, moneda, tarifa, limite de horas)

La configuracion se guarda en `~/.invoice/config.json`.

## Uso

### Modo interactivo (recomendado)
```bash
invoice
```
Flujo completo:
1. Selecciona empresa (con opciones de agregar/editar empresa o editar tus datos)
2. Selecciona el CSV de Jira (navegacion de directorios con filtro por texto)
3. Confirma tarifa por hora
4. Vista previa con opcion de editar filas
5. Fecha del invoice (enter = hoy)
6. Numero de invoice
7. Si la empresa tiene limite de horas: opcion de incluir columna "horas trabajadas" en el PDF
8. Ruta del PDF de salida
9. Resumen y confirmacion
10. Genera el PDF

### Modo directo
```bash
invoice generate reporte.csv
invoice generate reporte.csv --company acme-corp --rate 30.20
invoice generate reporte.csv --date "April 14, 2026" --output ~/facturas/inv.pdf
```

### Opciones del modo directo

| Opcion | Descripcion |
|--------|-------------|
| `--rate <number>` | Tarifa por hora (default: tarifa de la empresa) |
| `--date <string>` | Fecha del invoice (default: hoy) |
| `--number <string>` | Numero de invoice |
| `--output <string>` | Ruta del PDF de salida |
| `--company <id>` | ID de la empresa (requerido si hay mas de una) |

### Ayuda
```bash
invoice --help
invoice generate --help
```

## Multi-empresa

Puedes tener multiples empresas configuradas, cada una con su propia moneda, tarifa y limite de horas.

Al ejecutar `invoice` en modo interactivo, el selector te permite:
- Seleccionar una empresa existente
- Agregar una nueva empresa
- Editar una empresa existente
- Editar tus datos personales (emisor)

En modo directo, usa `--company <id>` para especificar la empresa.

## Moneda

Cada empresa tiene su propia moneda (ej: USD, EUR, CRC). Se configura al crear o editar la empresa y se usa en toda la CLI y en el PDF generado.

## Limite de horas

Cada empresa puede tener un limite de horas diario (ej: 8h). Si lo tiene:
- Las horas del CSV se limitan al maximo diario (se escalan proporcionalmente si el total del dia lo excede)
- La vista previa muestra columnas "Trabajadas" y "Horas"
- Opcionalmente puedes incluir ambas columnas en el PDF

Si no tiene limite, las horas del CSV se usan tal cual.

## Edicion de filas

En la vista previa puedes editar cualquier fila antes de generar el PDF:
- Ingresa el numero de fila
- Modifica fecha, ticket, descripcion o horas
- La tabla se actualiza al instante
- Presiona enter sin numero para continuar

## Formatos de CSV soportados

| Formato | Descripcion |
|---------|-------------|
| `pivot` | Una columna por fecha (exportado con vista de calendario en Jira) |
| `date_col` | Columna `Date` con fechas o rangos (`19/Jan/26 to 30/Jan/26`) |

El formato se detecta automaticamente.

## Nombre del PDF

El archivo se genera con el formato: `invoice_DDMonYY_to_DDMonYY.pdf`

Ejemplo: `invoice_05Jan26_to_16Jan26.pdf`

## Desarrollo

```bash
npm run dev    # Ejecutar sin compilar (usa tsx)
npm run build  # Compilar a JavaScript
npm start      # Ejecutar la version compilada
```

## Estructura del proyecto

```
invoice-generator/
├── src/
│   ├── index.ts      ← Entry point (shebang + main())
│   ├── cli.ts        ← Interfaz CLI (interactivo + directo)
│   ├── parser.ts     ← Parseo de CSV (formatos pivot y date_col)
│   ├── renderer.ts   ← Generacion del PDF con pdfmake
│   ├── store.ts      ← Persistencia de config en ~/.invoice/
│   ├── setup.ts      ← Wizard de configuracion, gestion de empresas y datos del usuario
│   └── types.ts      ← Interfaces TypeScript
├── dist/             ← Output compilado
├── CLAUDE.md         ← Guia de desarrollo (arquitectura, flujos, como extender)
├── package.json
├── tsconfig.json
└── README.md
```
