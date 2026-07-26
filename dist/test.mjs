import test from "node:test";
import { strict as assert } from "node:assert";
import { durationToTime, parseFods } from "./convert-fods-to-sfods.mjs";
import { produceFods, timeToDuration } from "./convert-sfods-to-fods.mjs";
import { readFile } from "node:fs/promises";
import { parseJson, parseXml, parseYaml } from "./parsers.mjs";
import { htmlPrinter, xmlPrinter } from "./printers.mjs";
function cell(partial) {
  return {
    value: undefined,
    type: "string",
    currency: undefined,
    text: undefined,
    formula: undefined,
    R: undefined,
    C: undefined,
    ...partial,
  };
}
function sheet(cells) {
  return {
    tables: [
      { name: "Sheet1", rows: [{ cells }], namedExpressions: undefined },
    ],
    namedExpressions: undefined,
  };
}
test("Can convert no named ranges spreadsheet into model representation", async () => {
  const actual = await parseFods("test_data/no-named-ranges.fods");
  assert(actual.tables.length === 1);
  assert(actual.tables[0].name === "Sheet1");
  assert(actual.tables[0].rows.length === 3);
  assert(actual.namedExpressions?.namedRanges.length === 0);
});
test("Can convert accounts spreadsheet into model representation", async () => {
  const actual = await parseFods("test_data/accountsSpreadsheet.fods");
  assert(actual.tables.length === 1);
  assert(actual.tables[0].name === "Sheet1");
  assert(actual.tables[0].rows.length === 6);
  assert(actual.namedExpressions?.namedRanges.length === 6);
});
test("Can convert assets spreadsheet into model representation", async () => {
  const actual = await parseFods("test_data/asset-tracker.fods");
  assert(actual.tables.length === 3);
  assert(actual.tables[1].namedExpressions?.namedRanges.length === 1);
  assert(actual.tables[2].namedExpressions?.namedRanges.length === 1);
  assert(actual.namedExpressions?.namedRanges.length === 2);
});
test("Can convert performance spreadsheet into model representation", async () => {
  const actual = await parseFods("test_data/performance.fods");
  assert(actual.tables.length === 1);
  assert(actual.tables[0].name === "Sheet1");
  assert(actual.tables[0].rows.length === 26);
  assert(actual.namedExpressions?.namedRanges.length === 10);
});
test("Can convert simplified xml asset tracker into model representation", async () => {
  const actual = parseXml(
    (await readFile("test_data/asset-tracker.sfods.xml")).toString(),
  );
  assert(actual.tables.length === 3);
  assert(actual.tables[1].namedExpressions?.namedRanges.length === 1);
  assert(actual.tables[2].namedExpressions?.namedRanges.length === 1);
  assert(actual.namedExpressions?.namedRanges.length === 2);
});
test("Can convert simplified json asset tracker into model representation", async () => {
  const actual = parseJson(
    (await readFile("test_data/asset-tracker.sfods.json")).toString(),
  );
  assert(actual.tables.length === 3);
  assert(actual.tables[1].namedExpressions?.namedRanges.length === 1);
  assert(actual.tables[2].namedExpressions?.namedRanges.length === 1);
  assert(actual.namedExpressions?.namedRanges.length === 2);
});
test("Can convert simplified yaml asset tracker into model representation", async () => {
  const actual = parseYaml(
    (await readFile("test_data/asset-tracker.sfods.yaml")).toString(),
  );
  assert(actual.tables.length === 3);
  assert(actual.tables[1].namedExpressions?.namedRanges.length === 1);
  assert(actual.tables[2].namedExpressions?.namedRanges.length === 1);
  assert(actual.namedExpressions?.namedRanges.length === 2);
});
// --- Repeated cells and rows -------------------------------------------------
test("Repeated empty cells before content do not shift the columns", async () => {
  const actual = await parseFods("test_data/repeated-cells.fods");
  const row = actual.tables[0].rows[0];
  assert.equal(row.cells.length, 4);
  assert.equal(row.cells[2].text, "A");
  assert.equal(row.cells[2].C, 3);
  assert.equal(row.cells[3].text, "B");
  assert.equal(row.cells[3].C, 4);
});
test("A repeated cell carrying data is expanded", async () => {
  const actual = await parseFods("test_data/repeated-cells.fods");
  const row = actual.tables[0].rows[1];
  assert.equal(row.cells.length, 4);
  assert.deepEqual(
    row.cells.map((c) => c.value),
    ["5", "5", "5", undefined],
  );
  assert.equal(row.cells[3].text, "end");
});
test("Repeated rows are expanded", async () => {
  const actual = await parseFods("test_data/repeated-cells.fods");
  assert.equal(actual.tables[0].rows[2].cells[0].text, "twice");
  assert.equal(actual.tables[0].rows[3].cells[0].text, "twice");
  assert.equal(actual.tables[0].rows[2].cells[0].R, 3);
  assert.equal(actual.tables[0].rows[3].cells[0].R, 4);
});
test("Trailing padding is not expanded into a million empty rows", async () => {
  const actual = await parseFods("test_data/repeated-cells.fods");
  // Four rows of content plus the single collapsed padding row.
  assert.equal(actual.tables[0].rows.length, 5);
  assert.equal(actual.tables[0].rows[4].cells.length, 1);
});
// --- Scalar fidelity ---------------------------------------------------------
test("Numeric- and boolean-looking cell text stays a string", () => {
  const actual = parseXml(`<spreadsheet><table name="T"><row>
      <cell type="string"><text>007</text></cell>
      <cell type="string"><text>true</text></cell>
    </row></table></spreadsheet>`);
  assert.equal(actual.tables[0].rows[0].cells[0].text, "007");
  assert.equal(actual.tables[0].rows[0].cells[1].text, "true");
});
test("An unknown cell type is rejected rather than silently carried", () => {
  assert.throws(
    () =>
      parseXml(
        `<spreadsheet><table name="T"><row><cell type="duration"/></row></table></spreadsheet>`,
      ),
    /unknown cell type "duration"/,
  );
});
// --- Named expression shapes that used to crash ------------------------------
test("A single document-level named range parses as a collection", () => {
  const actual = parseXml(`<spreadsheet>
      <table name="T"><row><cell type="string"><text>x</text></cell></row></table>
      <named-expressions>
        <named-range name="A" base-cell-address="$T.$A$1" cell-range-address="$T.$A$1"/>
      </named-expressions>
    </spreadsheet>`);
  assert.equal(actual.namedExpressions?.namedRanges.length, 1);
  assert.equal(actual.namedExpressions?.namedRanges[0].name, "A");
  assert.ok(xmlPrinter(actual).includes('name="A"'));
});
test("An empty named-expressions element parses as an empty collection", () => {
  const actual = parseXml(
    `<spreadsheet><table name="T"><row><cell/></row></table><named-expressions></named-expressions></spreadsheet>`,
  );
  assert.deepEqual(actual.namedExpressions, { namedRanges: [] });
  assert.ok(!xmlPrinter(actual).includes("named-expressions"));
});
test("A hand-written document may omit namedExpressions entirely", () => {
  const actual = parseJson(`{"tables":[{"name":"T","rows":[]}]}`);
  assert.deepEqual(actual.namedExpressions, { namedRanges: [] });
  assert.deepEqual(actual.tables[0].namedExpressions, { namedRanges: [] });
  assert.ok(xmlPrinter(actual).length > 0);
  assert.ok(produceFods(actual).length > 0);
});
// --- Escaping ----------------------------------------------------------------
test("A CDATA terminator in cell text does not break the sfods XML", () => {
  const printed = xmlPrinter(sheet([cell({ type: "string", text: "a]]>b" })]));
  const reparsed = parseXml(printed);
  assert.equal(reparsed.tables[0].rows[0].cells[0].text, "a]]>b");
});
test("A CDATA terminator in cell text does not break the FODS output", () => {
  const fods = produceFods(sheet([cell({ type: "string", text: "a]]>b" })]));
  assert.ok(!fods.includes("a]]>b</text:p>"));
  assert.ok(fods.includes("]]]]><![CDATA[>"));
});
test("HTML output escapes cell text, table names and range names", () => {
  const model = sheet([cell({ type: "string", text: "<script>x</script>" })]);
  model.tables[0].name = "</caption><b>";
  const html = htmlPrinter(model);
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("&lt;/caption&gt;"));
});
test("HTML output renders a zero value rather than a blank cell", () => {
  const html = htmlPrinter(sheet([cell({ type: "float", value: 0 })]));
  assert.ok(html.includes('<td class="numeric">0</td>'));
});
// --- Value fidelity ----------------------------------------------------------
test("Currency codes other than EUR survive the FODS round-trip", () => {
  const fods = produceFods(
    sheet([cell({ type: "currency", value: "12", currency: "USD" })]),
  );
  assert.ok(fods.includes('office:currency="USD"'));
  assert.ok(!fods.includes('office:currency="EUR"'));
  // The generated data style must exist, or the cell references a missing style.
  assert.ok(fods.includes('style:name="CUR_USD"'));
  assert.ok(fods.includes('table:style-name="CUR_USD"'));
});
test("Time values convert both ways", () => {
  assert.equal(timeToDuration("01:02:03"), "PT01H02M03S");
  assert.equal(durationToTime("PT01H02M03S"), "01:02:03");
  assert.equal(durationToTime("PT1H2M3S"), "01:02:03");
  assert.equal(durationToTime("P1DT2H0M0S"), "26:00:00");
  assert.equal(timeToDuration("not a time"), undefined);
});
test("A typed cell with no value does not emit an empty office:value", () => {
  const fods = produceFods(sheet([cell({ type: "float", value: undefined })]));
  assert.ok(!fods.includes('office:value=""'));
  assert.ok(!fods.includes('office:value-type="float"'));
});
test("The displayed text of a typed cell is kept in the FODS output", () => {
  const fods = produceFods(
    sheet([
      cell({
        type: "currency",
        value: "345",
        currency: "EUR",
        text: "345.00 €",
      }),
    ]),
  );
  assert.ok(fods.includes("345.00 €"));
});
test("A boolean cell keeps its value", () => {
  const fods = produceFods(sheet([cell({ type: "boolean", value: "true" })]));
  assert.ok(fods.includes('office:boolean-value="true"'));
  assert.ok(fods.includes('office:value-type="boolean"'));
});
