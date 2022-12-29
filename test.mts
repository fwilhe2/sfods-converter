import test from "node:test";
import { strict as assert } from "node:assert";
import { convertFodsToSfods } from "./convert-fods-to-sfods.mjs";
import { Spreadsheet } from "./model.mjs";

test("Can convert expenses spreadsheet into model representation", async () => {
  const actual: Spreadsheet = await convertFodsToSfods(
    "test_data/expense-tracker.fods"
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
