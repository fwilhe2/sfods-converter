import { stringify as yamlStringify } from "yaml";
import { Cell, NamedRange, Spreadsheet, Table } from "./model.mjs";
import {
  ensureIsArray,
  escapeCdata,
  escapeHtml,
  escapeXmlAttr,
} from "./utils.mjs";

function optional(
  value: string | number | boolean | undefined,
  elementName: string,
) {
  // Only skip genuinely absent values — a numeric 0 or a falsy value must still
  // be emitted, and attribute contents must be XML-escaped.
  return value === undefined || value === null || value === ""
    ? ""
    : ` ${elementName}="${escapeXmlAttr(value)}"`;
}

function optionalText(text: string | undefined) {
  // Empty text and absent text are indistinguishable once reparsed, so both
  // collapse to the short form rather than an empty CDATA section.
  return text === undefined || text === null || text === ""
    ? " />"
    : "> <text><![CDATA[" + escapeCdata(text) + "]]></text> </cell>";
}

function namedExpressionsElement(
  spreadsheet: Spreadsheet | Table,
  indent: string,
): string {
  const ranges = ensureIsArray(spreadsheet.namedExpressions?.namedRanges);
  if (ranges.length === 0) {
    // An empty element carries nothing and only creates a shape ("" once
    // reparsed) that consumers have to defend against.
    return "";
  }

  return (
    `${indent}<named-expressions>\n` +
    ranges
      .map(
        (n) =>
          `${indent}  <named-range name="${escapeXmlAttr(n.name)}" base-cell-address="${escapeXmlAttr(n.baseCellAddress)}" cell-range-address="${escapeXmlAttr(n.cellRangeAddress)}" />\n`,
      )
      .join("") +
    `${indent}</named-expressions>\n`
  );
}

export function xmlPrinter(spreadsheet: Spreadsheet) {
  let result = "<spreadsheet>\n";
  ensureIsArray(spreadsheet.tables).forEach((t) => {
    result += `  <table name="${escapeXmlAttr(t.name)}">\n`;

    ensureIsArray(t.rows).forEach((r) => {
      result += "    <row>\n";

      ensureIsArray(r.cells).forEach((c: Cell) => {
        result += `      <cell${optional(c.R, "R")}${optional(
          c.C,
          "C",
        )}${optional(c.value, "value")}${optional(
          c.formula,
          "formula",
        )}${optional(c.type, "type")}${optional(
          c.currency,
          "currency",
        )}${optionalText(c.text)}\n`;
      });

      result += "    </row>\n";
    });

    result += namedExpressionsElement(t, "    ");
    result += "  </table>\n";
  });

  result += namedExpressionsElement(spreadsheet, "  ");
  result += "</spreadsheet>\n";

  return result;
}

export function jsonPrinter(spreadsheet: Spreadsheet) {
  return JSON.stringify(spreadsheet, undefined, 4);
}

export function yamlPrinter(spreadsheet: Spreadsheet) {
  return yamlStringify(spreadsheet);
}

// Absence, not falsiness: a cell holding the number 0 has content and must not
// render as an empty cell.
function present(value: string | number | boolean | undefined): boolean {
  return value !== undefined && value !== null && value !== "";
}

function cellString(c: Cell): string {
  if (present(c.text)) {
    return escapeHtml(c.text!);
  }

  if (present(c.value)) {
    return escapeHtml(c.value!);
  }

  if (present(c.formula)) {
    return escapeHtml(c.formula!);
  }

  return "&nbsp;";
}

const NUMERIC_TYPES: ReadonlySet<string> = new Set([
  "float",
  "currency",
  "percentage",
  "date",
  "time",
]);

export function htmlPrinter(spreadsheet: Spreadsheet) {
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
  ensureIsArray(spreadsheet.tables).forEach((t) => {
    result += `  <table>\n`;
    result += `  <caption>${escapeHtml(t.name)}</caption>\n`;
    ensureIsArray(t.rows).forEach((r) => {
      result += "    <tr>\n";

      ensureIsArray(r.cells).forEach((c: Cell) => {
        result += `      <td class="${
          c.type !== undefined && NUMERIC_TYPES.has(c.type) ? "numeric" : "text"
        }">${cellString(c)}</td>\n`;
      });

      result += "    </tr>\n";
    });

    result += "  </table>\n";
    result += namedRangeList(t.namedExpressions?.namedRanges, "    ");
  });

  result += namedRangeList(spreadsheet.namedExpressions?.namedRanges, "  ");
  result += "\n";

  return result;
}

function namedRangeList(
  ranges: NamedRange[] | undefined,
  indent: string,
): string {
  // The previous check tested the array itself for truthiness, so an empty
  // collection still produced an empty "Named Ranges" heading.
  const present = ensureIsArray(ranges);
  if (present.length === 0) {
    return "";
  }

  return (
    `${indent}<p>Named Ranges</p>\n${indent}<ul>\n` +
    present
      .map(
        (n) =>
          `${indent}  <li>${escapeHtml(n.name)} ${escapeHtml(n.cellRangeAddress)}</li>\n`,
      )
      .join("") +
    `${indent}</ul>\n`
  );
}
