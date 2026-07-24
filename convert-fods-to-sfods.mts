import { XMLParser } from "fast-xml-parser";
import { readFile } from "fs/promises";
import { Cell, NamedExpressions, Spreadsheet, Table, Text } from "./model.mjs";
import { ensureIsArray } from "./utils.mjs";

// Shape of the FODS document as produced by fast-xml-parser (attributes are
// prefixed with "@_"). Only the parts this converter reads are described.
type RawCell = {
  "@_office:value"?: string | number;
  "@_office:date-value"?: string;
  "@_office:value-type"?: Cell["type"];
  "@_office:currency"?: Cell["currency"];
  "text:p"?: Text;
  "@_table:formula"?: string;
};

type RawRow = {
  "table:table-cell"?: RawCell | RawCell[];
};

type RawNamedRange = {
  "@_table:name": string;
  "@_table:base-cell-address": string;
  "@_table:cell-range-address": string;
};

type RawNamedExpressions = {
  "table:named-range"?: RawNamedRange | RawNamedRange[];
};

type RawTable = {
  "@_table:name": string;
  "table:table-row"?: RawRow | RawRow[];
  "table:named-expressions"?: RawNamedExpressions | RawNamedExpressions[];
};

type RawFods = {
  "office:document": {
    "office:body": {
      "office:spreadsheet": {
        "table:table": RawTable | RawTable[];
        "table:named-expressions"?: RawNamedExpressions | RawNamedExpressions[];
      };
    };
  };
};

function toNamedExpressions(raw: RawNamedExpressions): NamedExpressions {
  const namedRanges = ensureIsArray(raw["table:named-range"]).map((range) => ({
    name: range["@_table:name"],
    baseCellAddress: range["@_table:base-cell-address"],
    cellRangeAddress: range["@_table:cell-range-address"],
  }));

  return { namedRanges };
}

export async function parseFods(fodsFilePath: string): Promise<Spreadsheet> {
  const options = {
    ignoreAttributes: false,
  };

  const fileContent = await readFile(fodsFilePath);

  const parser = new XMLParser(options);
  const parsedFods = parser.parse(fileContent) as RawFods;

  const spreadsheet =
    parsedFods["office:document"]["office:body"]["office:spreadsheet"];
  const rawTables = spreadsheet["table:table"];
  const rawNamedExpressions = spreadsheet["table:named-expressions"];

  const tables = ensureIsArray(rawTables).map((table) => {
    const name = table["@_table:name"].toString();
    const rows = ensureIsArray(table["table:table-row"]).map(
      (row, rowIndex) => {
        const cells = ensureIsArray(row["table:table-cell"]).map(
          (cell, columnIndex) => {
            return {
              value: cell["@_office:value"]
                ? cell["@_office:value"]
                : cell["@_office:date-value"],
              type: cell["@_office:value-type"],
              currency: cell["@_office:currency"],
              text: cell["text:p"],
              formula: cell["@_table:formula"],
              // R1C1 format is 1-indexed
              R: rowIndex + 1,
              C: columnIndex + 1,
            } as Cell;
          },
        );

        return { cells };
      },
    );

    const namedExpressions = ensureIsArray(
      table["table:named-expressions"],
    ).map(toNamedExpressions);

    const result: Table = {
      name: name,
      rows: rows,
      namedExpressions: namedExpressions[0],
    };
    return result;
  });

  const namedExpressions =
    ensureIsArray(rawNamedExpressions).map(toNamedExpressions);

  const result: Spreadsheet = {
    tables: tables,
    namedExpressions: namedExpressions[0],
  };
  return result;
}
