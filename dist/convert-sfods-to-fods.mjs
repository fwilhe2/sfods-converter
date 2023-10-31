import { ensureIsArray } from "./utils.mjs";
export async function produceFods(spreadsheet) {
  const tables = ensureIsArray(spreadsheet.tables)
    .map((t) => {
      return (
        `<table:table table:name="${t?.name ? t.name : "unnamed"}">` +
        ensureIsArray(t.rows)
          .map(
            (r) =>
              `                <table:table-row>\n${ensureIsArray(r.cells)
                .map(mapCells)
                .join("")}                </table:table-row>\n`,
          )
          .join("") +
        "</table:table>"
      );
    })
    .join("\n");
  const namedRanges = spreadsheet.namedExpressions?.namedRanges
    .map(
      (r) =>
        `<table:named-range table:name="${r.name}" table:base-cell-address="${r.baseCellAddress}" table:cell-range-address="${r.cellRangeAddress}"/>`,
    )
    .join("\n");
  return FODS_TEMPLATE.replace("TABLES", tables).replace(
    "NAMED_RANGES",
    namedRanges || "",
  );
}
function mapCells(value) {
  return `                    ${tableCellElement(value)}\n`;
}
function tableCellElement(cell) {
  if (cell.formula) {
    //todo: table style name attribute
    return `<table:table-cell table:formula="${cell.formula}" ${
      cell.type
        ? `office:value-type="${cell.type}" calcext:value-type="${cell.type}"`
        : ""
    } />`;
  }
  if (cell.type === "float") {
    return `<table:table-cell office:value="${cell.value}" table:style-name="FLOAT_STYLE" office:value-type="float" calcext:value-type="float" />`;
  }
  if (cell.type === "date") {
    return `<table:table-cell office:date-value="${cell.value}" table:style-name="DATE_STYLE" office:value-type="date" calcext:value-type="date" />`;
  }
  if (cell.type === "time" && cell.value) {
    // assume hh:mm:ss format for now
    const components = cell.value.toString().split(":");
    if (components.length != 3) {
      console.warn("expected hh:mm:ss format");
    }
    return `<table:table-cell office:time-value="PT${components[0]}H${components[1]}M${components[2]}S" table:style-name="TIME_STYLE" office:value-type="time" calcext:value-type="time" />`;
  }
  if (cell.type === "currency") {
    return `<table:table-cell office:value="${cell.value}" table:style-name="EUR_STYLE" office:value-type="currency" office:currency="EUR" calcext:value-type="currency" />`;
  }
  if (cell.type === "percentage") {
    return `<table:table-cell office:value="${cell.value}" table:style-name="PERCENTAGE_STYLE" office:value-type="percentage" calcext:value-type="percentage" />`;
  }
  return `<table:table-cell office:value-type="string" calcext:value-type="string"> <text:p><![CDATA[${cell.text}]]></text:p> </table:table-cell>`;
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
        <number:currency-style style:name="___EUR_STYLE" style:volatile="true" number:language="en" number:country="DE">
            <number:number number:decimal-places="2" number:min-decimal-places="2" number:min-integer-digits="1" number:grouping="true" />
            <number:text />
            <number:currency-symbol number:language="de" number:country="DE">€</number:currency-symbol>
        </number:currency-style>
        <number:currency-style style:name="__EUR_STYLE" number:language="en" number:country="DE">
            <style:text-properties fo:color="#ff0000" />
            <number:text>-</number:text>
            <number:number number:decimal-places="2" number:min-decimal-places="2" number:min-integer-digits="1" number:grouping="true" />
            <number:text />
            <number:currency-symbol number:language="de" number:country="DE">€</number:currency-symbol>
            <style:map style:condition="value()&gt;=0" style:apply-style-name="___EUR_STYLE" />
        </number:currency-style>
        <style:style style:name="EUR_STYLE" style:family="table-cell" style:parent-style-name="Default" style:data-style-name="__EUR_STYLE" />
        <number:percentage-style style:name="__PERCENTAGE_STYLE">
            <number:number number:decimal-places="2" number:min-decimal-places="2" number:min-integer-digits="1" />
            <number:text>%</number:text>
        </number:percentage-style>
        <style:style style:name="PERCENTAGE_STYLE" style:family="table-cell" style:parent-style-name="Default" style:data-style-name="__PERCENTAGE_STYLE" />
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
