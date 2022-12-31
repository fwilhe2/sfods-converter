import test from "node:test";
import { strict as assert } from "node:assert";
import { parseFods } from "./convert-fods-to-sfods.mjs";
import { Spreadsheet } from "./model.mjs";
import { produceFods } from "./convert-sfods-to-fods.mjs";
import { readFile } from "node:fs/promises";
import { parseJson, parseXml, parseYaml } from "./parsers.mjs";

test("Can convert accounts spreadsheet into model representation", async () => {
  const actual: Spreadsheet = await parseFods(
    "test_data/accountsSpreadsheet.fods"
  );
  assert(actual.tables.length === 1);
  assert(actual.tables[0].name === "Sheet1");
  assert(actual.tables[0].rows.length === 6);
  assert(actual.namedExpressions.namedRanges.length === 6);
});

test("Can convert expenses spreadsheet into model representation", async () => {
  const actual: Spreadsheet = await parseFods("test_data/expense-tracker.fods");
  assert(actual.tables.length === 2);
  assert(actual.tables[0].name === "Expenses");
  assert(actual.tables[0].rows.length === 4);
  assert(actual.tables[0].rows[1].cells[2].type === "currency");
  assert(actual.tables[0].rows[1].cells[2].value === "97");
  assert(
    actual.tables[0].rows[1].cells[3].formula === "of:=AMOUNT/YEARLY_BUDGET"
  );
  assert(actual.tables[1].name === "Values");
  assert(actual.tables[1].rows.length === 1);

  assert(actual.namedExpressions.namedRanges.length === 2);
});

test("Can convert performance spreadsheet into model representation", async () => {
  const actual: Spreadsheet = await parseFods("test_data/performance.fods");
  assert(actual.tables.length === 1);
  assert(actual.tables[0].name === "Sheet1");
  assert(actual.tables[0].rows.length === 26);
  assert(actual.namedExpressions.namedRanges.length === 10);
});

test("Can convert simplfied xml expense tracker into model representation", async () => {
  const actual: Spreadsheet = parseXml(
    (await readFile("test_data/expense-tracker.sfods.xml")).toString()
  );
  assert(actual.tables.length === 2);
  assert(actual.tables[0].name === "Expenses");
  assert(actual.tables[0].rows.length === 4);
  assert(actual.tables[0].rows[1].cells[2].type === "currency");
  assert(actual.tables[0].rows[1].cells[2].value === "97");
  assert(
    actual.tables[0].rows[1].cells[3].formula === "of:=AMOUNT/YEARLY_BUDGET"
  );
  assert(actual.tables[1].name === "Values");
  assert(actual.tables[1].rows.length === 1);

  assert(actual.namedExpressions.namedRanges.length === 2);
});

test("Can convert simplfied json expense tracker into model representation", async () => {
  const actual: Spreadsheet = parseJson(
    (await readFile("test_data/expense-tracker.sfods.json")).toString()
  );
  assert(actual.tables.length === 2);
  assert(actual.tables[0].name === "Expenses");
  assert(actual.tables[0].rows.length === 4);
  assert(actual.tables[0].rows[1].cells[2].type === "currency");
  assert(actual.tables[0].rows[1].cells[2].value === "97");
  assert(
    actual.tables[0].rows[1].cells[3].formula === "of:=AMOUNT/YEARLY_BUDGET"
  );
  assert(actual.tables[1].name === "Values");
  assert(actual.tables[1].rows.length === 1);

  assert(actual.namedExpressions.namedRanges.length === 2);
});

test("Can convert simplfied yaml expense tracker into model representation", async () => {
  const actual: Spreadsheet = parseYaml(
    (await readFile("test_data/expense-tracker.sfods.yaml")).toString()
  );
  assert(actual.tables.length === 2);
  assert(actual.tables[0].name === "Expenses");
  assert(actual.tables[0].rows.length === 4);
  assert(actual.tables[0].rows[1].cells[2].type === "currency");
  assert(actual.tables[0].rows[1].cells[2].value === "97");
  assert(
    actual.tables[0].rows[1].cells[3].formula === "of:=AMOUNT/YEARLY_BUDGET"
  );
  assert(actual.tables[1].name === "Values");
  assert(actual.tables[1].rows.length === 1);

  assert(actual.namedExpressions.namedRanges.length === 2);
});

test("Can convert simplfied xml expense tracker into fods", async () => {
  const actual: string = await produceFods(
    parseXml((await readFile("test_data/expense-tracker.sfods.xml")).toString())
  );
  assert(actual.length > 100);
});
