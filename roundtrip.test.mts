import test from "node:test";
import { strict as assert } from "node:assert";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Cell, NamedRange, Spreadsheet } from "./model.mjs";
import { parseFods } from "./convert-fods-to-sfods.mjs";
import { produceFods } from "./convert-sfods-to-fods.mjs";
import {
  htmlPrinter,
  jsonPrinter,
  xmlPrinter,
  yamlPrinter,
} from "./printers.mjs";
import { parseJson, parseXml, parseYaml } from "./parsers.mjs";
import { ensureIsArray } from "./utils.mjs";

// A round-trip is lossless if the *data* survives serialize -> parse. We compare
// a canonical signature of every cell's meaningful content plus the named
// ranges. String-vs-number coercion is ignored so the test isolates real data
// loss from harmless representation differences; R/C are included so a cell
// that moves column (see the repeated-cell handling) is caught.
function cellSig(c: Cell): string {
  const parts = [c.value, c.text, c.formula];
  // A cell with no value, text or formula is empty whatever type it claims;
  // an empty cell has no type to carry through ODF, so canonicalize.
  if (parts.every((v) => v === undefined || v === null || v === "")) {
    return `empty@${c.R ?? ""},${c.C ?? ""}`;
  }

  return [c.type, ...parts, c.currency, c.R, c.C]
    .map((v) => (v === undefined || v === null ? "" : String(v)))
    .join("|");
}

function rangeSig(ranges: NamedRange[] | undefined): string {
  return ensureIsArray(ranges)
    .map((n: NamedRange) => `${n.name}=${n.cellRangeAddress}`)
    .join(",");
}

function sheetSig(s: Spreadsheet): string {
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

function cell(partial: Partial<Cell>): Cell {
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

// Hand-built model exercising the tricky cases: a zero value (falsy), a string
// with XML-significant characters, a CDATA terminator, a formula containing
// < & " , a non-EUR currency, a time and a boolean.
const sample: Spreadsheet = {
  tables: [
    {
      name: "Sheet1",
      rows: [
        {
          cells: [
            cell({ type: "string", text: "Name & <tag>", R: 1, C: 1 }),
            cell({ type: "float", value: 0, R: 1, C: 2 }),
            cell({
              type: "currency",
              value: 97,
              currency: "EUR",
              text: "97.00 €",
              R: 1,
              C: 3,
            }),
            cell({
              type: "percentage",
              value: 0.485,
              formula: 'of:=A1<B1 & "x"',
              R: 1,
              C: 4,
            }),
            cell({ type: "date", value: "2022-02-02", R: 1, C: 5 }),
            cell({ type: "string", text: "ends with ]]> inside", R: 1, C: 6 }),
            cell({ type: "currency", value: 12, currency: "USD", R: 1, C: 7 }),
            cell({ type: "time", value: "01:02:03", R: 1, C: 8 }),
            cell({ type: "boolean", value: "true", R: 1, C: 9 }),
            cell({ type: "string", text: "007", R: 1, C: 10 }),
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

// A spreadsheet with no named ranges anywhere, and a single-table/single-row
// document — the shapes that used to collapse to non-collections on reparse.
const minimal: Spreadsheet = {
  tables: [
    {
      name: "Only",
      rows: [{ cells: [cell({ type: "string", text: "x", R: 1, C: 1 })] }],
      namedExpressions: undefined,
    },
  ],
  namedExpressions: undefined,
};

// Exactly one document-level named range: the isArray path that was missing.
const oneRange: Spreadsheet = {
  ...minimal,
  namedExpressions: {
    namedRanges: [
      {
        name: "ONE",
        baseCellAddress: "$Only.$A$1",
        cellRangeAddress: "$Only.$A$1",
      },
    ],
  },
};

// --- SFODS serialization round-trips: model -> print -> parse -> model --------

const sfodsCases: [string, Spreadsheet][] = [
  ["the full sample", sample],
  ["a document with no named ranges", minimal],
  ["a document with a single named range", oneRange],
];

for (const [label, input] of sfodsCases) {
  test(`SFODS round-trip via JSON is lossless for ${label}`, () => {
    assert.equal(sheetSig(parseJson(jsonPrinter(input))), sheetSig(input));
  });

  test(`SFODS round-trip via YAML is lossless for ${label}`, () => {
    assert.equal(sheetSig(parseYaml(yamlPrinter(input))), sheetSig(input));
  });

  test(`SFODS round-trip via XML is lossless for ${label}`, () => {
    assert.equal(sheetSig(parseXml(xmlPrinter(input))), sheetSig(input));
  });

  test(`SFODS XML survives a second round-trip for ${label}`, () => {
    const once = parseXml(xmlPrinter(input));
    assert.equal(sheetSig(parseXml(xmlPrinter(once))), sheetSig(once));
  });

  test(`FODS round-trip is lossless for ${label}`, async () => {
    const out = join(
      tmpdir(),
      `sfods-rt-model-${label.replace(/\W+/g, "-")}.fods`,
    );
    await writeFile(out, produceFods(input));
    assert.equal(sheetSig(await parseFods(out)), sheetSig(input));
  });
}

// --- FODS round-trip on the real fixtures: parse -> produce -> parse ----------

const fodsFixtures = [
  "no-named-ranges",
  "accountsSpreadsheet",
  "performance",
  "asset-tracker",
  "repeated-cells",
];

for (const name of fodsFixtures) {
  test(`FODS round-trip preserves ${name}`, async () => {
    const model = await parseFods(`test_data/${name}.fods`);
    const out = join(tmpdir(), `sfods-rt-${name}.fods`);
    await writeFile(out, produceFods(model));
    const reparsed = await parseFods(out);
    assert.equal(sheetSig(reparsed), sheetSig(model));
  });

  test(`every printer renders ${name}`, async () => {
    const model = await parseFods(`test_data/${name}.fods`);
    for (const print of [jsonPrinter, xmlPrinter, yamlPrinter, htmlPrinter]) {
      assert.ok(print(model).length > 0);
    }
  });
}
