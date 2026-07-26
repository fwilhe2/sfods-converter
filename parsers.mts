import { XMLParser, MatcherView } from "fast-xml-parser";
import {
  Cell,
  CELL_TYPES,
  CellType,
  NamedExpressions,
  NamedRange,
  Row,
  Spreadsheet,
  Table,
} from "./model.mjs";
import { parse as yamlParse } from "yaml";
import { ensureIsArray } from "./utils.mjs";

// Paths whose children are always a collection, even when the document happens
// to contain exactly one of them. Missing an entry here means a one-element
// collection parses as a bare object and every consumer that iterates it
// breaks, so both the table-level and the document-level named ranges are
// listed.
const ARRAY_PATHS = [
  "spreadsheet.tables",
  "spreadsheet.tables.rows",
  "spreadsheet.tables.rows.cells",
  "spreadsheet.tables.namedExpressions.namedRanges",
  "spreadsheet.namedExpressions.namedRanges",
];

export function parseXml(input: string): Spreadsheet {
  const options = {
    ignoreAttributes: false,
    attributeNamePrefix: "",
    // Keep every scalar exactly as written. Without this a cell whose text is
    // "007" parses as the number 7, and one whose text is "true" parses as a
    // boolean — precisely the CSV failure mode this format exists to avoid.
    parseTagValue: false,
    parseAttributeValue: false,
    // The SFODS XML uses kebab-case attributes (base-cell-address), but the
    // model is camelCase (baseCellAddress); map them so named ranges parse.
    transformAttributeName: (name: string) =>
      name.replace(/-([a-z])/g, (_match, char: string) => char.toUpperCase()),
    // Keep jPath as a string (fast-xml-parser >=5.10 can otherwise pass a
    // MatcherView here); the array detection below matches on jPath strings.
    jPath: true,
    isArray: (name: string, jpath: string | MatcherView) => {
      if (typeof jpath !== "string") {
        throw new Error(
          "fast-xml-parser did not supply a jPath string; array detection would silently break",
        );
      }

      return ARRAY_PATHS.indexOf(jpath) !== -1;
    },
    transformTagName: (name: string) => {
      if (name === "table") {
        return "tables";
      }
      if (name === "row") {
        return "rows";
      }
      if (name === "cell") {
        return "cells";
      }
      if (name === "named-range") {
        return "namedRanges";
      }
      if (name === "named-expressions") {
        return "namedExpressions";
      }

      return name;
    },
  };
  const parser = new XMLParser(options);
  const parsed = parser.parse(input) as { spreadsheet: unknown };

  return normalizeSpreadsheet(parsed.spreadsheet);
}

export function parseJson(input: string): Spreadsheet {
  return normalizeSpreadsheet(JSON.parse(input));
}

export function parseYaml(input: string): Spreadsheet {
  return normalizeSpreadsheet(yamlParse(input));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value === "string") {
    return value;
  }
  // JSON/YAML may hand back a number or boolean where the model wants text
  // (e.g. an unquoted `text: 2020`). Anything else is a structural mistake and
  // stringifying it would silently produce "[object Object]".
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  throw new Error(`expected a scalar, got ${JSON.stringify(value)}`);
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function cellType(value: unknown): CellType | undefined {
  const name = optionalString(value);
  if (name === undefined) {
    return undefined;
  }
  if ((CELL_TYPES as readonly string[]).indexOf(name) === -1) {
    throw new Error(
      `unknown cell type "${name}"; expected one of ${CELL_TYPES.join(", ")}`,
    );
  }
  return name as CellType;
}

// A cell's text lives in a <text> child in XML and in a "text" key in
// JSON/YAML. Both land on the same property, but the XML parser hands back an
// object when the element had children.
function cellText(value: unknown): string | undefined {
  if (isRecord(value)) {
    return optionalString(value["#text"]);
  }
  return optionalString(value);
}

function normalizeCell(raw: unknown): Cell {
  const source = isRecord(raw) ? raw : {};
  const value = source.value;

  return {
    value:
      value === undefined || value === null || value === ""
        ? undefined
        : (value as Cell["value"]),
    type: cellType(source.type),
    currency: optionalString(source.currency),
    text: cellText(source.text),
    formula: optionalString(source.formula),
    R: optionalNumber(source.R),
    C: optionalNumber(source.C),
  };
}

function normalizeRow(raw: unknown): Row {
  const source = isRecord(raw) ? raw : {};
  return { cells: ensureIsArray(source.cells).map(normalizeCell) };
}

function normalizeNamedRange(raw: unknown): NamedRange {
  const source = isRecord(raw) ? raw : {};
  return {
    name: optionalString(source.name) ?? "",
    baseCellAddress: optionalString(source.baseCellAddress) ?? "",
    cellRangeAddress: optionalString(source.cellRangeAddress) ?? "",
  };
}

// An empty <named-expressions/> element parses to the string "", and a
// hand-written file may omit the key entirely. Both must yield an empty
// collection rather than something that only fails when it is iterated.
function normalizeNamedExpressions(raw: unknown): NamedExpressions {
  const source = isRecord(raw) ? raw : {};
  return {
    namedRanges: ensureIsArray(source.namedRanges).map(normalizeNamedRange),
  };
}

function normalizeTable(raw: unknown): Table {
  const source = isRecord(raw) ? raw : {};
  return {
    name: optionalString(source.name) ?? "",
    rows: ensureIsArray(source.rows).map(normalizeRow),
    namedExpressions: normalizeNamedExpressions(source.namedExpressions),
  };
}

// Every parser funnels through here so the rest of the code can rely on the
// model's shape: collections are arrays, absent values are undefined, and
// nothing is the empty string standing in for a missing element.
export function normalizeSpreadsheet(raw: unknown): Spreadsheet {
  const source = isRecord(raw) ? raw : {};
  return {
    tables: ensureIsArray(source.tables).map(normalizeTable),
    namedExpressions: normalizeNamedExpressions(source.namedExpressions),
  };
}
