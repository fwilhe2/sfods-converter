import { XMLParser } from "fast-xml-parser";
import { readFile } from "fs/promises";
import {
  Cell,
  NamedExpressions,
  NamedRange,
  Row,
  Spreadsheet,
  Table,
} from "./model.mjs";
import { ensureIsArray } from "./utils.mjs";

export async function parseFods(fodsFilePath: string): Promise<Spreadsheet> {
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

  const tables = ensureIsArray(rawTables).map(
    (table: { [x: string]: any[] }) => {
      const name = table["@_table:name"].toString();
      const rows = ensureIsArray(table["table:table-row"]).map(
        (row: any, rowIndex: number) => {
          const cells = ensureIsArray(row["table:table-cell"]).map(
            (cell: any, columnIndex: number) => {
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

          return {
            cells: cells,
          } as Row;
        },
      );

      const namedExpressions = ensureIsArray(
        table["table:named-expressions"],
      ).map((expressions) => {
        const namedRanges = ensureIsArray(expressions["table:named-range"]).map(
          (range) => {
            const name = range["@_table:name"];
            const baseCellAddress = range["@_table:base-cell-address"];
            const cellRangeAddress = range["@_table:cell-range-address"];

            return {
              name,
              baseCellAddress,
              cellRangeAddress,
            } as NamedRange;
          },
        );

        return { namedRanges } as NamedExpressions;
      });

      return {
        name: name,
        rows: rows,
        namedExpressions: namedExpressions[0],
      } as Table;

      return { name: name, rows: rows } as Table;
    },
  );

  const namedExpressions = ensureIsArray(rawNamedExpressions).map(
    (expressions) => {
      const namedRanges = ensureIsArray(expressions["table:named-range"]).map(
        (range) => {
          const name = range["@_table:name"];
          const baseCellAddress = range["@_table:base-cell-address"];
          const cellRangeAddress = range["@_table:cell-range-address"];

          return {
            name,
            baseCellAddress,
            cellRangeAddress,
          } as NamedRange;
        },
      );
      return { namedRanges } as NamedExpressions;
    },
  );

  return {
    tables: tables,
    namedExpressions: namedExpressions[0],
  } as Spreadsheet;
}
