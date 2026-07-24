import { XMLParser } from "fast-xml-parser";
import { readFile } from "fs/promises";
import { ensureIsArray } from "./utils.mjs";
function toNamedExpressions(raw) {
  const namedRanges = ensureIsArray(raw["table:named-range"]).map((range) => ({
    name: range["@_table:name"],
    baseCellAddress: range["@_table:base-cell-address"],
    cellRangeAddress: range["@_table:cell-range-address"],
  }));
  return { namedRanges };
}
export async function parseFods(fodsFilePath) {
  const options = {
    ignoreAttributes: false,
  };
  const fileContent = await readFile(fodsFilePath);
  const parser = new XMLParser(options);
  const parsedFods = parser.parse(fileContent);
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
            };
          },
        );
        return { cells };
      },
    );
    const namedExpressions = ensureIsArray(
      table["table:named-expressions"],
    ).map(toNamedExpressions);
    const result = {
      name: name,
      rows: rows,
      namedExpressions: namedExpressions[0],
    };
    return result;
  });
  const namedExpressions =
    ensureIsArray(rawNamedExpressions).map(toNamedExpressions);
  const result = {
    tables: tables,
    namedExpressions: namedExpressions[0],
  };
  return result;
}
