import { stringify } from "yaml";
import { Cell, Spreadsheet } from "./model.mjs";

function optional(value: string | number | undefined, elementName: string) {
  return value ? ` ${elementName}="${value}"` : "";
}

function optionalText(text: string | undefined) {
  return text ? "> <text><![CDATA[" + text + "]]></text> </cell>" : " />";
}

export function xmlPrinter(spreadsheet: Spreadsheet) {
  let result = "<spreadsheet>\n";
  spreadsheet.tables.forEach((t) => {
    result += `  <table name="${t.name}">\n`;

    t.rows.forEach((r) => {
      result += "    <row>\n";

      r.cells.forEach((c: Cell) => {
        result += `      <cell${optional(c.R, "R")}${optional(
          c.C,
          "C"
        )}${optional(c.value, "value")}${optional(
          c.formula,
          "formula"
        )}${optional(c.type, "type")}${optional(
          c.currency,
          "currency"
        )}${optionalText(c.text)}\n`;
      });

      result += "    </row>\n";
    });

    result += "    <named-expressions>\n";
    t.namedExpressions?.namedRanges.forEach((n) => {
      result += `      <named-range name="${n.name}" base-cell-address="${n.baseCellAddress}" cell-range-address="${n.cellRangeAddress}" />\n`;
    });
    result += "    </named-expressions>\n";

    result += "  </table>\n";
  });

  result += "  <named-expressions>\n";
  spreadsheet.namedExpressions?.namedRanges.forEach((n) => {
    result += `    <named-range name="${n.name}" base-cell-address="${n.baseCellAddress}" cell-range-address="${n.cellRangeAddress}" />\n`;
  });
  result += "  </named-expressions>\n";
  result += "</spreadsheet>\n";

  return result;
}

export function jsonPrinter(spreadsheet: Spreadsheet) {
  return JSON.stringify(spreadsheet, undefined, 4);
}

export function yamlPrinter(spreadsheet: Spreadsheet) {
  return stringify(spreadsheet);
}
