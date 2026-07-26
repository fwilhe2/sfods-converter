import {
  ensureIsArray,
  escapeCdata,
  escapeXmlAttr,
  escapeXmlText,
} from "./utils.mjs";
function namedRangeElement(r) {
  return `<table:named-range table:name="${escapeXmlAttr(r.name)}" table:base-cell-address="${escapeXmlAttr(r.baseCellAddress)}" table:cell-range-address="${escapeXmlAttr(r.cellRangeAddress)}"/>`;
}
// Symbols for the currencies worth spelling out; anything else falls back to
// the ISO code itself, which LibreOffice renders as-is.
const CURRENCY_SYMBOLS = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  JPY: "¥",
  CHF: "CHF",
};
function currencyStyleName(code) {
  return `CUR_${code.replace(/[^A-Za-z0-9]/g, "").toUpperCase()}`;
}
const NUMBER_ELEMENT =
  '<number:number number:decimal-places="2" number:min-decimal-places="2" number:min-integer-digits="1" number:grouping="true" />';
// One data style per currency actually used by the document. Previously every
// currency cell was written out as EUR regardless of its code, which silently
// relabelled the money in the sheet.
function currencyStyleDefinition(code) {
  const name = currencyStyleName(code);
  const symbol = escapeXmlText(CURRENCY_SYMBOLS[code.toUpperCase()] ?? code);
  return `        <number:currency-style style:name="__${name}_POSITIVE" style:volatile="true">
            ${NUMBER_ELEMENT}
            <number:text> </number:text>
            <number:currency-symbol>${symbol}</number:currency-symbol>
        </number:currency-style>
        <number:currency-style style:name="__${name}">
            <style:text-properties fo:color="#ff0000" />
            <number:text>-</number:text>
            ${NUMBER_ELEMENT}
            <number:text> </number:text>
            <number:currency-symbol>${symbol}</number:currency-symbol>
            <style:map style:condition="value()&gt;=0" style:apply-style-name="__${name}_POSITIVE" />
        </number:currency-style>
        <style:style style:name="${name}" style:family="table-cell" style:parent-style-name="Default" style:data-style-name="__${name}" />`;
}
function collectCurrencies(spreadsheet) {
  const codes = new Set();
  ensureIsArray(spreadsheet.tables).forEach((t) =>
    ensureIsArray(t.rows).forEach((r) =>
      ensureIsArray(r.cells).forEach((c) => {
        if (c.type === "currency" && c.currency) {
          codes.add(c.currency);
        }
      }),
    ),
  );
  return [...codes].sort();
}
export function produceFods(spreadsheet) {
  const tables = ensureIsArray(spreadsheet.tables)
    .map((t) => {
      const tableNamedRanges = ensureIsArray(t.namedExpressions?.namedRanges);
      const tableNamedExpressions =
        tableNamedRanges.length > 0
          ? `<table:named-expressions>${tableNamedRanges
              .map(namedRangeElement)
              .join("")}</table:named-expressions>`
          : "";
      return (
        `<table:table table:name="${escapeXmlAttr(t?.name ? t.name : "unnamed")}">` +
        ensureIsArray(t.rows)
          .map(
            (r) =>
              `                <table:table-row>\n${ensureIsArray(r.cells)
                .map(mapCells)
                .join("")}                </table:table-row>\n`,
          )
          .join("") +
        tableNamedExpressions +
        "</table:table>"
      );
    })
    .join("\n");
  const namedRanges = ensureIsArray(spreadsheet.namedExpressions?.namedRanges)
    .map(namedRangeElement)
    .join("\n");
  const currencyStyles = collectCurrencies(spreadsheet)
    .map(currencyStyleDefinition)
    .join("\n");
  const substitutions = {
    CURRENCY_STYLES: currencyStyles,
    TABLES: tables,
    NAMED_RANGES: namedRanges,
  };
  // Substituted in a single pass with a replacer function. A plain
  // String.replace would interpret "$&", "$$" and friends inside the *content*
  // as replacement patterns, and replacing one placeholder at a time would let
  // cell text that happens to read "NAMED_RANGES" be substituted in turn.
  return FODS_TEMPLATE.replace(
    /CURRENCY_STYLES|TABLES|NAMED_RANGES/g,
    (placeholder) => substitutions[placeholder],
  );
}
function mapCells(value) {
  return `                    ${tableCellElement(value)}\n`;
}
// hh:mm:ss (the sfods spelling) -> the ISO 8601 duration ODF stores.
export function timeToDuration(value) {
  const trimmed = String(value).trim();
  if (/^-?P/.test(trimmed)) {
    // Already a duration; pass it through rather than mangling it.
    return trimmed;
  }
  const match = /^(-)?(\d+):([0-5]?\d):([0-5]?\d(?:\.\d+)?)$/.exec(trimmed);
  if (!match) {
    return undefined;
  }
  const [, sign, hours, minutes, seconds] = match;
  return `${sign ?? ""}PT${hours}H${minutes}M${seconds}S`;
}
function textElement(text) {
  return text === undefined || text === null
    ? ""
    : ` <text:p><![CDATA[${escapeCdata(text)}]]></text:p> `;
}
function tableCellElement(cell) {
  const attrs = [];
  // A formula does not replace the cell's value/type — it is an extra attribute
  // carried alongside the cached result, so the value is preserved on reparse.
  if (cell.formula !== undefined && cell.formula !== "") {
    attrs.push(`table:formula="${escapeXmlAttr(cell.formula)}"`);
  }
  const rawValue = cell.value;
  const hasValue =
    rawValue !== undefined && rawValue !== null && rawValue !== "";
  const value = hasValue ? escapeXmlAttr(rawValue) : "";
  let type = cell.type;
  let styleName;
  let degradedToString = false;
  if (hasValue) {
    if (type === "float" || type === "percentage" || type === "currency") {
      attrs.push(`office:value="${value}"`);
      styleName =
        type === "float"
          ? "FLOAT_STYLE"
          : type === "percentage"
            ? "PERCENTAGE_STYLE"
            : cell.currency
              ? currencyStyleName(cell.currency)
              : undefined;
      if (type === "currency" && cell.currency) {
        attrs.push(`office:currency="${escapeXmlAttr(cell.currency)}"`);
      }
    } else if (type === "date") {
      attrs.push(`office:date-value="${value}"`);
      styleName = "DATE_STYLE";
    } else if (type === "time") {
      const duration = timeToDuration(String(rawValue));
      if (duration === undefined) {
        // Not a time after all — keep the text rather than writing an invalid
        // office:time-value that the spreadsheet application would reject.
        console.warn(
          `expected hh:mm:ss time value, got "${String(rawValue)}"; writing it as a string`,
        );
        type = "string";
        degradedToString = true;
      } else {
        attrs.push(`office:time-value="${escapeXmlAttr(duration)}"`);
        styleName = "TIME_STYLE";
      }
    } else if (type === "boolean") {
      attrs.push(`office:boolean-value="${value}"`);
    }
  }
  // Only a value-bearing cell gets a value-type. Emitting office:value-type
  // with no corresponding value (the old `office:value=""`) produces a document
  // that is not valid ODF, so a typed-but-empty cell degrades to an empty cell.
  const carriesValue =
    hasValue || type === "string" || cell.formula !== undefined;
  if (type !== undefined && carriesValue) {
    attrs.push(`office:value-type="${type}"`);
    attrs.push(`calcext:value-type="${type}"`);
  }
  if (styleName !== undefined) {
    attrs.push(`table:style-name="${styleName}"`);
  }
  // The displayed text is kept for typed cells too: it is the producer's
  // rendering of the value (e.g. "345.00 €") and dropping it loses information
  // on the way back out. A value that degraded to a string above has no other
  // carrier, so it becomes the text.
  const text = textElement(
    degradedToString && cell.text === undefined ? String(rawValue) : cell.text,
  );
  const attrString = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
  if (text === "") {
    return `<table:table-cell${attrString} />`;
  }
  return `<table:table-cell${attrString}>${text}</table:table-cell>`;
}
const FODS_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0" xmlns:css3t="http://www.w3.org/TR/css3-text/" xmlns:grddl="http://www.w3.org/2003/g/data-view#" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:formx="urn:openoffice:names:experimental:ooxml-odf-interop:xmlns:form:1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:oooc="http://openoffice.org/2004/calc" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:ooow="http://openoffice.org/2004/writer" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:rpt="http://openoffice.org/2005/report" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:ooo="http://openoffice.org/2004/office" xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:dr3d="urn:oasis:names:tc:opendocument:xmlns:dr3d:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:number="urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0" xmlns:of="urn:oasis:names:tc:opendocument:xmlns:of:1.2" xmlns:calcext="urn:org:documentfoundation:names:experimental:calc:xmlns:calcext:1.0" xmlns:tableooo="http://openoffice.org/2009/table" xmlns:drawooo="http://openoffice.org/2010/draw" xmlns:loext="urn:org:documentfoundation:names:experimental:office:xmlns:loext:1.0" xmlns:dom="http://www.w3.org/2001/xml-events" xmlns:field="urn:openoffice:names:experimental:ooo-ms-interop:xmlns:field:1.0" xmlns:math="http://www.w3.org/1998/Math/MathML" xmlns:form="urn:oasis:names:tc:opendocument:xmlns:form:1.0" xmlns:script="urn:oasis:names:tc:opendocument:xmlns:script:1.0" xmlns:xforms="http://www.w3.org/2002/xforms" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
    <office:automatic-styles>
        <number:number-style style:name="___FLOAT_STYLE" style:volatile="true">
            <number:number number:decimal-places="2" number:min-decimal-places="2" number:min-integer-digits="1" number:grouping="true" />
        </number:number-style>
        <number:number-style style:name="__FLOAT_STYLE">
            <style:text-properties fo:color="#ff0000" />
            <number:text>-</number:text>
            <number:number number:decimal-places="2" number:min-decimal-places="2" number:min-integer-digits="1" number:grouping="true" />
            <style:map style:condition="value()&gt;=0" style:apply-style-name="___FLOAT_STYLE" />
        </number:number-style>
        <style:style style:name="FLOAT_STYLE" style:family="table-cell" style:parent-style-name="Default" style:data-style-name="__FLOAT_STYLE" />
        <number:date-style style:name="__DATE_STYLE">
            <number:year number:style="long" />
            <number:text>-</number:text>
            <number:month number:style="long" />
            <number:text>-</number:text>
            <number:day number:style="long" />
        </number:date-style>
        <style:style style:name="DATE_STYLE" style:family="table-cell" style:parent-style-name="Default" style:data-style-name="__DATE_STYLE" />
        <number:time-style style:name="__TIME_STYLE">
            <number:hours number:style="long" />
            <number:text>:</number:text>
            <number:minutes number:style="long" />
            <number:text>:</number:text>
            <number:seconds number:style="long" />
        </number:time-style>
        <style:style style:name="TIME_STYLE" style:family="table-cell" style:parent-style-name="Default" style:data-style-name="__TIME_STYLE" />
        <number:percentage-style style:name="__PERCENTAGE_STYLE">
            <number:number number:decimal-places="2" number:min-decimal-places="2" number:min-integer-digits="1" />
            <number:text>%</number:text>
        </number:percentage-style>
        <style:style style:name="PERCENTAGE_STYLE" style:family="table-cell" style:parent-style-name="Default" style:data-style-name="__PERCENTAGE_STYLE" />
CURRENCY_STYLES
    </office:automatic-styles>
    <office:body>
        <office:spreadsheet>
TABLES
            <table:named-expressions>
NAMED_RANGES
            </table:named-expressions>
        </office:spreadsheet>
    </office:body>
</office:document>`;
