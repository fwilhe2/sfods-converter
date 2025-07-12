import { stringify as yamlStringify } from "yaml";
function optional(value, elementName) {
  return value ? ` ${elementName}="${value}"` : "";
}
function optionalText(text) {
  return text ? "> <text><![CDATA[" + text + "]]></text> </cell>" : " />";
}
export function xmlPrinter(spreadsheet) {
  let result = "<spreadsheet>\n";
  spreadsheet.tables.forEach((t) => {
    result += `  <table name="${t.name}">\n`;
    t.rows.forEach((r) => {
      result += "    <row>\n";
      r.cells.forEach((c) => {
        result += `      <cell${optional(c.R, "R")}${optional(c.C, "C")}${optional(c.value, "value")}${optional(c.formula, "formula")}${optional(c.type, "type")}${optional(c.currency, "currency")}${optionalText(c.text)}\n`;
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
export function jsonPrinter(spreadsheet) {
  return JSON.stringify(spreadsheet, undefined, 4);
}
export function yamlPrinter(spreadsheet) {
  return yamlStringify(spreadsheet);
}
function cellString(c) {
  if (c.text) {
    return c.text;
  }
  if (c.formula) {
    return c.formula;
  }
  if (c.value) {
    return c.value.toString();
  }
  return "&nbsp;";
}
export function htmlPrinter(spreadsheet) {
  let result = `<style>
  table,
  th,
  td {
    border: thin solid #a0a0a0;
  }

  table {
    border-collapse: collapse;
    border-spacing: 0;
    border-width: thin 0 0 thin;
    margin: 0 0 1em;
    table-layout: auto;
    max-width: 100%;
  }

  th,
  td {
    font-weight: normal;
    text-align: left;
  }

  .numeric {
    text-align: right;
  }

  th,
  caption {
    background-color: #f1f3f4;
    font-weight: 700;
  }

  * {
    font-family: 'Courier New', Courier, monospace;
  }
</style>
`;
  spreadsheet.tables.forEach((t) => {
    result += `  <table>\n`;
    result += `  <caption>${t.name}</caption>\n`;
    t.rows.forEach((r) => {
      result += "    <tr>\n";
      r.cells.forEach((c) => {
        result += `      <td class="${c.type === "currency" || c.type === "float" ? "numeric" : "text"}">${cellString(c)}</td>\n`;
      });
      result += "    </tr>\n";
    });
    result += "  </table>\n";
    if (t.namedExpressions?.namedRanges) {
      result += "    <p>Named Ranges</p>\n";
      result += "    <ul>\n";
      t.namedExpressions?.namedRanges.forEach((n) => {
        result += `      <li>${n.name} ${n.cellRangeAddress}</li>\n`;
      });
      result += "    </ul>\n";
    }
  });
  if (spreadsheet.namedExpressions?.namedRanges) {
    result += "  <p>Named Ranges</p>\n";
    result += "  <ul>\n";
    spreadsheet.namedExpressions?.namedRanges.forEach((n) => {
      result += `    <li>${n.name} ${n.cellRangeAddress}</li>\n`;
    });
    result += "  </ul>\n";
  }
  result += "\n";
  return result;
}
