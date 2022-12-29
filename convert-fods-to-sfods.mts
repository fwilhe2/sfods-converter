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
import { encureIsArray } from "./utils.mjs";

export async function convertFodsToSfods(
  fodsFilePath: string
): Promise<Spreadsheet> {
  const options = {
    ignoreAttributes: false,
  };

  const fileContent = await readFile(fodsFilePath);

  const parser = new XMLParser(options);
  const parsedFods = parser.parse(fileContent);

  const spreadsheet =
    parsedFods["office:document"]["office:body"]["office:spreadsheet"];
  const tables = spreadsheet["table:table"];
  const namedExpressions = spreadsheet["table:named-expressions"];

  const outTables: { name: any; rows: any[] }[] = [];
  const outNamedExpressions: {
    name: string;
    baseCell: string;
    cellRange: string;
  }[] = [];

  const tablesX = encureIsArray(tables).map((table: { [x: string]: any[] }) => {
    const name = table["@_table:name"].toString();
    const rows = encureIsArray(table["table:table-row"]).map(
      (row: any, rowIndex: number) => {
        const cells = encureIsArray(row["table:table-cell"]).map(
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
          }
        );

        return {
          cells: cells,
        } as Row;
      }
    );

    return { name: name, rows: rows } as Table;
  });

  const namedExpressionsX = encureIsArray(namedExpressions).map(
    (expressions) => {
      const namedRanges = encureIsArray(expressions["table:named-range"]).map(
        (range) => {
          const name = range["@_table:name"];
          const baseCellAddress = range["@_table:base-cell-address"];
          const cellRangeAddress = range["@_table:cell-range-address"];

          return {
            name,
            baseCellAddress,
            cellRangeAddress,
          } as NamedRange;
        }
      );
      return { namedRanges } as NamedExpressions;
    }
  );

  return {
    tables: tablesX,
    namedExpressions: namedExpressionsX[0],
  } as Spreadsheet;

  // let result = "<spreadsheet>";
  // outTables.forEach((t) => {
  //   result += `<table name="${t.name}">`;

  //   t.rows.forEach((r) => {
  //     result += "<row>";

  //     r.forEach(
  //       (c: {
  //         formula: string | undefined;
  //         type: string | undefined;
  //         text: string | undefined;
  //         currency: string | undefined;
  //         value: string | number | undefined;
  //       }) => {
  //         if (c.text) {
  //           result +=
  //             '<cell type="string"> <text><![CDATA[' +
  //             c.text +
  //             "]]></text> </cell>";
  //         } else if (c.formula) {
  //           result += `<cell formula="${c.formula}" type="${c.type}" />`;
  //         } else {
  //           switch (c.type) {
  //             case "date":
  //               result += `<cell value="${c.value}" type="date" />`;
  //               break;
  //             case "float":
  //               result += `<cell value="${c.value}" type="float" />`;
  //               break;
  //             case "percentage":
  //               result += `<cell value="${c.value}" type="percentage" />`;
  //               break;
  //             case "currency":
  //               result += `<cell value="${c.value}" type="currency" currency="${c.currency}" />`;
  //               break;
  //           }
  //         }
  //       }
  //     );

  //     result += "</row>";
  //   });

  //   result += "</table>";
  // });

  // result += "<named-expressions>";
  // outNamedExpressions.forEach((n) => {
  //   result += `<named-range name="${n.name}" base-cell-address="${n.baseCell}" cell-range-address="${n.cellRange}" />`;
  // });
  // result += "</named-expressions>";
  // result += "</spreadsheet>";

  // return result;
}
