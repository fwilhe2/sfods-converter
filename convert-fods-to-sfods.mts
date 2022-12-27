import { XMLParser } from "fast-xml-parser";
import { readFile } from "fs/promises";
import { encureIsArray } from "./utils.mjs";

export async function convertFodsToSfods(
  fodsFilePath: string
): Promise<string> {
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

  encureIsArray(tables).forEach((table: { [x: string]: any[] }) => {
    const name = table["@_table:name"];
    const myTable: any[] = [];
    encureIsArray(table["table:table-row"]).forEach((row) => {
      const myRow: {
        text?: string;
        type?: string;
        value?: string | number;
        formula?: string;
        currency?: string;
      }[] = [];
      encureIsArray(row["table:table-cell"]).forEach((cell: any) => {
        const valueType = cell["@_office:value-type"];
        const value = cell["@_office:value"];
        const dateValue = cell["@_office:date-value"];
        const currency = cell["@_office:currency"];
        const textp = cell["text:p"];
        const formula = cell["@_table:formula"];

        if (valueType === "string") {
          myRow.push({
            text: textp,
          });
        } else if (valueType === "date") {
          myRow.push({
            type: valueType,
            value: dateValue,
          });
        } else if (formula) {
          myRow.push({
            type: valueType,
            formula: formula,
          });
        } else {
          myRow.push({
            type: valueType,
            value: value,
            currency: currency,
          });
        }
      });
      myTable.push(myRow);
    });

    outTables.push({ name: name, rows: myTable });
  });

  encureIsArray(namedExpressions).forEach((expressions) => {
    encureIsArray(expressions["table:named-range"]).forEach((range) => {
      const name = range["@_table:name"];
      const baseCell = range["@_table:base-cell-address"];
      const cellRange = range["@_table:cell-range-address"];

      outNamedExpressions.push({
        name,
        baseCell,
        cellRange,
      });
    });
  });

  let result = "<spreadsheet>";
  outTables.forEach((t) => {
    result += `<table name="${t.name}">`;

    t.rows.forEach((r) => {
      result += "<row>";

      r.forEach(
        (c: {
          formula: string | undefined;
          type: string | undefined;
          text: string | undefined;
          currency: string | undefined;
          value: string | number | undefined;
        }) => {
          if (c.text) {
            result +=
              '<cell type="string"> <text><![CDATA[' +
              c.text +
              "]]></text> </cell>";
          } else if (c.formula) {
            result += `<cell formula="${c.formula}" type="${c.type}" />`;
          } else {
            switch (c.type) {
              case "date":
                result += `<cell value="${c.value}" type="date" />`;
                break;
              case "float":
                result += `<cell value="${c.value}" type="float" />`;
                break;
              case "percentage":
                result += `<cell value="${c.value}" type="percentage" />`;
                break;
              case "currency":
                result += `<cell value="${c.value}" type="currency" currency="${c.currency}" />`;
                break;
            }
          }
        }
      );

      result += "</row>";
    });

    result += "</table>";
  });

  result += "<named-expressions>";
  outNamedExpressions.forEach((n) => {
    result += `<named-range name="${n.name}" base-cell-address="${n.baseCell}" cell-range-address="${n.cellRange}" />`;
  });
  result += "</named-expressions>";
  result += "</spreadsheet>";

  return result;
}
