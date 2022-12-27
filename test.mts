import test from "node:test";
import { strict as assert } from "node:assert";
import { convertFodsToSfods } from "./convert-fods-to-sfods.mjs";

test("conversion creates non-empty string", async () => {
  const actual = await convertFodsToSfods("test_data/expense-tracker.fods");
  assert(actual.length > 0);
});
