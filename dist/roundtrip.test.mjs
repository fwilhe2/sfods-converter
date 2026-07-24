import test from "node:test";
import { strict as assert } from "node:assert";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseFods } from "./convert-fods-to-sfods.mjs";
import { produceFods } from "./convert-sfods-to-fods.mjs";
import { jsonPrinter, xmlPrinter, yamlPrinter } from "./printers.mjs";
import { parseJson, parseXml, parseYaml } from "./parsers.mjs";
import { ensureIsArray } from "./utils.mjs";
// A round-trip is lossless if the *data* survives serialize -> parse. We compare
// a canonical signature of every cell's meaningful content plus the named
// ranges. Row/column indices and string-vs-number coercion are intentionally
// ignored so the test isolates real data loss from harmless representation
// differences. `text` is source data only for string cells; on a typed cell
// (float/currency/date/...) it is a derived rendering, so it is excluded there.
function cellSig(c) {
  const text = c.type === "string" ? c.text : undefined;
  return [c.type, c.value, text, c.formula, c.currency]
    .map((v) => (v === undefined || v === null ? "" : String(v)))
    .join("|");
}
function rangeSig(ranges) {
  return ensureIsArray(ranges)
    .map((n) => `${n.name}=${n.cellRangeAddress}`)
    .join(",");
}
function sheetSig(s) {
  const tables = ensureIsArray(s.tables)
    .map((t) => {
      const rows = ensureIsArray(t.rows)
        .map((r) => ensureIsArray(r.cells).map(cellSig).join(","))
        .join(";");
      return `${t.name}[${rows}]{${rangeSig(t.namedExpressions?.namedRanges)}}`;
    })
    .join("\n");
  return `${tables}\n<<${rangeSig(s.namedExpressions?.namedRanges)}>>`;
}
// Hand-built model exercising the tricky cases: a zero value (falsy), a string
// with XML-significant characters, and a formula containing < & " .
const sample = {
  tables: [
    {
      name: "Sheet1",
      rows: [
        {
          cells: [
            cell({ type: "string", text: "Name & <tag>" }),
            cell({ type: "float", value: 0 }),
            cell({ type: "currency", value: 97, currency: "EUR" }),
            cell({
              type: "percentage",
              value: 0.485,
              formula: 'of:=A1<B1 & "x"',
            }),
            cell({ type: "date", value: "2022-02-02" }),
          ],
        },
      ],
      namedExpressions: undefined,
    },
  ],
  namedExpressions: {
    namedRanges: [
      {
        name: "AMOUNT",
        baseCellAddress: "$Sheet1.$C$1",
        cellRangeAddress: "$Sheet1.$C$1:.$C$1",
      },
    ],
  },
};
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
// --- SFODS serialization round-trips: model -> print -> parse -> model --------
test("SFODS round-trip via JSON is lossless", () => {
  const actual = parseJson(jsonPrinter(sample));
  assert.equal(sheetSig(actual), sheetSig(sample));
});
test("SFODS round-trip via YAML is lossless", () => {
  const actual = parseYaml(yamlPrinter(sample));
  assert.equal(sheetSig(actual), sheetSig(sample));
});
test("SFODS round-trip via XML is lossless", () => {
  const actual = parseXml(xmlPrinter(sample));
  assert.equal(sheetSig(actual), sheetSig(sample));
});
// --- FODS round-trip on the real fixtures: parse -> produce -> parse ----------
const fodsFixtures = [
  "no-named-ranges",
  "accountsSpreadsheet",
  "performance",
  "asset-tracker",
];
for (const name of fodsFixtures) {
  test(`FODS round-trip preserves ${name}`, async () => {
    const model = await parseFods(`test_data/${name}.fods`);
    const out = join(tmpdir(), `sfods-rt-${name}.fods`);
    await writeFile(out, await produceFods(model));
    const reparsed = await parseFods(out);
    assert.equal(sheetSig(reparsed), sheetSig(model));
  });
}
